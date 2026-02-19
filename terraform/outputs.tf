# ============================================================
# Outputs
# ============================================================

# --- VPC ---
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "nated_subnet_ids" {
  value = aws_subnet.nated[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

# --- ALBs ---
output "alb_public_dns" {
  value = aws_lb.public.dns_name
}

output "alb_internal_dns" {
  value = aws_lb.internal.dns_name
}

output "alb_website_dns" {
  value = aws_lb.website.dns_name
}

# --- ECS ---
output "ecs_cluster_name" {
  value = aws_ecs_cluster.production.name
}

# --- RDS Endpoints ---
output "rds_main_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "rds_identity_endpoint" {
  value = aws_rds_cluster.identity.endpoint
}

output "rds_payment_endpoint" {
  value = aws_rds_cluster.payment.endpoint
}

output "rds_notification_endpoint" {
  value = aws_rds_cluster.notification.endpoint
}

output "rds_fb_endpoint" {
  value = aws_rds_cluster.fb.endpoint
}

output "rds_offer_endpoint" {
  value = aws_rds_cluster.offer.endpoint
}

# --- RDS Proxy Endpoints ---
output "rds_proxy_main_endpoint" {
  value = aws_db_proxy.proxies["main"].endpoint
}

output "rds_proxy_identity_endpoint" {
  value = aws_db_proxy.proxies["identity"].endpoint
}

output "rds_proxy_payment_endpoint" {
  value = aws_db_proxy.proxies["payment"].endpoint
}

# --- Redis ---
output "redis_gateway_endpoint" {
  value = aws_elasticache_replication_group.gateway.primary_endpoint_address
}

output "redis_main_endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

# --- CloudFront ---
output "cloudfront_api_domain" {
  value = aws_cloudfront_distribution.api.domain_name
}

output "cloudfront_website_domain" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_media_domain" {
  value = aws_cloudfront_distribution.media.domain_name
}

# --- API Gateway ---
output "api_gateway_url" {
  value = aws_api_gateway_deployment.main.invoke_url
}
