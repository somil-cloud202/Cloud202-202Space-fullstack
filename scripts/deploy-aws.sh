#!/bin/bash

# AWS Deployment Script for MyPortal
# This script builds, tags, and deploys the application to AWS ECS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-myportal}"
ENVIRONMENT="${ENVIRONMENT:-production}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Derived values
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
SERVICE_NAME="${PROJECT_NAME}-app"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AWS ECS Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Configuration:"
echo "  Region: $AWS_REGION"
echo "  Project: $PROJECT_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Image Tag: $IMAGE_TAG"
echo "  Cluster: $CLUSTER_NAME"
echo "  Service: $SERVICE_NAME"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Get AWS account ID
echo -e "${YELLOW}Getting AWS account ID...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Error: Could not get AWS account ID${NC}"
    echo "Please ensure your AWS credentials are configured correctly"
    exit 1
fi
echo -e "${GREEN}✓ AWS Account ID: $AWS_ACCOUNT_ID${NC}"

# ECR repository URL
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENVIRONMENT}"

# Step 1: Authenticate with ECR
echo ""
echo -e "${YELLOW}Step 1: Authenticating with ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully authenticated with ECR${NC}"
else
    echo -e "${RED}Error: Failed to authenticate with ECR${NC}"
    exit 1
fi

# Step 2: Build Docker image
echo ""
echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
docker build -f docker/Dockerfile.production -t ${PROJECT_NAME}:${IMAGE_TAG} .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully built Docker image${NC}"
else
    echo -e "${RED}Error: Failed to build Docker image${NC}"
    exit 1
fi

# Step 3: Tag image for ECR
echo ""
echo -e "${YELLOW}Step 3: Tagging image for ECR...${NC}"
docker tag ${PROJECT_NAME}:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}
docker tag ${PROJECT_NAME}:${IMAGE_TAG} ${ECR_REPO}:$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✓ Successfully tagged image${NC}"

# Step 4: Push image to ECR
echo ""
echo -e "${YELLOW}Step 4: Pushing image to ECR...${NC}"
docker push ${ECR_REPO}:${IMAGE_TAG}
docker push ${ECR_REPO}:$(date +%Y%m%d-%H%M%S)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully pushed image to ECR${NC}"
else
    echo -e "${RED}Error: Failed to push image to ECR${NC}"
    exit 1
fi

# Step 5: Update ECS service
echo ""
echo -e "${YELLOW}Step 5: Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION \
    --output json > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully triggered ECS service update${NC}"
else
    echo -e "${RED}Error: Failed to update ECS service${NC}"
    exit 1
fi

# Step 6: Wait for deployment (optional)
echo ""
echo -e "${YELLOW}Step 6: Waiting for deployment to complete...${NC}"
echo "This may take several minutes..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $AWS_REGION
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment completed successfully${NC}"
else
    echo -e "${YELLOW}⚠ Deployment is taking longer than expected${NC}"
    echo "Check the ECS console for deployment status"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Image pushed to: ${ECR_REPO}:${IMAGE_TAG}"
echo "ECS Cluster: $CLUSTER_NAME"
echo "ECS Service: $SERVICE_NAME"
echo ""
echo "To view logs:"
echo "  aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT} --follow --region $AWS_REGION"
echo ""
echo "To check service status:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
echo ""
