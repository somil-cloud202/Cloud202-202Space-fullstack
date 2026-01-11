#!/bin/bash

# Quick AWS App Runner Deployment Script
# Run this script to deploy your app in ~10 minutes

set -e

echo "🚀 Starting AWS App Runner deployment..."

# Variables - CHANGE THESE
PROJECT_NAME="myportal"
AWS_REGION="us-east-1"
DB_PASSWORD="ChangeMe123!"
ADMIN_PASSWORD="AdminPass123!"
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long"
OPENAI_API_KEY="sk-proj-your-openai-key-here"

echo "📦 Step 1: Creating RDS Database..."

# Create RDS instance
DB_IDENTIFIER="${PROJECT_NAME}-db"
aws rds create-db-instance \
  --db-instance-identifier $DB_IDENTIFIER \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 20 \
  --db-name $PROJECT_NAME \
  --publicly-accessible \
  --no-multi-az \
  --storage-type gp2 \
  --region $AWS_REGION

echo "⏳ Waiting for database to be available (this takes ~5 minutes)..."
aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_IDENTIFIER \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✅ Database created at: $DB_ENDPOINT"

# Create DATABASE_URL
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${PROJECT_NAME}"

echo "🏗️ Step 2: Creating App Runner service..."

# Create apprunner.yaml with correct values
cat > apprunner.yaml << EOF
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "Build started on \`date\`"
      - docker build -f docker/Dockerfile.production -t myportal .
run:
  runtime-version: latest
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
    - name: PORT
      value: "3000"
    - name: DATABASE_URL
      value: "$DATABASE_URL"
    - name: ADMIN_PASSWORD
      value: "$ADMIN_PASSWORD"
    - name: JWT_SECRET
      value: "$JWT_SECRET"
    - name: OPENAI_API_KEY
      value: "$OPENAI_API_KEY"
EOF

echo "📝 App Runner configuration created!"
echo ""
echo "🎯 Next steps:"
echo "1. Go to AWS App Runner Console: https://console.aws.amazon.com/apprunner/"
echo "2. Click 'Create service'"
echo "3. Choose 'Source code repository'"
echo "4. Connect your GitHub repo: https://github.com/Cloud202-ltd/Cloud202-202Space-fullstack.git"
echo "5. Use the apprunner.yaml file that was just created"
echo "6. Deploy!"
echo ""
echo "📊 Your database details:"
echo "Endpoint: $DB_ENDPOINT"
echo "Database: $PROJECT_NAME"
echo "Username: postgres"
echo "Password: $DB_PASSWORD"
echo ""
echo "🔗 Your app will be available at a URL like: https://abc123.us-east-1.awsapprunner.com"
echo ""
echo "💰 Estimated monthly cost: ~$25-50"
