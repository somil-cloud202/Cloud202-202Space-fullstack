# AWS Migration Summary

This document summarizes the changes made to support AWS ECS deployment and provides guidance on migrating from Docker Compose to AWS native services.

## Overview

The application has been updated to support deployment on AWS using native services:

- **Docker Compose** → **AWS ECS Fargate** (containerized application)
- **PostgreSQL (Docker)** → **Amazon RDS PostgreSQL** (managed database)
- **Redis (Docker)** → **Amazon ElastiCache Redis** (managed cache)
- **MinIO (Docker)** → **Amazon S3 + CloudFront** (object storage + CDN)
- **Nginx (Docker)** → **Application Load Balancer** (load balancing + SSL)

## Key Features

✅ **Dual-mode storage**: Application works with both MinIO (local dev) and S3 (production)
✅ **Infrastructure as Code**: Complete Terraform configuration for AWS resources
✅ **Automated deployment**: Script for building and deploying to ECS
✅ **Secrets management**: Integration with AWS Secrets Manager
✅ **Auto-scaling**: ECS service auto-scaling based on CPU/memory
✅ **Monitoring**: CloudWatch logs and metrics integration
✅ **CDN**: CloudFront distribution for static assets

## Files Created

### Documentation
- `AWS_DEPLOYMENT.md` - Comprehensive AWS deployment guide
- `AWS_MIGRATION_SUMMARY.md` - This file
- `.env.aws.example` - AWS-specific environment variables example

### Terraform Infrastructure
- `terraform/aws/main.tf` - Main Terraform configuration
- `terraform/aws/variables.tf` - Terraform input variables
- `terraform/aws/outputs.tf` - Terraform outputs
- `terraform/aws/terraform.tfvars.example` - Example Terraform variables

### Deployment Scripts
- `scripts/deploy-aws.sh` - Automated AWS deployment script

## Files Modified

### Application Code
- `src/server/env.ts` - Added AWS environment variables (AWS_REGION, AWS_S3_BUCKET_*, AWS_CLOUDFRONT_DOMAIN)
- `src/server/minio.ts` - **Major change**: Replaced MinIO client with dual-mode storage client supporting both MinIO and S3
- `src/server/scripts/setup.ts` - Updated to work with both MinIO and S3
- `src/server/trpc/procedures/profile/getUploadUrl.ts` - Updated to use getBucketName helper
- `src/server/trpc/procedures/documents/getDocumentUploadUrl.ts` - Updated to use getBucketName helper

## Environment Variables

### New AWS-Specific Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_REGION` | Yes (for S3) | AWS region for resources | `us-east-1` |
| `AWS_S3_BUCKET_PROFILE_PHOTOS` | Yes (for S3) | S3 bucket for profile photos | `myportal-profile-photos-prod` |
| `AWS_S3_BUCKET_DOCUMENTS` | Yes (for S3) | S3 bucket for documents | `myportal-documents-prod` |
| `AWS_S3_BUCKET_PAYSLIPS` | Yes (for S3) | S3 bucket for payslips | `myportal-payslips-prod` |
| `AWS_S3_BUCKET_LEAVE_ATTACHMENTS` | Yes (for S3) | S3 bucket for leave attachments | `myportal-leave-attachments-prod` |
| `AWS_CLOUDFRONT_DOMAIN` | No | CloudFront distribution domain | `d1234567890.cloudfront.net` |

### Modified Variables

| Variable | Change | Notes |
|----------|--------|-------|
| `ADMIN_PASSWORD` | Now optional | Only required for MinIO mode; not needed for S3 |
| `DATABASE_URL` | Format change | Must point to RDS endpoint in AWS |

### Unchanged Variables

These variables remain the same:
- `NODE_ENV`
- `BASE_URL`
- `PORT`
- `JWT_SECRET`
- `OPENAI_API_KEY`

## Migration Path

### Step 1: Set Up AWS Infrastructure

#### Option A: Using Terraform (Recommended)

```bash
cd terraform/aws

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply configuration
terraform apply
```

#### Option B: Manual Setup

Follow the manual setup instructions in `AWS_DEPLOYMENT.md`.

### Step 2: Update Environment Variables

Create secrets in AWS Secrets Manager:

```bash
# Create secrets
aws secretsmanager create-secret \
  --name myportal/prod/admin-password \
  --secret-string "YOUR_STRONG_PASSWORD"

aws secretsmanager create-secret \
  --name myportal/prod/jwt-secret \
  --secret-string "YOUR_STRONG_JWT_SECRET"

aws secretsmanager create-secret \
  --name myportal/prod/openai-api-key \
  --secret-string "YOUR_OPENAI_API_KEY"
```

### Step 3: Build and Deploy Application

```bash
# Make deploy script executable
chmod +x scripts/deploy-aws.sh

# Run deployment
./scripts/deploy-aws.sh
```

Or manually:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -f docker/Dockerfile.production -t myportal:latest .

# Tag for ECR
docker tag myportal:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myportal-production:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/myportal-production:latest

# Update ECS service
aws ecs update-service \
  --cluster myportal-production \
  --service myportal-app \
  --force-new-deployment \
  --region us-east-1
```

### Step 4: Configure DNS

Point your domain to the ALB:

```bash
# Get ALB DNS name from Terraform output or AWS console
# Create CNAME or A (Alias) record in Route 53 or your DNS provider
```

### Step 5: Verify Deployment

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster myportal-production \
  --services myportal-app \
  --region us-east-1

# View logs
aws logs tail /ecs/myportal-production --follow --region us-east-1

# Test application
curl https://your-domain.com/health
```

## Architecture Comparison

### Before (Docker Compose)

```
┌─────────────────────────────────────┐
│         Docker Host                 │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Nginx   │  │   App    │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Postgres │  │  Redis   │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐                       │
│  │  MinIO   │                       │
│  └──────────┘                       │
└─────────────────────────────────────┘
```

### After (AWS)

```
┌─────────────────────────────────────────────────────┐
│                    AWS Cloud                        │
│                                                     │
│  ┌─────────────┐                                   │
│  │     ALB     │ (replaces Nginx)                  │
│  └──────┬──────┘                                   │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                   │
│  │ ECS Fargate │ (replaces App container)          │
│  │   Tasks     │                                   │
│  └──────┬──────┘                                   │
│         │                                           │
│    ┌────┴────┬──────────┬──────────┐              │
│    ▼         ▼          ▼          ▼              │
│  ┌────┐  ┌─────┐    ┌────┐    ┌────────┐         │
│  │RDS │  │Redis│    │ S3 │    │CloudFr.│         │
│  └────┘  └─────┘    └────┘    └────────┘         │
│  (Postgres) (Cache) (Storage)    (CDN)            │
└─────────────────────────────────────────────────────┘
```

## Cost Considerations

### Estimated Monthly Costs (Production)

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| ECS Fargate | 2 tasks, 0.5 vCPU, 1GB RAM | ~$30 |
| RDS PostgreSQL | db.t3.small | ~$30 |
| ElastiCache Redis | cache.t3.micro | ~$15 |
| ALB | Standard | ~$20 |
| S3 | 50GB storage | ~$1 |
| CloudFront | 1TB transfer | ~$85 |
| Data Transfer | Outbound | ~$20 |
| CloudWatch | Logs and metrics | ~$5 |
| **Total** | | **~$206/month** |

### Cost Optimization Tips

1. Use Fargate Spot for non-critical workloads (up to 70% savings)
2. Use RDS Reserved Instances (up to 60% savings)
3. Enable S3 Intelligent-Tiering
4. Use CloudFront to reduce data transfer costs
5. Right-size resources based on actual usage

## Troubleshooting

### Common Issues

#### 1. Storage Client Initialization Fails

**Symptom**: Application crashes on startup with storage-related errors

**Solution**: 
- For S3 mode: Ensure all `AWS_S3_BUCKET_*` variables are set
- For MinIO mode: Ensure `ADMIN_PASSWORD` is set
- Check that the application can reach the storage service

#### 2. Presigned URLs Not Working

**Symptom**: File uploads fail or return 403 errors

**Solution**:
- For S3: Verify IAM role has `s3:PutObject` permission
- For MinIO: Verify bucket policies are set correctly
- Check that bucket names match environment variables

#### 3. ECS Tasks Failing to Start

**Symptom**: ECS service shows tasks in STOPPED state

**Solution**:
```bash
# Check task logs
aws ecs describe-tasks --cluster myportal-production --tasks TASK_ID

# View CloudWatch logs
aws logs get-log-events \
  --log-group-name /ecs/myportal-production \
  --log-stream-name ecs/app/TASK_ID
```

#### 4. Database Connection Issues

**Symptom**: Application can't connect to RDS

**Solution**:
- Verify security group allows traffic from ECS security group
- Check DATABASE_URL format is correct
- Ensure RDS is in the same VPC as ECS tasks
- Verify subnets have route to NAT Gateway (for private subnets)

## Rollback Plan

If you need to rollback to Docker Compose:

1. The application code is backward compatible
2. Set environment variables for MinIO mode (remove AWS_* variables)
3. Ensure `ADMIN_PASSWORD` is set
4. Use `docker compose -f docker/compose.production.yaml up -d`

## Security Considerations

### Implemented Security Measures

✅ **Secrets Management**: All sensitive data in AWS Secrets Manager
✅ **Encryption at Rest**: RDS, S3, and ElastiCache encrypted
✅ **Encryption in Transit**: SSL/TLS everywhere (ALB, RDS, ElastiCache)
✅ **Network Isolation**: Private subnets for app, database, and cache
✅ **IAM Roles**: No hardcoded credentials, using IAM roles for ECS tasks
✅ **Security Groups**: Principle of least privilege for network access
✅ **Container Scanning**: ECR image scanning enabled

### Recommended Additional Measures

- Enable AWS WAF on ALB for DDoS protection
- Enable GuardDuty for threat detection
- Enable AWS Config for compliance monitoring
- Enable CloudTrail for audit logging
- Implement AWS Systems Manager Session Manager for secure access
- Regular security assessments using AWS Inspector

## Monitoring and Logging

### CloudWatch Logs

All application logs are sent to CloudWatch:

```bash
# View real-time logs
aws logs tail /ecs/myportal-production --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /ecs/myportal-production \
  --filter-pattern "ERROR"
```

### CloudWatch Metrics

Key metrics to monitor:

- **ECS**: CPUUtilization, MemoryUtilization
- **ALB**: TargetResponseTime, HealthyHostCount, RequestCount
- **RDS**: DatabaseConnections, CPUUtilization, FreeStorageSpace
- **S3**: NumberOfObjects, BucketSizeBytes

### Recommended Alarms

Set up CloudWatch alarms for:

- ECS CPU > 80%
- ECS Memory > 80%
- ALB TargetResponseTime > 1 second
- RDS DatabaseConnections > 80% of max
- RDS FreeStorageSpace < 20%

## Support and Resources

### Documentation
- [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) - Detailed deployment guide
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Original Docker Compose guide

### AWS Services Documentation
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

### Terraform Resources
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

## Next Steps

After successful deployment:

1. ✅ Set up automated backups for RDS
2. ✅ Configure CloudWatch alarms
3. ✅ Set up AWS Backup for automated backup management
4. ✅ Implement CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
5. ✅ Set up staging environment
6. ✅ Configure Route 53 health checks
7. ✅ Enable AWS X-Ray for distributed tracing
8. ✅ Set up cost alerts in AWS Budgets
9. ✅ Document disaster recovery procedures
10. ✅ Conduct security audit

---

**Questions or Issues?** Refer to the troubleshooting section in `AWS_DEPLOYMENT.md` or check CloudWatch logs for detailed error messages.
