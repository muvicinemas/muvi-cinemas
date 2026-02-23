# ============================================================
# CloudFront Distributions — All 9
# ============================================================

# CloudFront OAIs
resource "aws_cloudfront_origin_access_identity" "media_prod" {
  comment = "muvi-media-prod.s3.eu-central-1.amazonaws.com"
}

resource "aws_cloudfront_origin_access_identity" "media_dr" {
  comment = "muvi-media-prod-dr.s3.eu-west-1.amazonaws.com"
}

# ---------- API CloudFront ----------
resource "aws_cloudfront_distribution" "api" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "API CloudFront distribution"
  web_acl_id      = aws_wafv2_web_acl.backend_acl.arn

  origin {
    domain_name = aws_lb.public.dns_name
    origin_id   = "api-alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-alb-origin"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_prod.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior, ordered_cache_behavior]
  }

  tags = { Name = "api-cloudfront" }
}

# ---------- Website (muvicinemas.com) ----------
resource "aws_cloudfront_distribution" "website" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Website CloudFront distribution"
  web_acl_id      = aws_wafv2_web_acl.backend_acl.arn

  origin {
    domain_name = aws_lb.website.dns_name
    origin_id   = "website-alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "website-alb-origin"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_root.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior, ordered_cache_behavior]
  }

  tags = { Name = "muvicinemas-cloudfront" }
}

# ---------- Media CDN ----------
resource "aws_cloudfront_distribution" "media" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Media CDN (images, posters, trailers)"

  origin {
    domain_name = aws_s3_bucket.buckets["muvi-media-prod"].bucket_regional_domain_name
    origin_id   = "s3-media-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai_1.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-media-origin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_prod.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior, ordered_cache_behavior]
  }

  tags = { Name = "media-cloudfront" }
}

# ---------- CMS ----------
resource "aws_cloudfront_distribution" "cms" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "CMS CloudFront distribution"

  origin {
    domain_name = aws_s3_bucket.buckets["muvi-cms-prod"].bucket_regional_domain_name
    origin_id   = "s3-cms-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai_2.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-cms-origin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_prod.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior, ordered_cache_behavior]
  }

  tags = { Name = "cms-cloudfront" }
}

# ---------- Dashboard ----------
resource "aws_cloudfront_distribution" "dashboard" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Dashboard CloudFront distribution"

  origin {
    domain_name = aws_lb.public.dns_name
    origin_id   = "dashboard-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "dashboard-origin"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_prod.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior, ordered_cache_behavior]
  }

  tags = { Name = "dashboard-cloudfront" }
}

# ---------- DR distributions ----------
resource "aws_cloudfront_distribution" "media_dr" {
  enabled = true
  comment = "Media DR CloudFront"

  origin {
    domain_name = aws_s3_bucket.buckets["muvi-media-prod-dr"].bucket_regional_domain_name
    origin_id   = "s3-media-dr-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai_1.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-media-dr-origin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior]
  }

  tags = { Name = "media-dr-cloudfront" }
}

resource "aws_cloudfront_distribution" "cms_dr" {
  enabled = true
  comment = "CMS DR CloudFront"

  origin {
    domain_name = aws_s3_bucket.buckets["muvi-cms-prod-dr"].bucket_regional_domain_name
    origin_id   = "s3-cms-dr-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai_2.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-cms-dr-origin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior]
  }

  tags = { Name = "cms-dr-cloudfront" }
}

resource "aws_cloudfront_distribution" "app_dr" {
  enabled = true
  comment = "App DR CloudFront"

  origin {
    domain_name = aws_lb.public.dns_name
    origin_id   = "app-dr-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "app-dr-origin"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior]
  }

  tags = { Name = "app-dr-cloudfront" }
}

# ---------- SparkPost / Go link (NEW — was not in old TF state) ----------
resource "aws_cloudfront_distribution" "go_muvicinemas" {
  enabled = true
  comment = "go.muvicinemas.com — SparkPost link tracking"
  aliases = ["go.muvicinemas.com"]

  origin {
    domain_name = "eu.spgo.io"
    origin_id   = "sparkpost-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "sparkpost-origin"

    forwarded_values {
      query_string = true
      headers      = ["Host"]
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_root.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin, default_cache_behavior]
  }

  tags = { Name = "go-muvicinemas-cloudfront" }
}
