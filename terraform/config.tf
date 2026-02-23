# ============================================================
# AWS Config — Configuration Recorder & Delivery Channel
# ============================================================

resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "default"
  s3_bucket_name = aws_s3_bucket.buckets["config-bucket-011566070219"].id

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

# ---------- IAM Role for Config ----------
resource "aws_iam_role" "config" {
  name = "aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  # This is likely a service-linked role — import rather than create
  lifecycle {
    ignore_changes = [assume_role_policy, name, path]
  }
}

resource "aws_iam_role_policy_attachment" "config_service" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/aws-service-role/AWSConfigServiceRolePolicy"
}
