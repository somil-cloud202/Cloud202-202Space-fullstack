terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 backend for state management
  # backend "s3" {
  #   bucket         = "myportal-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  azs          = slice(data.aws_availability_zones.available.names, 0, 2)
}

# Security Groups
module "security_groups" {
  source = "./modules/security-groups"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"

  project_name          = var.project_name
  environment           = var.environment
  db_instance_class     = var.db_instance_class
  db_allocated_storage  = var.db_allocated_storage
  db_name               = var.db_name
  db_username           = var.db_username
  db_password_secret_id = aws_secretsmanager_secret.db_password.id
  subnet_ids            = module.vpc.private_subnet_ids
  security_group_ids    = [module.security_groups.rds_sg_id]
  multi_az              = var.environment == "production" ? true : false
}

# ElastiCache Redis
module "elasticache" {
  source = "./modules/elasticache"

  project_name       = var.project_name
  environment        = var.environment
  redis_node_type    = var.redis_node_type
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.redis_sg_id]
  num_cache_nodes    = var.environment == "production" ? 2 : 1
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  
  buckets = {
    profile-photos      = { public_read = true }
    documents           = { public_read = false }
    payslips            = { public_read = false }
    leave-attachments   = { public_read = false }
  }
}

# CloudFront Distribution
module "cloudfront" {
  source = "./modules/cloudfront"

  project_name           = var.project_name
  environment            = var.environment
  s3_bucket_domain_name  = module.s3.profile_photos_bucket_regional_domain_name
  certificate_arn        = var.certificate_arn
  domain_name            = var.domain_name
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = 30
}

# IAM Roles
module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
  account_id   = data.aws_caller_identity.current.account_id
  aws_region   = var.aws_region
  
  s3_bucket_arns = [
    module.s3.profile_photos_bucket_arn,
    module.s3.documents_bucket_arn,
    module.s3.payslips_bucket_arn,
    module.s3.leave_attachments_bucket_arn,
  ]
  
  secret_arns = [
    aws_secretsmanager_secret.admin_password.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.openai_api_key.arn,
    aws_secretsmanager_secret.db_password.arn,
  ]
}

# Secrets Manager
resource "aws_secretsmanager_secret" "admin_password" {
  name        = "${var.project_name}/${var.environment}/admin-password"
  description = "Admin password for ${var.project_name}"
}

resource "aws_secretsmanager_secret_version" "admin_password" {
  secret_id     = aws_secretsmanager_secret.admin_password.id
  secret_string = var.admin_password
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/${var.environment}/jwt-secret"
  description = "JWT secret for ${var.project_name}"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name        = "${var.project_name}/${var.environment}/openai-api-key"
  description = "OpenAI API key for ${var.project_name}"
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.project_name}/${var.environment}/db-password"
  description = "Database password for ${var.project_name}"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  security_group_ids = [module.security_groups.alb_sg_id]
  certificate_arn    = var.certificate_arn
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = module.iam.ecs_task_execution_role_arn
  task_role_arn            = module.iam.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "BASE_URL"
          value = "https://${var.domain_name}"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${module.rds.db_endpoint}/${var.db_name}"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "AWS_S3_BUCKET_PROFILE_PHOTOS"
          value = module.s3.profile_photos_bucket_name
        },
        {
          name  = "AWS_S3_BUCKET_DOCUMENTS"
          value = module.s3.documents_bucket_name
        },
        {
          name  = "AWS_S3_BUCKET_PAYSLIPS"
          value = module.s3.payslips_bucket_name
        },
        {
          name  = "AWS_S3_BUCKET_LEAVE_ATTACHMENTS"
          value = module.s3.leave_attachments_bucket_name
        },
        {
          name  = "AWS_CLOUDFRONT_DOMAIN"
          value = module.cloudfront.cloudfront_domain_name
        }
      ]

      secrets = [
        {
          name      = "ADMIN_PASSWORD"
          valueFrom = aws_secretsmanager_secret.admin_password.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "OPENAI_API_KEY"
          valueFrom = aws_secretsmanager_secret.openai_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3000/trpc/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [module.security_groups.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = module.alb.target_group_arn
    container_name   = "app"
    container_port   = 3000
  }

  depends_on = [
    module.alb.alb_listener_arn
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${var.project_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "ecs_memory" {
  name               = "${var.project_name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Route 53 (optional - only if managing DNS with Terraform)
# resource "aws_route53_record" "app" {
#   zone_id = var.route53_zone_id
#   name    = var.domain_name
#   type    = "A"
#
#   alias {
#     name                   = module.alb.alb_dns_name
#     zone_id                = module.alb.alb_zone_id
#     evaluate_target_health = true
#   }
# }
