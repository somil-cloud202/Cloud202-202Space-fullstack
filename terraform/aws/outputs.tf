output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.alb.alb_zone_id
}

output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = module.rds.db_endpoint
}

output "redis_endpoint" {
  description = "Endpoint of the ElastiCache Redis cluster"
  value       = module.elasticache.redis_endpoint
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.cloudfront_domain_name
}

output "s3_bucket_names" {
  description = "Names of S3 buckets"
  value = {
    profile_photos    = module.s3.profile_photos_bucket_name
    documents         = module.s3.documents_bucket_name
    payslips          = module.s3.payslips_bucket_name
    leave_attachments = module.s3.leave_attachments_bucket_name
  }
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.name
}

output "deployment_instructions" {
  description = "Instructions for deploying the application"
  value = <<-EOT
    
    ========================================
    AWS Deployment Complete!
    ========================================
    
    Next steps:
    
    1. Build and push Docker image:
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}
       docker build -f docker/Dockerfile.production -t ${var.project_name}:latest .
       docker tag ${var.project_name}:latest ${aws_ecr_repository.app.repository_url}:latest
       docker push ${aws_ecr_repository.app.repository_url}:latest
    
    2. Update ECS service:
       aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.app.name} --force-new-deployment --region ${var.aws_region}
    
    3. Configure DNS:
       Point ${var.domain_name} to ${module.alb.alb_dns_name}
    
    4. Monitor deployment:
       aws logs tail ${aws_cloudwatch_log_group.app.name} --follow --region ${var.aws_region}
    
    ========================================
  EOT
}
