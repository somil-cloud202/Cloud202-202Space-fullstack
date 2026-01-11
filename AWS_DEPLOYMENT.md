# AWS Deployment Guide

This guide provides comprehensive instructions for deploying the MyPortal application to AWS using native services.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Services Used](#aws-services-used)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Step-by-Step Deployment](#step-by-step-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling](#scaling)
10. [Cost Optimization](#cost-optimization)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

## Architecture Overview

### AWS Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Route 53 (DNS)     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  CloudFront (CDN)    │
              │  + SSL/TLS           │
              └──────────┬───────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Application Load Balancer    │
         │  (ALB) - Public Subnet        │
         └───────────┬───────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────┐
    │     ECS Fargate Service            │
    │  (Auto-scaling, Private Subnet)    │
    │                                    │
    │  ┌──────────────────────────┐     │
    │  │   App Container          │     │
    │  │   (Node.js + Prisma)     │     │
    │  └──────────────────────────┘     │
    └────────┬───────────┬───────────────┘
             │           │
             │           └──────────────────┐
             │                              │
             ▼                              ▼
    ┌────────────────┐           ┌──────────────────┐
    │  RDS PostgreSQL│           │ ElastiCache Redis│
    │  (Private)     │           │  (Private)       │
    └────────────────┘           └──────────────────┘
             │
             │
             ▼
    ┌────────────────────────────┐
    │      Amazon S3             │
    │  (Object Storage)          │
    │  - profile-photos          │
    │  - documents               │
    │  - payslips                │
    │  - leave-attachments       │
    └────────────────────────────┘
```

### Service Mapping from Docker Compose

| Docker Compose Service | AWS Service | Notes |
|------------------------|-------------|-------|
| `postgres` | Amazon RDS (PostgreSQL) | Managed database with automated backups |
| `redis` | Amazon ElastiCache (Redis) | Managed Redis cluster |
| `minio` | Amazon S3 + CloudFront | Object storage with CDN |
| `app` | Amazon ECS Fargate | Containerized application, serverless |
| `nginx` | Application Load Balancer | Layer 7 load balancing, SSL termination |

## Prerequisites

### Required AWS Resources

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally (for building images)
- Terraform installed (version 1.0+) OR AWS Console access
- Domain name (for Route 53 and SSL certificates)
- AWS Certificate Manager SSL certificate (or ability to create one)

### Required AWS Permissions

Your IAM user/role needs permissions for:
- ECS (Fargate, Task Definitions, Services, Clusters)
- ECR (Elastic Container Registry)
- RDS (Database instances)
- ElastiCache (Redis clusters)
- S3 (Bucket creation and management)
- VPC (Subnets, Security Groups, Route Tables)
- ALB (Application Load Balancer, Target Groups)
- CloudFront (Distributions)
- Route 53 (Hosted Zones, Record Sets)
- IAM (Role creation for ECS tasks)
- CloudWatch (Logs, Metrics)
- Secrets Manager (Secret storage and retrieval)
- Certificate Manager (SSL certificates)

### Cost Estimate (Monthly)

Approximate costs for a production deployment:

- **ECS Fargate** (2 tasks, 0.5 vCPU, 1GB RAM): ~$30
- **RDS PostgreSQL** (db.t3.small): ~$30
- **ElastiCache Redis** (cache.t3.micro): ~$15
- **Application Load Balancer**: ~$20
- **S3 Storage** (50GB): ~$1.15
- **CloudFront** (1TB transfer): ~$85
- **Data Transfer**: ~$20
- **CloudWatch Logs**: ~$5

**Total: ~$206/month** (varies based on usage)

## AWS Services Used

### 1. Amazon ECS (Elastic Container Service)
- **Purpose**: Run containerized application
- **Configuration**: Fargate launch type (serverless)
- **Features**: Auto-scaling, health checks, rolling deployments

### 2. Amazon RDS (Relational Database Service)
- **Purpose**: PostgreSQL database
- **Configuration**: Single-AZ or Multi-AZ for production
- **Features**: Automated backups, point-in-time recovery, automated patching

### 3. Amazon ElastiCache
- **Purpose**: Redis cache for sessions and caching
- **Configuration**: Single node or cluster mode
- **Features**: Automatic failover, backup and restore

### 4. Amazon S3
- **Purpose**: Object storage for files
- **Buckets**: profile-photos, documents, payslips, leave-attachments
- **Features**: Versioning, lifecycle policies, encryption at rest

### 5. Amazon CloudFront
- **Purpose**: CDN for S3 content and application
- **Features**: Edge caching, SSL/TLS, DDoS protection

### 6. Application Load Balancer (ALB)
- **Purpose**: HTTP/HTTPS load balancing
- **Features**: SSL termination, health checks, path-based routing

### 7. AWS Secrets Manager
- **Purpose**: Store sensitive configuration
- **Secrets**: Database passwords, JWT secrets, API keys

### 8. Amazon CloudWatch
- **Purpose**: Monitoring and logging
- **Features**: Logs, metrics, alarms, dashboards

## Pre-Deployment Checklist

- [ ] AWS account created and configured
- [ ] AWS CLI installed and configured with credentials
- [ ] Domain name available and DNS configured
- [ ] SSL certificate created in AWS Certificate Manager
- [ ] Terraform installed (if using Infrastructure as Code)
- [ ] Docker installed for building images
- [ ] Strong passwords and secrets generated
- [ ] OpenAI API key obtained
- [ ] Budget alerts configured in AWS
- [ ] Backup strategy planned

## Step-by-Step Deployment

### Option 1: Using Terraform (Recommended)

#### Step 1: Configure Terraform Variables

```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
# Project Configuration
project_name = "myportal"
environment  = "production"
aws_region   = "us-east-1"

# Domain Configuration
domain_name          = "portal.yourcompany.com"
certificate_arn      = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"
route53_zone_id      = "Z1234567890ABC"

# Database Configuration
db_instance_class    = "db.t3.small"
db_allocated_storage = 20
db_name              = "myportal"
db_username          = "postgres"

# Redis Configuration
redis_node_type      = "cache.t3.micro"

# ECS Configuration
ecs_task_cpu         = "512"  # 0.5 vCPU
ecs_task_memory      = "1024" # 1 GB
ecs_desired_count    = 2      # Number of tasks

# Application Configuration
app_image_tag        = "latest"

# Secrets (will be stored in AWS Secrets Manager)
admin_password       = "GENERATE_STRONG_PASSWORD"
jwt_secret           = "GENERATE_STRONG_SECRET"
openai_api_key       = "sk-proj-YOUR_KEY"
```

#### Step 2: Initialize Terraform

```bash
cd terraform/aws
terraform init
```

#### Step 3: Review the Plan

```bash
terraform plan
```

Review the resources that will be created.

#### Step 4: Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted. This will create all AWS resources (takes ~15-20 minutes).

#### Step 5: Build and Push Docker Image

```bash
# Get ECR login credentials
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -f docker/Dockerfile.production -t myportal:latest .

# Tag for ECR
docker tag myportal:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myportal:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myportal:latest
```

#### Step 6: Deploy to ECS

```bash
# Update ECS service to use new image
aws ecs update-service \
  --cluster myportal-production \
  --service myportal-app \
  --force-new-deployment \
  --region us-east-1
```

#### Step 7: Verify Deployment

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster myportal-production \
  --services myportal-app \
  --region us-east-1

# Check task status
aws ecs list-tasks \
  --cluster myportal-production \
  --service-name myportal-app \
  --region us-east-1

# View logs
aws logs tail /ecs/myportal-production --follow
```

### Option 2: Manual Setup via AWS Console

<details>
<summary>Click to expand manual setup instructions</summary>

#### Step 1: Create VPC and Networking

1. Go to **VPC Console**
2. Create VPC with:
   - CIDR: 10.0.0.0/16
   - 2 Public Subnets (10.0.1.0/24, 10.0.2.0/24)
   - 2 Private Subnets (10.0.3.0/24, 10.0.4.0/24)
   - Internet Gateway
   - NAT Gateway (in public subnet)
3. Configure route tables

#### Step 2: Create Security Groups

**ALB Security Group:**
- Inbound: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0
- Outbound: All traffic

**ECS Security Group:**
- Inbound: 3000 from ALB Security Group
- Outbound: All traffic

**RDS Security Group:**
- Inbound: 5432 from ECS Security Group
- Outbound: All traffic

**Redis Security Group:**
- Inbound: 6379 from ECS Security Group
- Outbound: All traffic

#### Step 3: Create RDS Database

1. Go to **RDS Console**
2. Create PostgreSQL database:
   - Engine: PostgreSQL 16
   - Template: Production
   - Instance: db.t3.small
   - Storage: 20 GB (enable auto-scaling)
   - Multi-AZ: Yes (for production)
   - VPC: Select your VPC
   - Subnet group: Private subnets
   - Security group: RDS Security Group
   - Database name: myportal
   - Master username: postgres
   - Master password: (generate strong password)
3. Note the endpoint URL

#### Step 4: Create ElastiCache Redis

1. Go to **ElastiCache Console**
2. Create Redis cluster:
   - Engine: Redis 7.x
   - Node type: cache.t3.micro
   - Number of replicas: 1 (for production)
   - Subnet group: Private subnets
   - Security group: Redis Security Group
3. Note the endpoint URL

#### Step 5: Create S3 Buckets

1. Go to **S3 Console**
2. Create buckets:
   - `myportal-profile-photos-prod`
   - `myportal-documents-prod`
   - `myportal-payslips-prod`
   - `myportal-leave-attachments-prod`
3. Configure bucket policies:
   - Enable versioning
   - Enable encryption (AES-256)
   - For profile-photos: Enable public read access

#### Step 6: Create CloudFront Distribution

1. Go to **CloudFront Console**
2. Create distribution:
   - Origin: S3 bucket (profile-photos)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Cache policy: CachingOptimized
   - SSL certificate: Use ACM certificate
3. Note the CloudFront domain name

#### Step 7: Create Secrets in Secrets Manager

1. Go to **Secrets Manager Console**
2. Create secrets:
   - `myportal/prod/db-password`
   - `myportal/prod/admin-password`
   - `myportal/prod/jwt-secret`
   - `myportal/prod/openai-api-key`

#### Step 8: Create IAM Roles

**ECS Task Execution Role:**
- Trust policy: ECS Tasks
- Policies:
  - AmazonECSTaskExecutionRolePolicy
  - Custom policy for Secrets Manager access

**ECS Task Role:**
- Trust policy: ECS Tasks
- Policies:
  - Custom policy for S3 access
  - Custom policy for CloudWatch Logs

#### Step 9: Create ECR Repository

1. Go to **ECR Console**
2. Create repository: `myportal`
3. Push Docker image (see Step 5 in Terraform section)

#### Step 10: Create ECS Cluster

1. Go to **ECS Console**
2. Create cluster:
   - Name: myportal-production
   - Infrastructure: AWS Fargate

#### Step 11: Create Task Definition

1. In ECS Console, create task definition:
   - Launch type: Fargate
   - Task CPU: 0.5 vCPU
   - Task memory: 1 GB
   - Task role: ECS Task Role
   - Task execution role: ECS Task Execution Role
2. Add container:
   - Name: app
   - Image: ECR image URI
   - Port mappings: 3000
   - Environment variables: (see Environment Configuration section)
   - Secrets: (reference from Secrets Manager)
   - Log configuration: CloudWatch Logs

#### Step 12: Create Application Load Balancer

1. Go to **EC2 Console** > Load Balancers
2. Create ALB:
   - Name: myportal-alb
   - Scheme: Internet-facing
   - IP address type: IPv4
   - VPC: Your VPC
   - Subnets: Public subnets
   - Security group: ALB Security Group
3. Create target group:
   - Target type: IP
   - Protocol: HTTP
   - Port: 3000
   - VPC: Your VPC
   - Health check path: /trpc/health
4. Configure listener:
   - Protocol: HTTPS
   - Port: 443
   - SSL certificate: Select from ACM
   - Default action: Forward to target group

#### Step 13: Create ECS Service

1. In ECS Console, create service:
   - Launch type: Fargate
   - Task definition: Select your task definition
   - Service name: myportal-app
   - Number of tasks: 2
   - VPC: Your VPC
   - Subnets: Private subnets
   - Security group: ECS Security Group
   - Load balancer: Select your ALB
   - Target group: Select your target group
   - Auto-scaling: Configure based on CPU/memory

#### Step 14: Configure Route 53

1. Go to **Route 53 Console**
2. Create/update A record:
   - Name: portal.yourcompany.com
   - Type: A
   - Alias: Yes
   - Alias target: Select your ALB

</details>

## Environment Configuration

### Environment Variables for ECS Task

The following environment variables must be configured in your ECS Task Definition:

```bash
# Application Configuration
NODE_ENV=production
BASE_URL=https://portal.yourcompany.com
PORT=3000

# Database Configuration (RDS)
DATABASE_URL=postgresql://postgres:PASSWORD@myportal-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/myportal

# Redis Configuration (ElastiCache)
REDIS_URL=redis://myportal-prod.xxxxx.cache.amazonaws.com:6379

# S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET_PROFILE_PHOTOS=myportal-profile-photos-prod
AWS_S3_BUCKET_DOCUMENTS=myportal-documents-prod
AWS_S3_BUCKET_PAYSLIPS=myportal-payslips-prod
AWS_S3_BUCKET_LEAVE_ATTACHMENTS=myportal-leave-attachments-prod
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# Secrets (from AWS Secrets Manager)
ADMIN_PASSWORD=<from-secrets-manager>
JWT_SECRET=<from-secrets-manager>
OPENAI_API_KEY=<from-secrets-manager>
```

### Secrets Manager Configuration

Store sensitive values in AWS Secrets Manager and reference them in the ECS task definition:

```json
{
  "secrets": [
    {
      "name": "ADMIN_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:myportal/prod/admin-password"
    },
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:myportal/prod/jwt-secret"
    },
    {
      "name": "OPENAI_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:myportal/prod/openai-api-key"
    }
  ]
}
```

## Monitoring & Logging

### CloudWatch Logs

All application logs are automatically sent to CloudWatch Logs:

```bash
# View logs
aws logs tail /ecs/myportal-production --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /ecs/myportal-production \
  --filter-pattern "ERROR"

# Export logs to S3
aws logs create-export-task \
  --log-group-name /ecs/myportal-production \
  --from 1609459200000 \
  --to 1609545600000 \
  --destination myportal-logs-archive \
  --destination-prefix production/
```

### CloudWatch Metrics

Monitor key metrics:

- **ECS Metrics**: CPUUtilization, MemoryUtilization
- **ALB Metrics**: TargetResponseTime, HealthyHostCount, RequestCount
- **RDS Metrics**: DatabaseConnections, CPUUtilization, FreeStorageSpace
- **ElastiCache Metrics**: CPUUtilization, NetworkBytesIn/Out, CurrConnections

### CloudWatch Alarms

Create alarms for critical metrics:

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name myportal-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=myportal-app Name=ClusterName,Value=myportal-production

# Database connection alarm
aws cloudwatch put-metric-alarm \
  --alarm-name myportal-high-db-connections \
  --alarm-description "Alert when DB connections exceed 80" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=myportal-prod
```

### X-Ray Tracing (Optional)

Enable AWS X-Ray for distributed tracing:

1. Add X-Ray daemon container to task definition
2. Install X-Ray SDK in application
3. Configure X-Ray sampling rules

## Backup & Recovery

### RDS Automated Backups

RDS provides automated backups:

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier myportal-prod \
  --db-snapshot-identifier myportal-manual-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myportal-restored \
  --db-snapshot-identifier myportal-manual-20240101

# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myportal-prod \
  --target-db-instance-identifier myportal-restored \
  --restore-time 2024-01-01T12:00:00Z
```

### S3 Backup

Enable versioning and lifecycle policies:

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket myportal-profile-photos-prod \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket myportal-profile-photos-prod \
  --lifecycle-configuration file://lifecycle-policy.json
```

lifecycle-policy.json:
```json
{
  "Rules": [
    {
      "Id": "archive-old-versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

### Disaster Recovery Plan

1. **RDS**: Multi-AZ deployment with automated backups
2. **S3**: Cross-region replication for critical buckets
3. **ECS**: Multi-AZ deployment with auto-scaling
4. **Documentation**: Maintain runbooks for recovery procedures

## Scaling

### Auto-Scaling Configuration

#### ECS Service Auto-Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/myportal-production/myportal-app \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/myportal-production/myportal-app \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://cpu-scaling-policy.json
```

cpu-scaling-policy.json:
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

#### RDS Scaling

For RDS, you can:
1. Increase instance size (vertical scaling)
2. Add read replicas (horizontal scaling for reads)
3. Enable storage auto-scaling

```bash
# Modify instance class
aws rds modify-db-instance \
  --db-instance-identifier myportal-prod \
  --db-instance-class db.t3.medium \
  --apply-immediately

# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier myportal-read-replica \
  --source-db-instance-identifier myportal-prod
```

## Cost Optimization

### Strategies

1. **Use Fargate Spot** for non-critical workloads (up to 70% savings)
2. **Right-size resources**: Monitor and adjust CPU/memory
3. **Use RDS Reserved Instances** (up to 60% savings)
4. **Enable S3 Intelligent-Tiering** for automatic cost optimization
5. **Use CloudFront** to reduce data transfer costs
6. **Schedule non-production environments** to run only during business hours

### Cost Monitoring

```bash
# Enable Cost Explorer
# Set up budget alerts in AWS Budgets

# Create budget
aws budgets create-budget \
  --account-id ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

## Troubleshooting

### ECS Task Failures

```bash
# Check task status
aws ecs describe-tasks \
  --cluster myportal-production \
  --tasks TASK_ID

# View stopped tasks
aws ecs list-tasks \
  --cluster myportal-production \
  --desired-status STOPPED

# Check CloudWatch logs
aws logs get-log-events \
  --log-group-name /ecs/myportal-production \
  --log-stream-name ecs/app/TASK_ID
```

### Database Connection Issues

```bash
# Test connectivity from ECS task
aws ecs execute-command \
  --cluster myportal-production \
  --task TASK_ID \
  --container app \
  --interactive \
  --command "/bin/sh"

# Inside container
nc -zv myportal-prod.xxxxx.us-east-1.rds.amazonaws.com 5432
```

### High Costs

1. Check Cost Explorer for unexpected charges
2. Review CloudWatch metrics for over-provisioned resources
3. Check for unused resources (stopped RDS instances, unattached EBS volumes)
4. Review data transfer costs (consider using VPC endpoints)

### SSL Certificate Issues

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID

# Request new certificate
aws acm request-certificate \
  --domain-name portal.yourcompany.com \
  --validation-method DNS
```

## Maintenance

### Updating the Application

```bash
# 1. Build new image
docker build -f docker/Dockerfile.production -t myportal:v2.0.0 .

# 2. Tag and push to ECR
docker tag myportal:v2.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myportal:v2.0.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myportal:v2.0.0

# 3. Update task definition with new image
aws ecs register-task-definition --cli-input-json file://task-definition-v2.json

# 4. Update service
aws ecs update-service \
  --cluster myportal-production \
  --service myportal-app \
  --task-definition myportal:2 \
  --force-new-deployment

# 5. Monitor deployment
aws ecs wait services-stable \
  --cluster myportal-production \
  --services myportal-app
```

### Database Maintenance

```bash
# Apply minor version updates
aws rds modify-db-instance \
  --db-instance-identifier myportal-prod \
  --engine-version 16.2 \
  --apply-immediately

# Modify maintenance window
aws rds modify-db-instance \
  --db-instance-identifier myportal-prod \
  --preferred-maintenance-window sun:03:00-sun:04:00
```

### Rotating Secrets

```bash
# Update secret in Secrets Manager
aws secretsmanager update-secret \
  --secret-id myportal/prod/jwt-secret \
  --secret-string "NEW_SECRET_VALUE"

# Force ECS service to redeploy with new secrets
aws ecs update-service \
  --cluster myportal-production \
  --service myportal-app \
  --force-new-deployment
```

### Cleanup Unused Resources

```bash
# Delete old ECR images
aws ecr list-images \
  --repository-name myportal \
  --filter tagStatus=UNTAGGED \
  --query 'imageIds[*]' \
  --output json | \
  aws ecr batch-delete-image \
    --repository-name myportal \
    --image-ids file:///dev/stdin

# Delete old RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier myportal-prod \
  --query 'DBSnapshots[?SnapshotCreateTime<=`2024-01-01`].DBSnapshotIdentifier' \
  --output text | \
  xargs -I {} aws rds delete-db-snapshot --db-snapshot-identifier {}
```

## Security Best Practices

### Network Security

1. **Use VPC endpoints** for AWS services (S3, Secrets Manager, ECR)
2. **Restrict security groups** to minimum required access
3. **Enable VPC Flow Logs** for network monitoring
4. **Use NAT Gateway** for outbound traffic from private subnets

### IAM Security

1. **Use IAM roles** for ECS tasks (no hardcoded credentials)
2. **Follow least privilege principle** for all IAM policies
3. **Enable MFA** for IAM users
4. **Regularly rotate access keys**

### Data Security

1. **Enable encryption at rest** for RDS, ElastiCache, and S3
2. **Enable encryption in transit** (SSL/TLS everywhere)
3. **Use AWS Secrets Manager** for all secrets
4. **Enable S3 bucket versioning** for data protection
5. **Configure S3 bucket policies** to prevent public access (except profile-photos)

### Compliance

1. **Enable CloudTrail** for audit logging
2. **Enable AWS Config** for compliance monitoring
3. **Use AWS Security Hub** for security findings
4. **Regular security assessments** using AWS Inspector

## Support & Resources

- **AWS Support**: Available through AWS Console
- **Application Logs**: CloudWatch Logs
- **Monitoring**: CloudWatch Dashboards
- **Cost Management**: AWS Cost Explorer and Budgets
- **Security**: AWS Security Hub and GuardDuty

---

**Remember**: Always test changes in a staging environment before deploying to production!
