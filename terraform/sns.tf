# ============================================================
# SNS Topics — 9 Topics + Subscriptions
# ============================================================

resource "aws_sns_topic" "cloudtrail_logs" {
  name = "aws-cloudtrail-logs-011566070219-5c41b13a"
  tags = { Name = "cloudtrail-logs" }
}

resource "aws_sns_topic" "data_scan" {
  name = "AWS_Data_Scan"
  tags = { Name = "data-scan" }
}

resource "aws_sns_topic" "bespin" {
  name = "bespin"
  tags = { Name = "bespin" }
}

resource "aws_sns_topic" "codestar_notifications" {
  name = "codestar-notifications-prod"
  tags = { Name = "codestar-notifications-prod" }
}

resource "aws_sns_topic" "jira_notification" {
  name = "Jira-Notification"
  tags = { Name = "Jira-Notification" }
}

resource "aws_sns_topic" "security_alarms" {
  name = "Security-Alarms"
  tags = { Name = "Security-Alarms" }
}

resource "aws_sns_topic" "trigger_lambda_sf" {
  name = "Trigger_Lambda_Step_Function"
  tags = { Name = "Trigger_Lambda_Step_Function" }
}

resource "aws_sns_topic" "production_cms" {
  name = "Production-CMS"
  tags = { Name = "Production-CMS" }
}

resource "aws_sns_topic" "production_website" {
  name = "Production-Website"
  tags = { Name = "Production-Website" }
}

# ---------- SNS Topic Policies ----------
resource "aws_sns_topic_policy" "codestar_notifications" {
  arn = aws_sns_topic.codestar_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CodeNotification_publish"
        Effect    = "Allow"
        Principal = { Service = "codestar-notifications.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.codestar_notifications.arn
      }
    ]
  })
}

resource "aws_sns_topic_policy" "security_alarms" {
  arn = aws_sns_topic.security_alarms.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "__default_statement_ID"
        Effect    = "Allow"
        Principal = { AWS = "*" }
        Action = [
          "SNS:GetTopicAttributes",
          "SNS:SetTopicAttributes",
          "SNS:AddPermission",
          "SNS:RemovePermission",
          "SNS:DeleteTopic",
          "SNS:Subscribe",
          "SNS:ListSubscriptionsByTopic",
          "SNS:Publish"
        ]
        Resource  = aws_sns_topic.security_alarms.arn
        Condition = { StringEquals = { "AWS:SourceOwner" = var.account_id } }
      }
    ]
  })
}

resource "aws_sns_topic_policy" "trigger_lambda_sf" {
  arn = aws_sns_topic.trigger_lambda_sf.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "__default_statement_ID"
        Effect    = "Allow"
        Principal = { AWS = "*" }
        Action = [
          "SNS:GetTopicAttributes",
          "SNS:SetTopicAttributes",
          "SNS:AddPermission",
          "SNS:RemovePermission",
          "SNS:DeleteTopic",
          "SNS:Subscribe",
          "SNS:ListSubscriptionsByTopic",
          "SNS:Publish"
        ]
        Resource  = aws_sns_topic.trigger_lambda_sf.arn
        Condition = { StringEquals = { "AWS:SourceOwner" = var.account_id } }
      },
      {
        Sid       = "AWSEvents_Publish"
        Effect    = "Allow"
        Principal = { Service = "events.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.trigger_lambda_sf.arn
      }
    ]
  })
}

# ---------- SNS Subscriptions ----------
resource "aws_sns_topic_subscription" "codestar_email_hasan" {
  topic_arn = aws_sns_topic.codestar_notifications.arn
  protocol  = "email"
  endpoint  = "t.hasan@alpha-apps.ae"

  lifecycle {
    ignore_changes = [confirmation_timeout_in_minutes]
  }
}

resource "aws_sns_topic_subscription" "codestar_email_ajlouni" {
  topic_arn = aws_sns_topic.codestar_notifications.arn
  protocol  = "email"
  endpoint  = "b.ajlouni@alpha-apps.ae"

  lifecycle {
    ignore_changes = [confirmation_timeout_in_minutes]
  }
}

resource "aws_sns_topic_subscription" "trigger_lambda_sf_sub" {
  topic_arn = aws_sns_topic.trigger_lambda_sf.arn
  protocol  = "lambda"
  endpoint  = "arn:aws:lambda:eu-central-1:011566070219:function:Lambda_to_stepfunction"
}

resource "aws_sns_topic_subscription" "data_scan_https" {
  topic_arn = aws_sns_topic.data_scan.arn
  protocol  = "https"
  endpoint  = "https://cel.dlp-prod-eu.prismacloud.io/dlp/api/v1/cloudtrail/consume/uuid/bc5fad7b-2447-48ec-ac27-94867b526e9d"

  lifecycle {
    ignore_changes = [endpoint]
  }
}
