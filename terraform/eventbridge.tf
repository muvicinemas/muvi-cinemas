# ============================================================
# EventBridge Rules + Targets — All 37
# ============================================================

# ---------- Vista Sync Cron Jobs ----------
resource "aws_cloudwatch_event_rule" "film_sync" {
  name                = "film-sync"
  schedule_expression = "rate(30 minutes)"
  state               = "ENABLED"
  tags                = { Name = "film-sync" }
}

resource "aws_cloudwatch_event_target" "film_sync" {
  rule      = aws_cloudwatch_event_rule.film_sync.name
  target_id = "film-sync-target"
  arn       = aws_lambda_function.sync_films.arn
}

resource "aws_cloudwatch_event_rule" "person_sync" {
  name                = "person-sync"
  schedule_expression = "rate(1 hour)"
  state               = "ENABLED"
  tags                = { Name = "person-sync" }
}

resource "aws_cloudwatch_event_target" "person_sync" {
  rule      = aws_cloudwatch_event_rule.person_sync.name
  target_id = "person-sync-target"
  arn       = aws_lambda_function.sync_person.arn
}

resource "aws_cloudwatch_event_rule" "sync_cinemas" {
  name                = "sync-cinemas"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "sync-cinemas" }
}

resource "aws_cloudwatch_event_target" "sync_cinemas" {
  rule      = aws_cloudwatch_event_rule.sync_cinemas.name
  target_id = "sync-cinemas-target"
  arn       = aws_lambda_function.sync_cinema.arn
}

resource "aws_cloudwatch_event_rule" "sync_genres" {
  name                = "sync-genres"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "sync-genres" }
}

resource "aws_cloudwatch_event_target" "sync_genres" {
  rule      = aws_cloudwatch_event_rule.sync_genres.name
  target_id = "sync-genres-target"
  arn       = aws_lambda_function.sync_genres.arn
}

resource "aws_cloudwatch_event_rule" "sync_sessions" {
  name                = "sync-sessions"
  schedule_expression = "rate(15 minutes)"
  state               = "ENABLED"
  tags                = { Name = "sync-sessions" }
}

resource "aws_cloudwatch_event_target" "sync_sessions" {
  rule      = aws_cloudwatch_event_rule.sync_sessions.name
  target_id = "sync-sessions-target"
  arn       = aws_lambda_function.sync_sessions.arn
}

resource "aws_cloudwatch_event_rule" "sync_sessions_midnight" {
  name                = "sync-sessions-mid-night"
  schedule_expression = "cron(0 0 * * ? *)"
  state               = "ENABLED"
  tags                = { Name = "sync-sessions-mid-night" }
}

resource "aws_cloudwatch_event_rule" "sync_concessions" {
  name                = "sync-concessions"
  schedule_expression = "rate(1 hour)"
  state               = "ENABLED"
  tags                = { Name = "sync-concessions" }
}

# ---------- Business Logic Crons ----------
resource "aws_cloudwatch_event_rule" "cron_cancel_expired" {
  name                = "cron-cancel-expired"
  schedule_expression = "rate(5 minutes)"
  state               = "ENABLED"
  tags                = { Name = "cron-cancel-expired" }
}

resource "aws_cloudwatch_event_target" "cron_cancel_expired" {
  rule      = aws_cloudwatch_event_rule.cron_cancel_expired.name
  target_id = "cron-cancel-expired-target"
  arn       = aws_lambda_function.cron_cancel_expired.arn
}

resource "aws_cloudwatch_event_rule" "cron_reminder_order" {
  name                = "cron-reminder-order"
  schedule_expression = "rate(1 hour)"
  state               = "ENABLED"
  tags                = { Name = "cron-reminder-order" }
}

resource "aws_cloudwatch_event_target" "cron_reminder_order" {
  rule      = aws_cloudwatch_event_rule.cron_reminder_order.name
  target_id = "cron-reminder-order-target"
  arn       = aws_lambda_function.cron_reminder.arn
}

resource "aws_cloudwatch_event_rule" "cron_reminder_transaction" {
  name                = "cron-reminder-transaction"
  schedule_expression = "rate(1 hour)"
  state               = "ENABLED"
  tags                = { Name = "cron-reminder-transaction" }
}

resource "aws_cloudwatch_event_rule" "cron_check_stock" {
  name                = "cron-check-and-update-stock-status"
  schedule_expression = "rate(30 minutes)"
  state               = "ENABLED"
  tags                = { Name = "cron-check-and-update-stock-status" }
}

resource "aws_cloudwatch_event_target" "cron_check_stock" {
  rule      = aws_cloudwatch_event_rule.cron_check_stock.name
  target_id = "cron-check-stock-target"
  arn       = aws_lambda_function.cron_check_stock.arn
}

# ---------- Notification Crons ----------
resource "aws_cloudwatch_event_rule" "birthday_notification" {
  name                = "birthday-notification"
  schedule_expression = "cron(0 6 * * ? *)"
  state               = "ENABLED"
  tags                = { Name = "birthday-notification" }
}

resource "aws_cloudwatch_event_target" "birthday_notification" {
  rule      = aws_cloudwatch_event_rule.birthday_notification.name
  target_id = "birthday-notification-target"
  arn       = aws_lambda_function.birthday_notification.arn
}

resource "aws_cloudwatch_event_rule" "user_anniversary" {
  name                = "user-anniversary"
  schedule_expression = "cron(0 6 * * ? *)"
  state               = "ENABLED"
  tags                = { Name = "user-anniversary" }
}

resource "aws_cloudwatch_event_target" "user_anniversary" {
  rule      = aws_cloudwatch_event_rule.user_anniversary.name
  target_id = "user-anniversary-target"
  arn       = aws_lambda_function.user_anniversary.arn
}

resource "aws_cloudwatch_event_rule" "cron_survey_notification" {
  name                = "cron-survey-notification"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "cron-survey-notification" }
}

resource "aws_cloudwatch_event_rule" "cron_survey_email" {
  name                = "cron-survey-email-prod"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "cron-survey-email-prod" }
}

resource "aws_cloudwatch_event_target" "cron_survey_email" {
  rule      = aws_cloudwatch_event_rule.cron_survey_email.name
  target_id = "cron-survey-email-target"
  arn       = aws_lambda_function.survey_email.arn
}

resource "aws_cloudwatch_event_rule" "delete_old_notifications" {
  name                = "delete-old-notifications-event"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "delete-old-notifications-event" }
}

# ---------- Cleanup Crons (NEW) ----------
resource "aws_cloudwatch_event_rule" "clean_orders_production" {
  name                = "clean-orders-production"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "clean-orders-production" }
}

resource "aws_cloudwatch_event_rule" "clean_sessions_production" {
  name                = "clean-sessions-production"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "clean-sessions-production" }
}

resource "aws_cloudwatch_event_rule" "clean_order_fb" {
  name                = "clean-order-fb"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "clean-order-fb" }
}

resource "aws_cloudwatch_event_rule" "unpublished_old_films" {
  name                = "unpublished-old-films"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "unpublished-old-films" }
}

resource "aws_cloudwatch_event_rule" "process_expired_cashback" {
  name                = "process-expired-cashback-transaction"
  schedule_expression = "rate(1 day)"
  state               = "ENABLED"
  tags                = { Name = "process-expired-cashback-transaction" }
}

resource "aws_cloudwatch_event_rule" "terminate_pending_sync" {
  name                = "terminate-pending-sync-process"
  schedule_expression = "rate(1 hour)"
  state               = "ENABLED"
  tags                = { Name = "terminate-pending-sync-process" }
}

# ---------- Prod-to-Staging Copy Rules ----------
locals {
  prod_to_staging_services = ["muvi-gateway", "muvi-identity", "muvi-main", "muvi-notification", "muvi-payment", "muvi-website"]
}

resource "aws_cloudwatch_event_rule" "prod_to_staging" {
  for_each = toset(local.prod_to_staging_services)

  name = "CopyProdToStaging-${each.key}"
  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Action"]
    detail = {
      action-type     = ["PUSH"]
      repository-name = [each.key]
      result          = ["SUCCESS"]
    }
  })
  state = "ENABLED"
  tags  = { Name = "CopyProdToStaging-${each.key}" }
}

# ---------- AWS Managed / Inspector Rules ----------
resource "aws_cloudwatch_event_rule" "inspector_ecr" {
  name = "DO-NOT-DELETE-AmazonInspectorEcrManagedRule"
  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Action"]
  })
  state = "ENABLED"
}

resource "aws_cloudwatch_event_rule" "inspector_ec2_tag" {
  name = "DO-NOT-DELETE-AmazonInspectorEc2TagManagedRule"
  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Instance State-change Notification"]
  })
  state = "ENABLED"
}

resource "aws_cloudwatch_event_rule" "inspector_lambda" {
  name = "DO-NOT-DELETE-AmazonInspectorLambdaManagedRule"
  event_pattern = jsonencode({
    source      = ["aws.lambda"]
    detail-type = ["AWS API Call via CloudTrail"]
  })
  state = "ENABLED"
}

resource "aws_cloudwatch_event_rule" "inspector_lambda_tag" {
  name = "DO-NOT-DELETE-AmazonInspectorLambdaTagManagedRule"
  event_pattern = jsonencode({
    source      = ["aws.tag"]
    detail-type = ["Tag Change on Resource"]
  })
  state = "ENABLED"
}

resource "aws_cloudwatch_event_rule" "devops_guru" {
  name = "DevOpsGuruManagedRuleForCodeGuruProfiler-DO_NOT_DELETE"
  event_pattern = jsonencode({
    source      = ["aws.codeguru-profiler"]
    detail-type = ["CodeGuru Profiler Anomaly Detection"]
  })
  state = "ENABLED"
}

# ---------- GuardDuty → Datadog ----------
resource "aws_cloudwatch_event_rule" "guardduty_datadog" {
  name = "Guarduty-Findings-Datadog"
  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
  })
  state = "ENABLED"
  tags  = { Name = "Guarduty-Findings-Datadog" }
}

resource "aws_cloudwatch_event_target" "guardduty_datadog" {
  rule      = aws_cloudwatch_event_rule.guardduty_datadog.name
  target_id = "guardduty-datadog-target"
  arn       = aws_sns_topic.security_alarms.arn
}

# ---------- CodeStar Notifications ----------
resource "aws_cloudwatch_event_rule" "codestar_notifications" {
  name = "awscodestarnotifications-rule"
  event_pattern = jsonencode({
    source      = ["aws.codecommit", "aws.codebuild", "aws.codepipeline"]
    detail-type = ["CodeCommit Repository State Change", "CodeBuild Build State Change", "CodePipeline Pipeline Execution State Change"]
  })
  state = "ENABLED"
}

# ---------- Misc ----------
resource "aws_cloudwatch_event_rule" "hhh" {
  name                = "hhh"
  schedule_expression = "rate(1 day)"
  state               = "DISABLED"
  description         = "Test rule — disabled"
  tags                = { Name = "hhh" }
}
