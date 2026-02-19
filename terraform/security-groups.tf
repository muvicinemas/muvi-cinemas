# ============================================================
# Security Groups
# ============================================================

# ---------- VPC Endpoints ----------
resource "aws_security_group" "vpc_endpoint" {
  name        = "vpc-endpoint-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "vpc-endpoint-sg" }
}

# ---------- ALB: Public (Gateway) ----------
resource "aws_security_group" "alb_public" {
  name        = "muvi-alb-sg"
  description = "Public ALB security group"
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "muvi-alb-sg" }
}

# ---------- ALB: Internal (Microservices) ----------
resource "aws_security_group" "alb_internal" {
  name        = "muvi-microservices-alb-sg"
  description = "Internal microservices ALB"
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port   = 5001
    to_port     = 5007
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "muvi-microservices-alb-sg" }
}

# ---------- ALB: Website ----------
resource "aws_security_group" "alb_website" {
  name        = "muvi-website-alb-sg"
  description = "Website ALB security group"
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "muvi-website-alb-sg" }
}

# ---------- ECS Services ----------
locals {
  ecs_service_sg = {
    gateway      = { name = "muvi-gateway-ecs-sg", description = "Gateway ECS" }
    identity     = { name = "muvi-identity-ecs-sg", description = "Identity ECS" }
    main         = { name = "muvi-main-ecs-sg", description = "Main ECS" }
    payment      = { name = "muvi-payments-ecs-sg", description = "Payment ECS" }
    notification = { name = "muvi-notification-ecs-sg", description = "Notification ECS" }
    fb           = { name = "muvi-fb-ecs-sg", description = "F&B ECS" }
    offer        = { name = "muvi-offer-ecs-sg", description = "Offer ECS" }
    website      = { name = "muvi-website-sg", description = "Website ECS" }
    ticket       = { name = "muvi-ticket-sg", description = "Ticket ECS" }
  }
}

resource "aws_security_group" "ecs" {
  for_each = local.ecs_service_sg

  name        = each.value.name
  description = each.value.description
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_public.id, aws_security_group.alb_internal.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = each.value.name }
}

# ---------- RDS ----------
locals {
  rds_sg = {
    main         = { name = "muvi-rds-sg", description = "Main RDS" }
    identity     = { name = "muvi-identity-prod-rds-sg", description = "Identity RDS" }
    notification = { name = "muvi-notification-prod-rds-sg", description = "Notification RDS" }
    payment      = { name = "muvi-prod-payment-service-rds-sg", description = "Payment RDS" }
    fb           = { name = "muvi-prod-fb-rds-sg", description = "F&B RDS" }
    offer        = { name = "muvi-prod-offer-rds-sg", description = "Offer RDS" }
  }
}

resource "aws_security_group" "rds" {
  for_each = local.rds_sg

  name        = each.value.name
  description = each.value.description
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = each.value.name }
}

# ---------- Redis ----------
locals {
  redis_sg = {
    gateway      = { name = "muvi-redis-sg", description = "Redis shared SG" }
    fb           = { name = "fb-redis-sg", description = "F&B Redis" }
    notification = { name = "muvi-redis-notification-sg", description = "Notification Redis" }
    offer        = { name = "offer-redis-sg", description = "Offer Redis" }
    shared       = { name = "redis-shared-sg", description = "Shared Redis" }
  }
}

resource "aws_security_group" "redis" {
  for_each = local.redis_sg

  name        = each.value.name
  description = each.value.description
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = each.value.name }
}

# ---------- RDS Proxy ----------
locals {
  proxy_sg = {
    main         = { name = "proxy-main-sg", description = "Main RDS Proxy" }
    identity     = { name = "proxy-identity-sg", description = "Identity RDS Proxy" }
    notification = { name = "proxy-notification-sg", description = "Notification RDS Proxy" }
    payment      = { name = "proxy-payment-sg", description = "Payment RDS Proxy" }
    fb           = { name = "proxy-fb-sg", description = "F&B RDS Proxy" }
    offer        = { name = "proxy-offer-sg", description = "Offer RDS Proxy" }
  }
}

resource "aws_security_group" "proxy" {
  for_each = local.proxy_sg

  name        = each.value.name
  description = each.value.description
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = each.value.name }
}

# ---------- Jumpbox ----------
resource "aws_security_group" "jumpbox" {
  name        = "jumpbox-sg"
  description = "Jumpbox / bastion host"
  vpc_id      = aws_vpc.muvi.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "jumpbox-sg" }
}

# ---------- CodeBuild ----------
resource "aws_security_group" "db_migration" {
  name        = "db-migration-sg"
  description = "DB migration CodeBuild"
  vpc_id      = aws_vpc.muvi.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "db-migration-sg" }
}

resource "aws_security_group" "db_preparation" {
  name        = "db-preparation-sg"
  description = "DB preparation CodeBuild"
  vpc_id      = aws_vpc.muvi.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "db-preparation-sg" }
}

resource "aws_security_group" "launch_wizard_1" {
  name        = "launch-wizard-1"
  description = "launch-wizard-1 created for temp use"
  vpc_id      = aws_vpc.muvi.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "launch-wizard-1" }
}
