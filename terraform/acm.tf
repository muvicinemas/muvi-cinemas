# ============================================================
# ACM Certificates (NEW — only 1 was in old TF state)
# ============================================================

# Frankfurt — internal microservices cert
resource "aws_acm_certificate" "internal" {
  domain_name       = "prod.microservices.internal"
  validation_method = "DNS"

  tags = { Name = "microservices-internal-cert" }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [domain_name]
  }
}

# us-east-1 — CloudFront wildcard cert (*.prod.muvicinemas.com)
resource "aws_acm_certificate" "cloudfront_prod" {
  provider    = aws.us_east_1
  domain_name = "*.prod.muvicinemas.com"
  validation_method = "DNS"

  tags = { Name = "cloudfront-prod-wildcard" }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [domain_name]
  }
}

# us-east-1 — CloudFront wildcard cert (*.muvicinemas.com)
resource "aws_acm_certificate" "cloudfront_root" {
  provider    = aws.us_east_1
  domain_name = "*.muvicinemas.com"
  validation_method = "DNS"

  tags = { Name = "cloudfront-root-wildcard" }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [domain_name]
  }
}
