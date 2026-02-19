# ============================================================
# S3 Buckets — All 38
# ============================================================

locals {
  s3_buckets = toset([
    # --- In old TF state (23) ---
    "aws-cloudtrail-logs-011566070219-95d0077e",
    "awsdatasecurityscanlogs",
    "config-bucket-011566070219",
    "gitlab-gateway-muvi",
    "gitlab-identity-muvi",
    "gitlab-main-muvi",
    "gitlab-muvi-cms",
    "gitlab-muvi-fb",
    "gitlab-muvi-gateway",
    "gitlab-muvi-identity",
    "gitlab-muvi-notification",
    "gitlab-muvi-payment",
    "gitlab-website-muvi",
    "muvi-alb-accesslogs",
    "muvi-cms-prod",
    "muvi-datadog-archives",
    "muvi-media-prod",
    "muvi-menu-public",
    "muvi-microservices-load-balancer",
    "muvi-microservices-prod-internal-alb-logs",
    "muvi-prd-inspector-va-scan",
    "muvi-replication-completion-reports",
    "securityaccesslogs-muvi-prod",
    # --- NEW: Not in old TF state (15) ---
    "alpha-zero-store",
    "aws-athena-query-results-eu-central-1-011566070219",
    "aws-waf-logs-backend-acl",
    "aws-waf-logs-otp-acl",
    "bluepi-billing-cur2-7-011566070219-1757941014312",
    "cf-templates-1evx9rkccyvvq-eu-central-1",
    "cf-templates-1evx9rkccyvvq-eu-west-1",
    "codepipeline-eu-central-1-288456816626",
    "muvi-athena",
    "muvi-cms-prod-dr",
    "muvi-media-prod-dr",
    "terraform-statefile-muvi",
    "tf-state-file-bkt",
    "waf-backend-acl-logs",
  ])

  # Bahrain region bucket — exists outside primary region
  s3_buckets_bahrain = toset([
    "cf-templates--9nyo4zgvsgwj-me-south-1",
  ])
}

resource "aws_s3_bucket" "buckets" {
  for_each = local.s3_buckets
  bucket   = each.key
  tags     = { Name = each.key }

  lifecycle {
    # Prevent accidental deletion of production data
    prevent_destroy = true
  }
}

# Versioning for key buckets
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.buckets["muvi-media-prod"].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "terraform" {
  bucket = aws_s3_bucket.buckets["terraform-statefile-muvi"].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "cms" {
  bucket = aws_s3_bucket.buckets["muvi-cms-prod"].id
  versioning_configuration { status = "Enabled" }
}

# Server-side encryption for all buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "all" {
  for_each = local.s3_buckets
  bucket   = aws_s3_bucket.buckets[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access on security-sensitive buckets
resource "aws_s3_bucket_public_access_block" "secure" {
  for_each = toset([
    "aws-cloudtrail-logs-011566070219-95d0077e",
    "securityaccesslogs-muvi-prod",
    "terraform-statefile-muvi",
    "config-bucket-011566070219",
    "muvi-datadog-archives",
    "muvi-prd-inspector-va-scan",
  ])

  bucket = aws_s3_bucket.buckets[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
