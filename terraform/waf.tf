# ============================================================
# WAF Web ACLs (NEW — not in old TF state)
# ============================================================

# ---------- OTP-ACL (Regional — API Gateway) ----------
resource "aws_wafv2_web_acl" "otp_acl" {
  name        = "OTP-ACL"
  description = "Rate limiting for OTP endpoints"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "OTP-ACL"
    sampled_requests_enabled   = true
  }

  # Rules are imported from live config — lifecycle prevents drift
  lifecycle {
    ignore_changes = [rule]
  }

  tags = { Name = "OTP-ACL" }
}

# ---------- Backend-ACL (CloudFront-scoped, us-east-1) ----------
resource "aws_wafv2_web_acl" "backend_acl" {
  provider    = aws.us_east_1
  name        = "Backend-ACL"
  description = "WAF for CloudFront distributions"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "Backend-ACL"
    sampled_requests_enabled   = true
  }

  lifecycle {
    ignore_changes = [rule]
  }

  tags = { Name = "Backend-ACL" }
}
