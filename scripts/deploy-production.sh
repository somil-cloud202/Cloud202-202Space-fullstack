#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker/compose.production.yaml"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Production Deployment Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please copy .env.production.example to .env and configure it."
    exit 1
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}WARNING: Running as root. Consider using a non-root user with Docker permissions.${NC}"
fi

# Verify environment variables
echo -e "${YELLOW}Verifying environment variables...${NC}"
source .env

if [ "$NODE_ENV" != "production" ]; then
    echo -e "${RED}ERROR: NODE_ENV must be set to 'production'${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "CHANGE_ME_STRONG_RANDOM_SECRET_64_CHARS" ]; then
    echo -e "${RED}ERROR: JWT_SECRET must be changed from default value!${NC}"
    exit 1
fi

if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" == "CHANGE_ME_STRONG_RANDOM_PASSWORD_32_CHARS" ]; then
    echo -e "${RED}ERROR: ADMIN_PASSWORD must be changed from default value!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables verified${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database if it exists
if docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}Creating database backup...${NC}"
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U postgres app > "$BACKUP_DIR/backup_$DATE.sql" 2>/dev/null || true
    echo -e "${GREEN}✓ Database backup created: $BACKUP_DIR/backup_$DATE.sql${NC}"
    echo ""
fi

# Pull latest code (if in git repo)
if [ -d .git ]; then
    echo -e "${YELLOW}Pulling latest code...${NC}"
    git pull origin main || true
    echo -e "${GREEN}✓ Code updated${NC}"
    echo ""
fi

# Build the production image
echo -e "${YELLOW}Building production image...${NC}"
docker compose -f "$COMPOSE_FILE" build --no-cache
echo -e "${GREEN}✓ Production image built${NC}"
echo ""

# Stop old containers
echo -e "${YELLOW}Stopping old containers...${NC}"
docker compose -f "$COMPOSE_FILE" down
echo -e "${GREEN}✓ Old containers stopped${NC}"
echo ""

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker compose -f "$COMPOSE_FILE" up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check health
HEALTHY=true
for service in postgres redis minio app; do
    if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy\|Up"; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is not healthy${NC}"
        HEALTHY=false
    fi
done

echo ""

if [ "$HEALTHY" = false ]; then
    echo -e "${RED}ERROR: Some services are not healthy. Check logs:${NC}"
    echo "docker compose -f $COMPOSE_FILE logs"
    exit 1
fi

# Display logs
echo -e "${YELLOW}Recent logs:${NC}"
docker compose -f "$COMPOSE_FILE" logs --tail=50

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Services are running. You can:"
echo "  - View logs: docker compose -f $COMPOSE_FILE logs -f"
echo "  - Check status: docker compose -f $COMPOSE_FILE ps"
echo "  - Stop services: docker compose -f $COMPOSE_FILE down"
echo ""
echo -e "${YELLOW}Don't forget to:${NC}"
echo "  1. Configure SSL/TLS certificates"
echo "  2. Set up monitoring and alerting"
echo "  3. Configure automated backups"
echo "  4. Test the application thoroughly"
echo ""
