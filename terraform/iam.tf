# ============================================================
# IAM Roles
# ============================================================

# ---------- ECS Task Execution Role ----------
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ---------- ECS Autoscale Role ----------
resource "aws_iam_role" "ecs_autoscale" {
  name = "ecsAutoscaleRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "application-autoscaling.amazonaws.com" }
    }]
  })
}

# ---------- ECS Deployer Role ----------
resource "aws_iam_role" "ecs_deployer" {
  name = "ECSDeployer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })
}

# ---------- RDS Monitoring Role ----------
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ---------- RDS Proxy Roles ----------
locals {
  rds_proxy_roles = {
    main         = "rds-proxy-role-1699960882399"
    identity     = "rds-proxy-role-1699961033067"
    notification = "rds-proxy-role-1699961139457"
    payment      = "rds-proxy-role-1699961224098"
    fb           = "rds-proxy-role-1700736841812"
    offer        = "rds-proxy-role-1700742071657"
  }
}

resource "aws_iam_role" "rds_proxy" {
  for_each = local.rds_proxy_roles

  name = each.value

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
    }]
  })

  inline_policy {
    name = "rds-proxy-secrets"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "*"
      }]
    })
  }
}

# ---------- Step Function / Lambda ECS Scale Role ----------
resource "aws_iam_role" "step_function_lambda_ecs" {
  name = "step-function-lambda-ecs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { Service = "states.amazonaws.com" }
      },
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

# ---------- ECS Main gRPC Scale Lambda Role ----------
resource "aws_iam_role" "ecs_main_grpc_scale" {
  name = "ECS-main-grpc-scaletask-Lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# ---------- CodePipeline Roles ----------
locals {
  codepipeline_services = ["CMS", "FB", "Gateway", "Identity", "Main", "Notification", "offer", "Payment", "Website"]
}

resource "aws_iam_role" "codepipeline" {
  for_each = toset(local.codepipeline_services)

  name = "AWSCodePipelineServiceRole-eu-central-1-${each.key}-Prod"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
    }]
  })
}

# Additional CodePipeline role for Production-Main
resource "aws_iam_role" "codepipeline_production_main" {
  name = "AWSCodePipelineServiceRole-eu-central-1-Production-Main"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
    }]
  })
}

# ---------- CodeBuild Roles ----------
locals {
  codebuild_roles = {
    "Muvi-Build"              = "codebuild-Muvi-Build-service-role"
    "Muvi-Build-azure-blob"   = "codebuild-Muvi-Build-azure-blob-service-role"
    "Muvi-Build-offer"        = "codebuild-Muvi-Build-offer-service-role"
    "Muvi-CMS-Build"          = "codebuild-Muvi-CMS-Build-service-role"
    "DB-migration"            = "codebuild-DB-migration-service-role"
    "DB-Preparation"          = "codebuild-DB-Preparation-service-role"
    "CopyProdToStaging-gw"    = "codebuild-CopyProdToStaging-muvi-gateway-service-role"
    "CopyProdToStaging-id"    = "codebuild-CopyProdToStaging-muvi-main-service-role"
    "CopyProdToStaging-main"  = "codebuild-CopyProdToStaging-muvi-notification-service-role"
    "CopyProdToStaging-notif" = "codebuild-CopyProdToStaging-muvi-payment-service-role"
    "CopyProdToStaging-pay"   = "codebuild-CopyProdToStaging-muvi-website-service-role"
    "CopyProdToStaging-ident" = "copy-prod-to-staging-muvi-identity-iam-role"
  }
}

resource "aws_iam_role" "codebuild" {
  for_each = local.codebuild_roles

  name = each.value

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })
}

# ---------- Lambda Execution Roles ----------
locals {
  lambda_roles = {
    "birthday-notification"               = "birthday-notification-prod-role-cmnzi040"
    "cron-cancel-expired"                 = "cron-cancel-expired-prod-role-7z5nte8x"
    "cron-check-stock"                    = "cron-check-and-update-stock-status-role-mlvbikug"
    "cron-reminder"                       = "cron-reminder-prod-role-5o2gw47t"
    "cron-reminder-transaction"           = "cron-reminder-transaction-role-roaizxt1"
    "cron-survey"                         = "cron-survey-prod-role-8zs9yqb1"
    "survey-email"                        = "survey-email-prod-role-qkd9xsgp"
    "sync-cinema"                         = "sync-cinema-prod-role-hflcgnct"
    "sync-concessions"                    = "sync-concessions-role-h5xwlyrg"
    "sync-films"                          = "sync-films-prod-role-p498nhnr"
    "sync-genres"                         = "sync-genres-prod-role-56a41ix2"
    "sync-person"                         = "sync-person-prod-role-dzkpyqpm"
    "sync-sessions"                       = "sync-sessions-prod-role-sewxh5gs"
    "user-anniversary"                    = "user-anniversary-prod-role-06ph8h2m"
    "rds-weekend-scale-in"                = "RDS-WeekEnd-Scale-in-role-p156wrog"
    "rds-weekend-scale-out"               = "RDS-WeekEnd-ScaleOut-role-ht44rjx6"
    "s3-to-blob"                          = "S3_to_Blob-role-q3vxit1r"
    "clear-orders-fb"                     = "clear-orders-fb-role-n3am11f1"
    "clean-sessions"                      = "clean-sessions-production-role-5purwopk"
    "invalidate-cache"                    = "InvalidateCache-role-es2rhfqj"
    "unpublished-old-films"               = "unpublished-old-films-role-nigkg0hv"
    "delete-old-notifications"            = "delete-old-notifications-role-c70gujf1"
    "ewallet-transactions"                = "ewallet-transactions-export-role-0khwhr11"
    "clean-orders-production"             = "clean-orders-production-role-n72fc9z3"
    "weekend-ecs-scaling"                 = "weekend-ECSscaling-role-ip9qferp"
    "terminate-pending-sync"              = "terminate-pending-sync-process-role-eqswmo2s"
    "event-test"                          = "event-test-role-4tr1tjx3"
  }
}

resource "aws_iam_role" "lambda" {
  for_each = local.lambda_roles

  name = each.value
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]
}

# Datadog Lambda role (different trust policy)
resource "aws_iam_role" "datadog_lambda" {
  name = "DatadogIntegration-Datado-LambdaExecutionRoleDatado-mL5ryQAq7EUk"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}
