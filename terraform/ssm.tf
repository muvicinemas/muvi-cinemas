# ============================================================
# SSM Parameters (NEW — not in old TF state)
# All 57 parameters under /production/
# ============================================================

locals {
  ssm_parameters = {
    # --- Database Config ---
    "DB_AUTO_LOAD_MODELS" = { type = "String", description = "Auto-load Sequelize models" }
    "DB_SYNC"             = { type = "String", description = "Database sync mode" }
    "DB_UNDERSCORED"      = { type = "String", description = "Use underscored naming" }
    "DB_FORCE"            = { type = "String", description = "Force sync" }
    "DB_LOGGING"          = { type = "String", description = "DB logging enabled" }
    "DB_PORT"             = { type = "String", description = "Database port" }

    # --- Service Hosts/Ports ---
    "IDENTITY_SERVICE_HOST"     = { type = "String", description = "Identity service host" }
    "IDENTITY_SERVICE_PORT"     = { type = "String", description = "Identity service port" }
    "MAIN_SERVICE_HOST"         = { type = "String", description = "Main service host" }
    "MAIN_SERVICE_PORT"         = { type = "String", description = "Main service port" }
    "PAYMENT_SERVICE_HOST"      = { type = "String", description = "Payment service host" }
    "PAYMENT_SERVICE_PORT"      = { type = "String", description = "Payment service port" }
    "NOTIFICATION_SERVICE_HOST" = { type = "String", description = "Notification service host" }
    "NOTIFICATION_SERVICE_PORT" = { type = "String", description = "Notification service port" }
    "FB_SERVICE_HOST"           = { type = "String", description = "F&B service host" }
    "FB_SERVICE_PORT"           = { type = "String", description = "F&B service port" }

    # --- Redis ---
    "REDIS_PORT" = { type = "String", description = "Redis port" }
    "REDIS_TTL"  = { type = "String", description = "Redis TTL" }

    # --- Email ---
    "EMAIL_PROVIDER_API_KEY" = { type = "SecureString", description = "Email provider API key" }
    "EMAIL_PROVIDER_API_URL" = { type = "String", description = "Email provider API URL" }
    "EMAIL_SENDER_NAME"      = { type = "String", description = "Email sender display name" }
    "SENDGRID_API_KEY"       = { type = "SecureString", description = "SendGrid API key" }

    # --- Unifonic (SMS/OTP) ---
    "UNIFONIC_ANDROID_APP_ID"     = { type = "String", description = "Unifonic Android app ID" }
    "UNIFONIC_ANDROID_AUTH_TOKEN" = { type = "SecureString", description = "Unifonic Android auth token" }
    "UNIFONIC_APP_ID"             = { type = "String", description = "Unifonic app ID" }
    "UNIFONIC_AUTH_TOKEN"         = { type = "SecureString", description = "Unifonic auth token" }
    "UNIFONIC_CHANNEL"            = { type = "String", description = "Unifonic channel" }
    "UNIFONIC_LENGTH"             = { type = "String", description = "OTP length" }
    "UNIFONIC_URL"                = { type = "String", description = "Unifonic API URL" }

    # --- Vista Entertainment ---
    "VISTA_ANDROID_CLIENT_ID"   = { type = "String", description = "Vista Android client ID" }
    "VISTA_ANDROID_TOKEN"       = { type = "SecureString", description = "Vista Android token" }
    "VISTA_BASE_URL"            = { type = "String", description = "Vista API base URL" }
    "VISTA_CLUB_ID"             = { type = "String", description = "Vista club ID" }
    "VISTA_HUAWEI_CLIENT_ID"    = { type = "String", description = "Vista Huawei client ID" }
    "VISTA_HUAWEI_TOKEN"        = { type = "SecureString", description = "Vista Huawei token" }
    "VISTA_IOS_CLIENT_ID"       = { type = "String", description = "Vista iOS client ID" }
    "VISTA_IOS_TOKEN"           = { type = "SecureString", description = "Vista iOS token" }
    "VISTA_KIOSK_TOKEN"         = { type = "SecureString", description = "Vista Kiosk token" }
    "VISTA_REJECT_UNAUTHORIZED" = { type = "String", description = "Vista TLS reject unauthorized" }
    "VISTA_WEBSITE_CLIENT_ID"   = { type = "String", description = "Vista website client ID" }
    "VISTA_WEBSITE_TOKEN"       = { type = "SecureString", description = "Vista website token" }

    # --- S3 ---
    "S3_ACCESS_KEY_ID"     = { type = "SecureString", description = "S3 access key ID" }
    "S3_BUCKET"            = { type = "String", description = "S3 bucket name" }
    "S3_REGION"            = { type = "String", description = "S3 region" }
    "S3_SECRET_ACCESS_KEY" = { type = "SecureString", description = "S3 secret access key" }

    # --- Datadog ---
    "DATADOG_API_KEY"        = { type = "SecureString", description = "Datadog API key" }
    "DATADOG_BATCH"          = { type = "String", description = "Datadog batch mode" }
    "DATADOG_BATCH_COUNT"    = { type = "String", description = "Datadog batch count" }
    "DATADOG_BATCH_INTERVAL" = { type = "String", description = "Datadog batch interval" }
    "DATADOG_HOST"           = { type = "String", description = "Datadog host" }
    "DATADOG_PATH"           = { type = "String", description = "Datadog path" }
    "DATADOG_SSL"            = { type = "String", description = "Datadog SSL enabled" }

    # --- Misc ---
    "FRESHDESK_API_KEY"  = { type = "SecureString", description = "Freshdesk API key" }
    "FRESHDESK_BASE_URL" = { type = "String", description = "Freshdesk base URL" }
    "SENTRY_DSN"         = { type = "SecureString", description = "Sentry DSN" }
    "SUPER_ADMIN_EMAIL"  = { type = "String", description = "Super admin email" }
    "WEBSITE_BASE_URL"   = { type = "String", description = "Website base URL" }
  }
}

resource "aws_ssm_parameter" "production" {
  for_each = local.ssm_parameters

  name        = "/production/${each.key}"
  type        = each.value.type
  value       = "placeholder" # Real values will be preserved on import
  description = each.value.description

  lifecycle {
    # Values are managed operationally, not via Terraform
    ignore_changes = [value]
  }

  tags = { Name = each.key }
}
