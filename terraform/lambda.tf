# ============================================================
# Lambda Functions — All 32
# ============================================================

# ---------- Lambda functions managed in old TF state (15) ----------

resource "aws_lambda_function" "birthday_notification" {
  function_name = "birthday-notification-prod"
  role          = aws_iam_role.lambda["birthday-notification"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 60
  memory_size   = 512

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "birthday-notification-prod" }
}

resource "aws_lambda_function" "cron_cancel_expired" {
  function_name = "cron-cancel-expired-prod"
  role          = aws_iam_role.lambda["cron-cancel-expired"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 60
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "cron-cancel-expired-prod" }
}

resource "aws_lambda_function" "cron_check_stock" {
  function_name = "cron-check-and-update-stock-status"
  role          = aws_iam_role.lambda["cron-check-stock"].arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 63
  memory_size   = 128

  environment {
    variables = { SECRET_KEY = "placeholder" }
  }

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "cron-check-and-update-stock-status" }
}

resource "aws_lambda_function" "cron_reminder" {
  function_name = "cron-reminder-prod"
  role          = aws_iam_role.lambda["cron-reminder"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "cron-reminder-prod" }
}

resource "aws_lambda_function" "cron_survey" {
  function_name = "cron-survey-prod"
  role          = aws_iam_role.lambda["cron-survey"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 60
  memory_size   = 512

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "cron-survey-prod" }
}

resource "aws_lambda_function" "datadog" {
  function_name = "DatadogIntegration-DatadogA-DatadogAPICallFunction-2YlA33W8VbBW"
  role          = aws_iam_role.datadog_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.8"
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "datadog-integration" }
}

resource "aws_lambda_function" "lambda_to_stepfunction" {
  function_name = "Lambda_to_stepfunction"
  role          = aws_iam_role.ecs_main_grpc_scale.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 63
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "Lambda_to_stepfunction" }
}

resource "aws_lambda_function" "survey_email" {
  function_name = "survey-email-prod"
  role          = aws_iam_role.lambda["survey-email"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  environment {
    variables = { ENV = "production" }
  }

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "survey-email-prod" }
}

resource "aws_lambda_function" "sync_cinema" {
  function_name = "sync-cinema-prod"
  role          = aws_iam_role.lambda["sync-cinema"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  environment {
    variables = { END_POINT = "placeholder", ENV = "production" }
  }

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "sync-cinema-prod" }
}

resource "aws_lambda_function" "sync_concessions" {
  function_name = "sync-concessions"
  role          = aws_iam_role.lambda["sync-concessions"].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "sync-concessions" }
}

resource "aws_lambda_function" "sync_films" {
  function_name = "sync-films-prod"
  role          = aws_iam_role.lambda["sync-films"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  environment {
    variables = { END_POINT = "placeholder", ENV = "production" }
  }

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "sync-films-prod" }
}

resource "aws_lambda_function" "sync_genres" {
  function_name = "sync-genres-prod"
  role          = aws_iam_role.lambda["sync-genres"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  environment {
    variables = { END_POINT = "placeholder", ENV = "production" }
  }

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "sync-genres-prod" }
}

resource "aws_lambda_function" "sync_person" {
  function_name = "sync-person-prod"
  role          = aws_iam_role.lambda["sync-person"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  environment {
    variables = { END_POINT = "placeholder", ENV = "production" }
  }

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "sync-person-prod" }
}

resource "aws_lambda_function" "sync_sessions" {
  function_name = "sync-sessions-prod"
  role          = aws_iam_role.lambda["sync-sessions"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "sync-sessions-prod" }
}

resource "aws_lambda_function" "user_anniversary" {
  function_name = "user-anniversary-prod"
  role          = aws_iam_role.lambda["user-anniversary"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 300
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "user-anniversary-prod" }
}

# ---------- Lambda functions NOT in old TF state (17 NEW) ----------

resource "aws_lambda_function" "s3_to_blob" {
  function_name = "S3_to_Blob"
  role          = aws_iam_role.lambda["s3-to-blob"].arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 240
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "S3_to_Blob" }
}

resource "aws_lambda_function" "clear_orders_fb" {
  function_name = "clear-orders-fb"
  role          = aws_iam_role.lambda["clear-orders-fb"].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "clear-orders-fb" }
}

resource "aws_lambda_function" "clean_sessions" {
  function_name = "clean-sessions-production"
  role          = aws_iam_role.lambda["clean-sessions"].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 1024

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "clean-sessions-production" }
}

resource "aws_lambda_function" "invalidate_cache" {
  function_name = "InvalidateCache"
  role          = aws_iam_role.lambda["invalidate-cache"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 600
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "InvalidateCache" }
}

resource "aws_lambda_function" "unpublished_old_films" {
  function_name = "unpublished-old-films"
  role          = aws_iam_role.lambda["unpublished-old-films"].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "unpublished-old-films" }
}

resource "aws_lambda_function" "cron_reminder_transaction" {
  function_name = "cron-reminder-transaction"
  role          = aws_iam_role.lambda["cron-reminder-transaction"].arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 60
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "cron-reminder-transaction" }
}

resource "aws_lambda_function" "delete_old_notifications" {
  function_name = "delete-old-notifications"
  role          = aws_iam_role.lambda["delete-old-notifications"].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "delete-old-notifications" }
}

resource "aws_lambda_function" "ewallet_transactions" {
  function_name = "ewallet-transactions-export"
  role          = aws_iam_role.lambda["ewallet-transactions"].arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 900
  memory_size   = 2048

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "ewallet-transactions-export" }
}

resource "aws_lambda_function" "ecs_scale_down" {
  function_name = "ECS-main-grpc-tasks-SCALE_DOWN"
  role          = aws_iam_role.ecs_main_grpc_scale.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 63
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "ECS-main-grpc-tasks-SCALE_DOWN" }
}

resource "aws_lambda_function" "ecs_scale_up" {
  function_name = "ECS-main-grpc-tasks-SCALE_UP"
  role          = aws_iam_role.ecs_main_grpc_scale.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 63
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "ECS-main-grpc-tasks-SCALE_UP" }
}

resource "aws_lambda_function" "clean_orders_production" {
  function_name = "clean-orders-production"
  role          = aws_iam_role.lambda["clean-orders-production"].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 256

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "clean-orders-production" }
}

resource "aws_lambda_function" "rds_weekend_scale_in" {
  function_name = "RDS-WeekEnd-Scale-in"
  role          = aws_iam_role.lambda["rds-weekend-scale-in"].arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 10
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "RDS-WeekEnd-Scale-in" }
}

resource "aws_lambda_function" "rds_weekend_scale_out" {
  function_name = "RDS-WeekEnd-ScaleOut"
  role          = aws_iam_role.lambda["rds-weekend-scale-out"].arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "RDS-WeekEnd-ScaleOut" }
}

resource "aws_lambda_function" "process_expired_cashback" {
  function_name = "process-expired-cashback-transaction"
  role          = aws_iam_role.lambda["cron-reminder-transaction"].arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 120
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "process-expired-cashback-transaction" }
}

resource "aws_lambda_function" "weekend_ecs_scaling" {
  function_name = "weekend-ECSscaling"
  role          = aws_iam_role.lambda["weekend-ecs-scaling"].arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  timeout       = 15
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "weekend-ECSscaling" }
}

resource "aws_lambda_function" "terminate_pending_sync" {
  function_name = "terminate-pending-sync-process"
  role          = aws_iam_role.lambda["terminate-pending-sync"].arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "terminate-pending-sync-process" }
}

resource "aws_lambda_function" "event_test" {
  function_name = "event-test"
  role          = aws_iam_role.lambda["event-test"].arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.13"
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  lifecycle { ignore_changes = [filename, source_code_hash, layers, environment] }
  tags = { Name = "event-test" }
}

# ---------- Placeholder zip for Lambda imports ----------
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda_placeholder.zip"

  source {
    content  = "// placeholder — real code is deployed via CI/CD"
    filename = "index.js"
  }
}

# ============================================================
# Lambda Permissions (Resource-Based Policies)
# ============================================================
# These allow EventBridge, SNS, and API Gateway to invoke Lambda functions.

# ---------- EventBridge → Lambda Permissions ----------

resource "aws_lambda_permission" "eventbridge_film_sync" {
  statement_id  = "AllowEventBridgeFilmSync"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_films.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.film_sync.arn
}

resource "aws_lambda_permission" "eventbridge_person_sync" {
  statement_id  = "AllowEventBridgePersonSync"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_person.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.person_sync.arn
}

resource "aws_lambda_permission" "eventbridge_sync_cinemas" {
  statement_id  = "AllowEventBridgeSyncCinemas"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_cinema.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sync_cinemas.arn
}

resource "aws_lambda_permission" "eventbridge_sync_genres" {
  statement_id  = "AllowEventBridgeSyncGenres"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_genres.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sync_genres.arn
}

resource "aws_lambda_permission" "eventbridge_sync_sessions" {
  statement_id  = "AllowEventBridgeSyncSessions"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_sessions.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sync_sessions.arn
}

resource "aws_lambda_permission" "eventbridge_cron_cancel_expired" {
  statement_id  = "AllowEventBridgeCronCancelExpired"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_cancel_expired.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron_cancel_expired.arn
}

resource "aws_lambda_permission" "eventbridge_cron_reminder" {
  statement_id  = "AllowEventBridgeCronReminder"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_reminder.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron_reminder_order.arn
}

resource "aws_lambda_permission" "eventbridge_cron_check_stock" {
  statement_id  = "AllowEventBridgeCronCheckStock"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_check_stock.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron_check_stock.arn
}

resource "aws_lambda_permission" "eventbridge_birthday_notification" {
  statement_id  = "AllowEventBridgeBirthdayNotification"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.birthday_notification.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.birthday_notification.arn
}

resource "aws_lambda_permission" "eventbridge_user_anniversary" {
  statement_id  = "AllowEventBridgeUserAnniversary"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_anniversary.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.user_anniversary.arn
}

resource "aws_lambda_permission" "eventbridge_cron_survey_email" {
  statement_id  = "AllowEventBridgeCronSurveyEmail"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.survey_email.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron_survey_email.arn
}

resource "aws_lambda_permission" "eventbridge_clean_orders" {
  statement_id  = "AllowEventBridgeCleanOrders"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.clean_orders_production.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.clean_orders_production.arn
}

resource "aws_lambda_permission" "eventbridge_terminate_sync" {
  statement_id  = "AllowEventBridgeTerminateSync"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.terminate_pending_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.terminate_pending_sync.arn
}

# ---------- SNS → Lambda Permission ----------
resource "aws_lambda_permission" "sns_lambda_stepfunction" {
  statement_id  = "AllowSNSInvokeLambdaStepFunction"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_to_stepfunction.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.trigger_lambda_sf.arn
}

# ---------- API Gateway → Lambda Permission ----------
resource "aws_lambda_permission" "apigateway_cron_cancel_expired" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_cancel_expired.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${var.account_id}:${aws_api_gateway_rest_api.main.id}/*/GET/*"
}
