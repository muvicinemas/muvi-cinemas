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

# ==================== BUCKET POLICIES ====================

# muvi-media-prod — Public read access (used by CloudFront/CDN)
resource "aws_s3_bucket_policy" "media_public" {
  bucket = aws_s3_bucket.buckets["muvi-media-prod"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "S3PublicAccess"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.buckets["muvi-media-prod"].arn}/*"
    }]
  })
}

# muvi-cms-prod — Public read + GetBucketCORS access
resource "aws_s3_bucket_policy" "cms_public" {
  bucket = aws_s3_bucket.buckets["muvi-cms-prod"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "Statement1"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.buckets["muvi-cms-prod"].arn}/*"
      },
      {
        Sid       = "Stmt1652362285864"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetBucketCORS"
        Resource  = aws_s3_bucket.buckets["muvi-cms-prod"].arn
      }
    ]
  })
}

# ==================== CORS ====================

# muvi-media-prod CORS — Allow GET/HEAD from all origins
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.buckets["muvi-media-prod"].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
  }
}

# ==================== S3 REPLICATION ====================

# Media bucket → DR bucket (eu-west-1 Ireland)
resource "aws_s3_bucket_replication_configuration" "media_dr" {
  bucket = aws_s3_bucket.buckets["muvi-media-prod"].id
  role   = aws_iam_role.s3crr_media.arn

  rule {
    id     = "Media-DR-Replication"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.buckets["muvi-media-prod-dr"].arn
    }

    delete_marker_replication {
      status = "Disabled"
    }
  }

  depends_on = [aws_s3_bucket_versioning.media]
}

# CMS bucket → DR bucket (eu-west-1 Ireland)
resource "aws_s3_bucket_replication_configuration" "cms_dr" {
  bucket = aws_s3_bucket.buckets["muvi-cms-prod"].id
  role   = aws_iam_role.s3crr_cms.arn

  rule {
    id     = "DR-Replication"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.buckets["muvi-cms-prod-dr"].arn
    }

    delete_marker_replication {
      status = "Disabled"
    }
  }

  depends_on = [aws_s3_bucket_versioning.cms]
}
