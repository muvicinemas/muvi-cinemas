# ============================================================
# CloudWatch — Log Groups, Metric Filters, Security Alarms, Dashboards
# ============================================================

# ==================== LOG GROUPS ====================

# --- CloudTrail Log Groups ---
resource "aws_cloudwatch_log_group" "cloudtrail_management" {
  name              = "aws-cloudtrail-logs-011566070219-6758f19d"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "cloudtrail_codepipeline" {
  name              = "aws-cloudtrail-logs-011566070219-1bb30285"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "cloudtrail_datascan" {
  name              = "aws-cloudtrail-logs-011566070219-ae25d834"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "cloudtrail_4891d029" {
  name              = "aws-cloudtrail-logs-011566070219-4891d029"
  retention_in_days = 3
}

# --- ECS Log Groups ---
locals {
  ecs_log_groups = {
    "gateway"      = { name = "/ecs/muvi-gateway", retention = 1 }
    "identity"     = { name = "/ecs/muvi-identity", retention = 1 }
    "main"         = { name = "/ecs/muvi-main", retention = 1 }
    "payment"      = { name = "/ecs/muvi-payment", retention = 1 }
    "notification" = { name = "/ecs/muvi-notification", retention = 1 }
    "fb"           = { name = "/ecs/fb", retention = 1 }
    "offer"        = { name = "/ecs/offer", retention = 1 }
    "ticket"       = { name = "/ecs/muvi-ticket", retention = 14 }
    "website"      = { name = "/ecs/muvi-website", retention = 14 }
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = local.ecs_log_groups
  name              = each.value.name
  retention_in_days = each.value.retention
  tags              = { Service = each.key }
}

# --- ECS Container Insights ---
resource "aws_cloudwatch_log_group" "ecs_container_insights" {
  name              = "/aws/ecs/containerinsights/Muvi-Production/performance"
  retention_in_days = 1
}

# --- Lambda Log Groups ---
locals {
  lambda_log_groups = {
    "datadog_1"                  = { name = "/aws/lambda/DatadogIntegration-DatadogA-DatadogAPICallFunction-2YlA33W8VbBW", retention = 3 }
    "datadog_2"                  = { name = "/aws/lambda/DatadogIntegration-DatadogA-DatadogAPICallFunction-J8LkqJr7hAsR", retention = 30 }
    "datadog_forwarder"          = { name = "/aws/lambda/datadog-forwarder-Forwarder-430VkXHYChme", retention = 3 }
    "ecs_scale_down"             = { name = "/aws/lambda/ECS-main-grpc-tasks-SCALE_DOWN", retention = 3 }
    "ecs_scale_up"               = { name = "/aws/lambda/ECS-main-grpc-tasks-SCALE_UP", retention = 3 }
    "invalidate_cache"           = { name = "/aws/lambda/InvalidateCache", retention = 30 }
    "lambda_to_sf"               = { name = "/aws/lambda/Lambda_to_stepfunction", retention = 3 }
    "rds_scale_in"               = { name = "/aws/lambda/RDS-WeekEnd-Scale-in", retention = 30 }
    "rds_scale_out"              = { name = "/aws/lambda/RDS-WeekEnd-ScaleOut", retention = 30 }
    "s3_to_blob"                 = { name = "/aws/lambda/S3_to_Blob", retention = 3 }
    "birthday"                   = { name = "/aws/lambda/birthday-notification-prod", retention = 30 }
    "clean_orders"               = { name = "/aws/lambda/clean-orders-production", retention = 0 }
    "clean_sessions"             = { name = "/aws/lambda/clean-sessions-production", retention = 0 }
    "clear_orders_fb"            = { name = "/aws/lambda/clear-orders-fb", retention = 0 }
    "cancel_expired"             = { name = "/aws/lambda/cron-cancel-expired-prod", retention = 30 }
    "check_stock"                = { name = "/aws/lambda/cron-check-and-update-stock-status", retention = 3 }
    "reminder"                   = { name = "/aws/lambda/cron-reminder-prod", retention = 30 }
    "reminder_transaction"       = { name = "/aws/lambda/cron-reminder-transaction", retention = 30 }
    "survey"                     = { name = "/aws/lambda/cron-survey-prod", retention = 30 }
    "delete_old_notifications"   = { name = "/aws/lambda/delete-old-notifications", retention = 30 }
    "event_test"                 = { name = "/aws/lambda/event-test", retention = 0 }
    "ewallet_export"             = { name = "/aws/lambda/ewallet-transactions-export", retention = 30 }
    "key"                        = { name = "/aws/lambda/key", retention = 30 }
    "expired_cashback"           = { name = "/aws/lambda/process-expired-cashback-transaction", retention = 7 }
    "survey_email"               = { name = "/aws/lambda/survey-email-prod", retention = 30 }
    "sync_cinema"                = { name = "/aws/lambda/sync-cinema-prod", retention = 3 }
    "sync_concessions"           = { name = "/aws/lambda/sync-concessions", retention = 3 }
    "sync_films"                 = { name = "/aws/lambda/sync-films-prod", retention = 30 }
    "sync_genres"                = { name = "/aws/lambda/sync-genres-prod", retention = 30 }
    "sync_person"                = { name = "/aws/lambda/sync-person-prod", retention = 30 }
    "sync_sessions"              = { name = "/aws/lambda/sync-sessions-prod", retention = 30 }
    "terminate_pending_sync"     = { name = "/aws/lambda/terminate-pending-sync-process", retention = 0 }
    "unpublished_old_films"      = { name = "/aws/lambda/unpublished-old-films", retention = 0 }
    "anniversary"                = { name = "/aws/lambda/user-anniversary-prod", retention = 30 }
    "weekend_ecs_scaling"        = { name = "/aws/lambda/weekend-ECSscaling", retention = 30 }
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = local.lambda_log_groups
  name              = each.value.name
  retention_in_days = each.value.retention == 0 ? null : each.value.retention
  tags              = { Lambda = each.key }
}

# --- CodeBuild Log Groups ---
locals {
  codebuild_log_groups = {
    "build"                      = { name = "/aws/codebuild/Muvi-Build", retention = 3 }
    "build_offer"                = { name = "/aws/codebuild/Muvi-Build-offer", retention = 0 }
    "cms_build"                  = { name = "/aws/codebuild/Muvi-CMS-Build", retention = 3 }
    "db_migration"               = { name = "/aws/codebuild/DB-migration", retention = 0 }
    "db_preparation"             = { name = "/aws/codebuild/DB-Preparation", retention = 3 }
    "azure_blob"                 = { name = "/aws/codebuild/azure-blob", retention = 0 }
    "copy_gateway"               = { name = "/aws/codebuild/CopyProdToStaging-muvi-gateway", retention = 3 }
    "copy_identity"              = { name = "/aws/codebuild/CopyProdToStaging-muvi-identity", retention = 3 }
    "copy_main"                  = { name = "/aws/codebuild/CopyProdToStaging-muvi-main", retention = 3 }
    "copy_notification"          = { name = "/aws/codebuild/CopyProdToStaging-muvi-notification", retention = 3 }
    "copy_payment"               = { name = "/aws/codebuild/CopyProdToStaging-muvi-payment", retention = 3 }
    "copy_website"               = { name = "/aws/codebuild/CopyProdToStaging-muvi-website", retention = 3 }
  }
}

resource "aws_cloudwatch_log_group" "codebuild" {
  for_each          = local.codebuild_log_groups
  name              = each.value.name
  retention_in_days = each.value.retention == 0 ? null : each.value.retention
  tags              = { CodeBuild = each.key }
}

# --- RDS Log Groups ---
locals {
  rds_log_groups = {
    "main"                   = "/aws/rds/cluster/muvi-prod-main-service/postgresql"
    "identity"               = "/aws/rds/cluster/muvi-prod-identity/postgresql"
    "payment"                = "/aws/rds/cluster/muvi-prod-payments-recovered-cluster/postgresql"
    "notification"           = "/aws/rds/cluster/muvi-prod-notification/postgresql"
    "fb"                     = "/aws/rds/cluster/muvi-prod-fb-clone-cluster/postgresql"
    "offer"                  = "/aws/rds/cluster/muvi-offer-prod/postgresql"
    "main_legacy"            = "/aws/rds/cluster/muvi-prod/postgresql"
    "identity_backup"        = "/aws/rds/cluster/muvi-prod-identity-backup-cluster/postgresql"
    "main_clone"             = "/aws/rds/cluster/muvi-prod-main-service-clone-cluster/postgresql"
    "notification_clone"     = "/aws/rds/cluster/muvi-prod-notification-clone-cluster/postgresql"
    "payments_clone"         = "/aws/rds/cluster/muvi-prod-payments-clone-cluster/postgresql"
    "payments_legacy"        = "/aws/rds/cluster/muvi-prod-payments/postgresql"
    "order"                  = "/aws/rds/cluster/muvi-prod-order/postgresql"
  }
}

resource "aws_cloudwatch_log_group" "rds" {
  for_each          = local.rds_log_groups
  name              = each.value
  retention_in_days = 3

  lifecycle {
    ignore_changes = [retention_in_days]
  }
}

# --- RDS Proxy Log Groups ---
locals {
  rds_proxy_log_groups = {
    "main"         = { name = "/aws/rds/proxy/main-proxy", retention = 1 }
    "identity"     = { name = "/aws/rds/proxy/identity-proxy", retention = 3 }
    "payment"      = { name = "/aws/rds/proxy/payment-proxy", retention = 3 }
    "notification" = { name = "/aws/rds/proxy/notification-proxy", retention = 3 }
    "fb"           = { name = "/aws/rds/proxy/fb-proxy", retention = 3 }
    "offer"        = { name = "/aws/rds/proxy/offer-proxy", retention = 0 }
  }
}

resource "aws_cloudwatch_log_group" "rds_proxy" {
  for_each          = local.rds_proxy_log_groups
  name              = each.value.name
  retention_in_days = each.value.retention == 0 ? null : each.value.retention
}

# --- CodePipeline Log Groups ---
resource "aws_cloudwatch_log_group" "codepipeline_cms" {
  name = "/aws/codepipeline/Production-CMS"
}

# --- Misc Log Groups ---
resource "aws_cloudwatch_log_group" "rdsos_metrics" {
  name              = "RDSOSMetrics"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "redis_engine_logs" {
  name              = "Redis-Engine-Logs"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "redis_slow_logs" {
  name              = "Redis-Slow-Logs"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "muvi_redis_engine" {
  name              = "muvi-prod-redis-Engine-logs"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "muvi_redis_slow" {
  name              = "muvi-prod-redis-Slow-logs"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "muvi_redis_slow_lower" {
  name              = "muvi-prod-redis-slow-logs"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "waf_otp" {
  name              = "aws-waf-logs-OTP"
  retention_in_days = 14
}


# ==================== METRIC FILTERS (Security) ====================

locals {
  security_metric_filters = {
    "AWSManagementConsoleAuthenticationFailures" = {
      pattern = "{($.eventName=ConsoleLogin) && ($.errorMessage=\"Failed authentication\")}"
      metric  = "AWS-Management-Console-authentication-failures"
    }
    "ChangesToNetworkAccessControlLists" = {
      pattern = "{($.eventName=CreateNetworkAcl) || ($.eventName=CreateNetworkAclEntry) || ($.eventName=DeleteNetworkAcl) || ($.eventName=DeleteNetworkAclEntry) || ($.eventName=ReplaceNetworkAclEntry) || ($.eventName=ReplaceNetworkAclAssociation)}"
      metric  = "Changes-To-Network-Access-Control-Lists"
    }
    "ChangesToNetworkGateways" = {
      pattern = "{($.eventName=CreateCustomerGateway) || ($.eventName=DeleteCustomerGateway) || ($.eventName=AttachInternetGateway) || ($.eventName=CreateInternetGateway) || ($.eventName=DeleteInternetGateway) || ($.eventName=DetachInternetGateway)}"
      metric  = "Changes-To-Network-Gateways"
    }
    "CloudTrailConfigurationChanges" = {
      pattern = "{($.eventName=CreateTrail) || ($.eventName=UpdateTrail) || ($.eventName=DeleteTrail) || ($.eventName=StartLogging) || ($.eventName=StopLogging)}"
      metric  = "CloudTrail-Configuration-Changes"
    }
    "ConfigConfigurationChanges" = {
      pattern = "{($.eventSource=config.amazonaws.com) && (($.eventName=StopConfigurationRecorder) || ($.eventName=DeleteDeliveryChannel) || ($.eventName=PutDeliveryChannel) || ($.eventName=PutConfigurationRecorder))}"
      metric  = "Config-Configuration-Changes"
    }
    "ConsoleSigninFailure" = {
      pattern = "{($.eventName = ConsoleLogin) && ($.responseElements.ConsoleLogin != \"Success\")}"
      metric  = "Console-Sign-in-Failure"
    }
    "DisablingOrScheduledDeletionOfCustomerCreatedCMKs" = {
      pattern = "{($.eventSource=kms.amazonaws.com) && (($.eventName=DisableKey) || ($.eventName=ScheduleKeyDeletion))}"
      metric  = "Disabling-Or-Scheduled-Deletion-of-Customer-created-CMKs"
    }
    "IAMPolicyChanges" = {
      pattern = "{($.eventName=DeleteGroupPolicy) || ($.eventName=DeleteRolePolicy) || ($.eventName=DeleteUserPolicy) || ($.eventName=PutGroupPolicy) || ($.eventName=PutRolePolicy) || ($.eventName=PutUserPolicy) || ($.eventName=CreatePolicy) || ($.eventName=DeletePolicy) || ($.eventName=CreatePolicyVersion) || ($.eventName=DeletePolicyVersion) || ($.eventName=AttachRolePolicy) || ($.eventName=DetachRolePolicy) || ($.eventName=AttachGroupPolicy) || ($.eventName=DetachGroupPolicy) || ($.eventName=AttachUserPolicy) || ($.eventName=DetachUserPolicy)}"
      metric  = "IAM-Policy-Changes"
    }
    "ManagementConsoleSignInWithoutMFA" = {
      pattern = "{($.eventName=\"ConsoleLogin\") && ($.additionalEventData.MFAUsed !=\"Yes\")}"
      metric  = "Management-Console-Sign-In-Without-MFA"
    }
    "RouteTableChanges" = {
      pattern = "{($.eventName=CreateRoute) || ($.eventName=CreateRouteTable) || ($.eventName=ReplaceRoute) || ($.eventName=ReplaceRouteTableAssociation) || ($.eventName=DeleteRouteTable) || ($.eventName=DeleteRoute) || ($.eventName=DisassociateRouteTable)}"
      metric  = "Route-Table-Changes"
    }
    "S3BucketPolicyChanges" = {
      pattern = "{($.eventSource=s3.amazonaws.com) && (($.eventName=PutBucketAcl) || ($.eventName=PutBucketPolicy) || ($.eventName=PutBucketCors) || ($.eventName=PutBucketLifecycle) || ($.eventName=PutBucketReplication) || ($.eventName=DeleteBucketPolicy) || ($.eventName=DeleteBucketCors) || ($.eventName=DeleteBucketLifecycle) || ($.eventName=DeleteBucketReplication))}"
      metric  = "S3-Bucket-Policy-Changes"
    }
    "SecurityGroupChanges" = {
      pattern = "{($.eventName=AuthorizeSecurityGroupIngress) || ($.eventName=AuthorizeSecurityGroupEgress) || ($.eventName=RevokeSecurityGroupIngress) || ($.eventName=RevokeSecurityGroupEgress) || ($.eventName=CreateSecurityGroup) || ($.eventName=DeleteSecurityGroup)}"
      metric  = "Security-Group-Changes"
    }
    "UnauthorizedAPICalls" = {
      pattern = "{($.errorCode=\"*UnauthorizedOperation\") || ($.errorCode=\"AccessDenied*\")}"
      metric  = "Unauthorized-API-Calls"
    }
    "UsageOfRootAccount" = {
      pattern = "{$.userIdentity.type=\"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType !=\"AwsServiceEvent\"}"
      metric  = "Usage-Of-Root-Account"
    }
    "VPCChanges" = {
      pattern = "{($.eventName=CreateVpc) || ($.eventName=DeleteVpc) || ($.eventName=ModifyVpcAttribute) || ($.eventName=AcceptVpcPeeringConnection) || ($.eventName=CreateVpcPeeringConnection) || ($.eventName=DeleteVpcPeeringConnection) || ($.eventName=RejectVpcPeeringConnection) || ($.eventName=AttachClassicLinkVpc) || ($.eventName=DetachClassicLinkVpc) || ($.eventName=DisableVpcClassicLink) || ($.eventName=EnableVpcClassicLink)}"
      metric  = "VPC-Changes"
    }
  }
}

resource "aws_cloudwatch_log_metric_filter" "security" {
  for_each = local.security_metric_filters

  name           = "Security-Alarms-${each.key}"
  log_group_name = aws_cloudwatch_log_group.cloudtrail_management.name
  pattern        = each.value.pattern

  metric_transformation {
    name      = each.value.metric
    namespace = "LogMetrics"
    value     = "1"
  }
}


# ==================== SECURITY ALARMS ====================

resource "aws_cloudwatch_metric_alarm" "security" {
  for_each = local.security_metric_filters

  alarm_name          = each.value.metric
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = each.value.metric
  namespace           = "LogMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 1.0
  alarm_description   = "Security alarm: ${each.value.metric}"
  alarm_actions       = [aws_sns_topic.security_alarms.arn]
  treat_missing_data  = "notBreaching"
}

# ECS Ephemeral Storage alarm
resource "aws_cloudwatch_metric_alarm" "high_ephemeral_storage" {
  alarm_name          = "High_Epemeral_Storage_value"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EphemeralStorageUtilized"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 18.0
  alarm_description   = "High ephemeral storage usage in ECS"
  treat_missing_data  = "notBreaching"
}

# NOTE: TargetTracking-* alarms (RDS, ECS, DynamoDB) are auto-managed by
# Application Auto Scaling and should NOT be in Terraform.
# They are created/destroyed by the autoscaling policies defined in ecs.tf and rds.tf.


# ==================== DASHBOARDS ====================

resource "aws_cloudwatch_dashboard" "muvi_services" {
  dashboard_name = "Muvi-Services"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", "Muvi-Production", { stat = "Average" }]
          ]
          period = 300
          region = var.aws_region
          title  = "ECS CPU Utilization"
        }
      }
    ]
  })

  lifecycle {
    ignore_changes = [dashboard_body]
  }
}

resource "aws_cloudwatch_dashboard" "production" {
  dashboard_name = "Production-Dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/Muvi-Prod/placeholder"]
          ]
          period = 300
          region = var.aws_region
          title  = "ALB Request Count"
        }
      }
    ]
  })

  lifecycle {
    ignore_changes = [dashboard_body]
  }
}

resource "aws_cloudwatch_dashboard" "db" {
  dashboard_name = "DB-Dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", "muvi-prod-main-service"]
          ]
          period = 300
          region = var.aws_region
          title  = "RDS CPU Utilization"
        }
      }
    ]
  })

  lifecycle {
    ignore_changes = [dashboard_body]
  }
}

resource "aws_cloudwatch_dashboard" "db_health_summary" {
  dashboard_name = "muvi-prod-main-writer_Aurora_PostgreSQL_database_health_summary"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBClusterIdentifier", "muvi-prod-main-service"]
          ]
          period = 60
          region = var.aws_region
          title  = "Database Connections"
        }
      }
    ]
  })

  lifecycle {
    ignore_changes = [dashboard_body]
  }
}
