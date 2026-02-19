# ============================================================
# CloudTrail — 3 Trails
# ============================================================

# ---------- Management Events Trail ----------
resource "aws_cloudtrail" "management_events" {
  name                          = "management-events"
  s3_bucket_name                = "aws-cloudtrail-logs-011566070219-95d0077e"
  is_multi_region_trail         = true
  is_organization_trail         = false
  enable_logging                = true
  include_global_service_events = true

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail_management.arn}:*"
  cloud_watch_logs_role_arn  = "arn:aws:iam::011566070219:role/service-role/cloudtrail-log-role"
  kms_key_id                = "arn:aws:kms:eu-central-1:011566070219:key/cd00b0cc-fa83-43f3-8174-2d5c037c96ad"

  lifecycle {
    ignore_changes = [event_selector]
  }

  tags = { Name = "management-events" }
}

# ---------- CodePipeline Source Trail ----------
resource "aws_cloudtrail" "codepipeline_source" {
  name                          = "codepipeline-source-trail"
  s3_bucket_name                = "codepipeline-cloudtrail-placeholder-bucket-eu-central-1"
  s3_key_prefix                 = "cloud-trail-011566070219-e27a38c4-5998-4164-bb17-0910cb03ff5a"
  is_multi_region_trail         = false
  is_organization_trail         = false
  enable_logging                = true
  include_global_service_events = false

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail_codepipeline.arn}:*"
  cloud_watch_logs_role_arn  = "arn:aws:iam::011566070219:role/service-role/CloudtrailRole"

  event_selector {
    read_write_type           = "WriteOnly"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  lifecycle {
    ignore_changes = [event_selector]
  }

  tags = { Name = "codepipeline-source-trail" }
}

# ---------- Data Security Scan Trail ----------
resource "aws_cloudtrail" "data_security_scan" {
  name                          = "AWS_DataSecurity_Scan"
  s3_bucket_name                = "awsdatasecurityscanlogs"
  is_multi_region_trail         = true
  is_organization_trail         = false
  enable_logging                = true
  include_global_service_events = true

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail_datascan.arn}:*"
  cloud_watch_logs_role_arn  = "arn:aws:iam::011566070219:role/service-role/aws-cloudtrail-logs-011566070219-ae25d834"

  lifecycle {
    ignore_changes = [event_selector]
  }

  tags = { Name = "AWS_DataSecurity_Scan" }
}
