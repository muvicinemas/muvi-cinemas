# ============================================================
# ElastiCache Redis — 9 Replication Groups
# ============================================================

# ---------- Subnet Groups ----------
resource "aws_elasticache_subnet_group" "main" {
  name       = "muvi-redis-sg"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_subnet_group" "secondary" {
  name       = "afs-prod-sg"
  subnet_ids = aws_subnet.private[*].id
}

# ---------- Parameter Groups ----------
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "muvi-prod-redis-pg"
  family = "redis7"
}

resource "aws_elasticache_parameter_group" "redis7_secondary" {
  name   = "muvi-redis-pg"
  family = "redis7"
}

# ---------- Replication Groups ----------

# Gateway Redis
resource "aws_elasticache_replication_group" "gateway" {
  replication_group_id = "foms-redis-prod-getway"
  description          = "Gateway Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["gateway"].id]
  engine_version       = "7.0"
  port                 = 6379

  tags = { Name = "foms-redis-prod-getway" }
}

# Identity Redis
resource "aws_elasticache_replication_group" "identity" {
  replication_group_id = "foms-redis-prod-identity"
  description          = "Identity Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["gateway"].id]
  engine_version       = "7.0"
  port                 = 6379

  tags = { Name = "foms-redis-prod-identity" }
}

# Main Redis (r5.large — heavier workload)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "foms-redis-prod-main"
  description          = "Main Redis cluster"
  node_type            = "cache.r5.large"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["gateway"].id]
  engine_version       = "7.0"
  port                 = 6379

  tags = { Name = "foms-redis-prod-main" }
}

# Payment Redis
resource "aws_elasticache_replication_group" "payment" {
  replication_group_id = "foms-redis-prod-paymnet"
  description          = "Payment Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["gateway"].id]
  engine_version       = "7.0"
  port                 = 6379

  tags = { Name = "foms-redis-prod-paymnet" }
}

# Notification Redis (r5.xlarge — heavy)
resource "aws_elasticache_replication_group" "notification" {
  replication_group_id = "foms-redis-prod-notification"
  description          = "Notification Redis cluster"
  node_type            = "cache.r5.xlarge"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["notification"].id]
  engine_version       = "7.0"
  port                 = 6379

  tags = { Name = "foms-redis-prod-notification" }
}

# F&B Redis
resource "aws_elasticache_replication_group" "fb" {
  replication_group_id = "foms-redis-prod-fb"
  description          = "F&B Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["fb"].id]
  engine_version       = "7.1"
  port                 = 6379

  tags = { Name = "foms-redis-prod-fb" }
}

# Offer Redis
resource "aws_elasticache_replication_group" "offer" {
  replication_group_id = "foms-redis-prod-offer"
  description          = "Offer Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["offer"].id]
  engine_version       = "7.1"
  port                 = 6379

  tags = { Name = "foms-redis-prod-offer" }
}

# Shared Redis
resource "aws_elasticache_replication_group" "shared" {
  replication_group_id = "foms-redis-prod-shared"
  description          = "Shared Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["shared"].id]
  engine_version       = "7.0"
  port                 = 6379

  tags = { Name = "foms-redis-prod-shared" }
}

# Bulk Refund/Booking Redis (NEW — was not in old TF state)
resource "aws_elasticache_replication_group" "bulk_refund" {
  replication_group_id = "foms-redis-prod-bulk-refund-booking"
  description          = "Bulk refund/booking Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis["gateway"].id]
  engine_version       = "7.1"
  port                 = 6379

  tags = { Name = "foms-redis-prod-bulk-refund-booking" }
}
