#!/bin/bash

# ECS Fargate Deployment Script
# This will deploy your app to ECS Fargate with ALB

set -e

echo "🚀 Starting ECS Fargate deployment..."

# Variables
PROJECT_NAME="myportal"
AWS_REGION="eu-west-2"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"
TASK_FAMILY="${PROJECT_NAME}-task"
ECR_REPO="${PROJECT_NAME}"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

echo "📦 Step 1: Creating ECR repository..."
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION || echo "Repository already exists"

echo "🔐 Step 2: Getting ECR login..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "🏗️ Step 3: Building Docker image..."
docker build -f docker/Dockerfile.production -t $PROJECT_NAME:latest .

echo "🏷️ Step 4: Tagging image..."
docker tag $PROJECT_NAME:latest $ECR_URI:latest

echo "📤 Step 5: Pushing to ECR..."
docker push $ECR_URI:latest

echo "🎯 Step 6: Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION || echo "Cluster already exists"

echo "✅ Docker image pushed to: $ECR_URI:latest"
echo ""
echo "🎯 Next steps:"
echo "1. Go to ECS Console: https://eu-west-2.console.aws.amazon.com/ecs/"
echo "2. Create a new Task Definition with the image: $ECR_URI:latest"
echo "3. Create a new Service using Fargate"
echo "4. Configure ALB for public access"
echo ""
echo "Or run the manual ECS setup commands..."
