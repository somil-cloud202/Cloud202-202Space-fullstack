# Production Deployment Guide

This guide will help you deploy the MyPortal application to a production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Initial Setup](#initial-setup)
4. [Deployment Steps](#deployment-steps)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Scaling](#scaling)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## Prerequisites

- A Linux server (Ubuntu 20.04+ or Debian 11+ recommended)
- Docker Engine 20.10+ and Docker Compose 2.0+
- At least 4GB RAM and 20GB disk space
- A domain name pointing to your server
- SSL/TLS certificates (Let's Encrypt recommended)
- OpenAI API key for AI features

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] A server with Docker and Docker Compose installed
- [ ] A domain name configured with DNS pointing to your server
- [ ] SSL/TLS certificates ready (or Let's Encrypt configured)
- [ ] Generated strong passwords and secrets
- [ ] OpenAI API key
- [ ] Backup strategy planned
- [ ] Monitoring solution ready (optional but recommended)

## Initial Setup

### 1. Clone the Repository

```bash
# On your production server
git clone <your-repository-url>
cd <repository-directory>
```

### 2. Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production.example .env

# Edit the .env file with secure values
nano .env
```

**CRITICAL**: You MUST change the following values:

- `ADMIN_PASSWORD`: Generate with `openssl rand -base64 32`
- `JWT_SECRET`: Generate with `openssl rand -base64 64`
- `DB_PASSWORD`: Generate with `openssl rand -base64 32`
- `MINIO_ROOT_PASSWORD`: Generate with `openssl rand -base64 32`
- `BASE_URL`: Set to your actual domain (e.g., `https://portal.yourcompany.com`)
- `OPENAI_API_KEY`: Your OpenAI API key

Example secure generation:

```bash
# Generate secure passwords
echo "ADMIN_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "DB_PASSWORD=$(openssl rand -base64 32)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)"
```

### 3. Secure the .env File

```bash
# Set restrictive permissions
chmod 600 .env

# Ensure it's not tracked by git
echo ".env" >> .gitignore
```

## Deployment Steps

### 1. Build the Production Image

```bash
# Build the production Docker image
docker compose -f docker/compose.production.yaml build
```

### 2. Start the Services

```bash
# Start all services in detached mode
docker compose -f docker/compose.production.yaml up -d
```

### 3. Verify Services are Running

```bash
# Check service status
docker compose -f docker/compose.production.yaml ps

# Check logs
docker compose -f docker/compose.production.yaml logs -f app
```

### 4. Run Database Migrations

Database migrations are automatically run when the app container starts. Verify they completed successfully:

```bash
docker compose -f docker/compose.production.yaml logs app | grep "prisma"
```

### 5. Verify Application Health

```bash
# Check if the application is responding
curl http://localhost/health

# Check app health
docker compose -f docker/compose.production.yaml exec app node -e "console.log('App is running')"
```

## SSL/TLS Configuration

For production, you MUST use HTTPS. Here are two recommended approaches:

### Option 1: Using Let's Encrypt with Certbot

1. Install Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

2. Stop nginx temporarily:

```bash
docker compose -f docker/compose.production.yaml stop nginx
```

3. Obtain certificates:

```bash
sudo certbot certonly --standalone -d your-domain.com
```

4. Update nginx configuration to use SSL (create `docker/nginx/conf.d/production-ssl.conf`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of your nginx config
}
```

5. Mount certificates in docker-compose:

```yaml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
    - ./nginx/conf.d/production-ssl.conf:/etc/nginx/conf.d/default.conf:ro
```

### Option 2: Using a Reverse Proxy (Recommended for Production)

Use a reverse proxy like:
- **Nginx Proxy Manager**: Easy GUI for managing SSL
- **Traefik**: Automatic SSL with Let's Encrypt
- **Cloudflare**: SSL termination at edge + DDoS protection

## Monitoring & Logging

### Application Logs

```bash
# View all logs
docker compose -f docker/compose.production.yaml logs -f

# View specific service logs
docker compose -f docker/compose.production.yaml logs -f app
docker compose -f docker/compose.production.yaml logs -f postgres
docker compose -f docker/compose.production.yaml logs -f nginx
```

### Recommended Monitoring Tools

1. **Container Monitoring**: 
   - Portainer (Docker GUI)
   - cAdvisor + Prometheus + Grafana

2. **Application Monitoring**:
   - Sentry for error tracking
   - LogRocket for session replay
   - DataDog or New Relic for APM

3. **Infrastructure Monitoring**:
   - Uptime monitoring (UptimeRobot, Pingdom)
   - Server monitoring (Netdata, Prometheus)

### Set Up Log Rotation

Create `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

## Backup & Recovery

### Database Backups

Create a backup script (`scripts/backup-db.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose -f docker/compose.production.yaml exec -T postgres \
  pg_dump -U postgres app > "$BACKUP_DIR/backup_$DATE.sql"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Set up a cron job:

```bash
# Run daily at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh
```

### MinIO Backups

```bash
# Backup MinIO data
docker compose -f docker/compose.production.yaml exec -T minio \
  mc mirror /data /backup/minio
```

### Full System Backup

Consider using tools like:
- **Restic**: Encrypted, deduplicated backups
- **Borg**: Deduplicated backups
- **rsync**: Simple file synchronization

## Scaling

### Vertical Scaling (Single Server)

1. **Increase Resources**: Add more CPU/RAM to your server
2. **Optimize Database**: 
   - Add indexes
   - Tune PostgreSQL settings
   - Enable connection pooling

### Horizontal Scaling (Multiple Servers)

1. **Load Balancer**: Use nginx, HAProxy, or cloud load balancer
2. **Multiple App Instances**: 
   ```yaml
   app:
     deploy:
       replicas: 3
   ```
3. **External Database**: Use managed PostgreSQL (AWS RDS, Azure Database)
4. **External Object Storage**: Use AWS S3 instead of MinIO
5. **Redis Cluster**: For session management across instances

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker compose -f docker/compose.production.yaml logs app

# Check if database is ready
docker compose -f docker/compose.production.yaml exec postgres pg_isready

# Verify environment variables
docker compose -f docker/compose.production.yaml exec app env | grep -E 'DATABASE_URL|JWT_SECRET'
```

### Database Connection Issues

```bash
# Test database connection
docker compose -f docker/compose.production.yaml exec app \
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('Connected')).catch(console.error)"
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart services if needed
docker compose -f docker/compose.production.yaml restart app
```

### SSL Certificate Issues

```bash
# Verify certificate
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -dates

# Renew certificate
sudo certbot renew
```

## Maintenance

### Updating the Application

```bash
# 1. Pull latest code
git pull origin main

# 2. Backup database first!
./scripts/backup-db.sh

# 3. Rebuild and restart
docker compose -f docker/compose.production.yaml build
docker compose -f docker/compose.production.yaml up -d

# 4. Run migrations (automatic on restart)
docker compose -f docker/compose.production.yaml logs app | grep "prisma"
```

### Database Maintenance

```bash
# Vacuum and analyze database
docker compose -f docker/compose.production.yaml exec postgres \
  psql -U postgres -d app -c "VACUUM ANALYZE;"

# Check database size
docker compose -f docker/compose.production.yaml exec postgres \
  psql -U postgres -d app -c "SELECT pg_size_pretty(pg_database_size('app'));"
```

### Rotating Secrets

1. Generate new secrets
2. Update `.env` file
3. Restart services:
   ```bash
   docker compose -f docker/compose.production.yaml restart
   ```

### Cleaning Up Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (BE CAREFUL!)
docker volume prune

# Remove unused networks
docker network prune
```

## Security Best Practices

1. **Firewall Configuration**:
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

2. **Regular Updates**:
   ```bash
   # Update system packages
   sudo apt-get update && sudo apt-get upgrade
   
   # Update Docker images
   docker compose -f docker/compose.production.yaml pull
   ```

3. **Access Control**:
   - Use SSH keys instead of passwords
   - Implement fail2ban for SSH protection
   - Use VPN for administrative access
   - Regularly audit user access

4. **Monitoring & Alerts**:
   - Set up alerts for high CPU/memory usage
   - Monitor failed login attempts
   - Track unusual database queries
   - Monitor SSL certificate expiration

## Support & Resources

- **Application Logs**: Check Docker logs for errors
- **Database Issues**: Review PostgreSQL logs
- **Performance**: Use Docker stats and application profiling
- **Security**: Regularly run security audits with tools like `docker scan`

---

**Remember**: Always test updates in a staging environment before deploying to production!
