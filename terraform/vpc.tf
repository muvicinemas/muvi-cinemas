# ============================================================
# VPC, Subnets, Route Tables, Gateways, NACLs
# ============================================================

# ---------- VPC ----------
resource "aws_vpc" "muvi" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "Muvi-VPC" }
}

# ---------- DHCP Options ----------
resource "aws_vpc_dhcp_options" "main" {
  domain_name         = "eu-central-1.compute.internal"
  domain_name_servers = ["AmazonProvidedDNS"]
  tags                = { Name = "Muvi-DHCP" }
}

resource "aws_vpc_dhcp_options_association" "main" {
  vpc_id          = aws_vpc.muvi.id
  dhcp_options_id = aws_vpc_dhcp_options.main.id
}

# ---------- Internet Gateway ----------
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.muvi.id
  tags   = { Name = "Muvi-IGW" }
}

# ---------- Elastic IP for NAT ----------
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "Muvi-NAT-EIP" }
}

# ---------- NAT Gateway ----------
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "Muvi-NAT-GW" }
  depends_on    = [aws_internet_gateway.main]
}

# ==================== SUBNETS ====================

# ---------- Public Subnets (3) ----------
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.muvi.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "Public-${substr(var.azs[count.index], -1, 1)}" }
}

# ---------- NAT'd Subnets (3) — ECS services run here ----------
resource "aws_subnet" "nated" {
  count             = 3
  vpc_id            = aws_vpc.muvi.id
  cidr_block        = var.nated_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "Nated-${substr(var.azs[count.index], -1, 1)}" }
}

# ---------- Private Subnets (3) — RDS, Redis ----------
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.muvi.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "Private-${substr(var.azs[count.index], -1, 1)}" }
}

# ==================== ROUTE TABLES ====================

resource "aws_route_table" "main" {
  vpc_id = aws_vpc.muvi.id
  tags   = { Name = "Main-RT" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.muvi.id
  tags   = { Name = "Public-RT" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table" "nated" {
  vpc_id = aws_vpc.muvi.id
  tags   = { Name = "Nated-RT" }
}

resource "aws_route" "nated_nat" {
  route_table_id         = aws_route_table.nated.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.muvi.id
  tags   = { Name = "Private-RT" }
}

# ---------- Route Table Associations ----------
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "nated" {
  count          = 3
  subnet_id      = aws_subnet.nated[count.index].id
  route_table_id = aws_route_table.nated.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ==================== NACLs ====================

resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.muvi.id
  subnet_ids = aws_subnet.public[*].id
  tags       = { Name = "Public-NACL" }
}

resource "aws_network_acl_rule" "public_ingress_allow_all" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = false
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
}

resource "aws_network_acl_rule" "public_egress_allow_all" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = true
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
}

resource "aws_network_acl" "nated" {
  vpc_id     = aws_vpc.muvi.id
  subnet_ids = aws_subnet.nated[*].id
  tags       = { Name = "Nated-NACL" }
}

resource "aws_network_acl_rule" "nated_ingress_allow_all" {
  network_acl_id = aws_network_acl.nated.id
  rule_number    = 100
  egress         = false
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
}

resource "aws_network_acl_rule" "nated_egress_allow_all" {
  network_acl_id = aws_network_acl.nated.id
  rule_number    = 100
  egress         = true
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
}

resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.muvi.id
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "Private-NACL" }
}

resource "aws_network_acl_rule" "private_egress_allow_all" {
  network_acl_id = aws_network_acl.private.id
  rule_number    = 100
  egress         = true
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
}

# ==================== VPC PEERING ====================

# Cross-account peering with account 739991759290 (Bespin/previous vendor)
# Requester VPC: vpc-04056649658133bf4 (10.241.0.0/16) in account 739991759290
# Accepter VPC: vpc-078c1286f49e3383e (10.230.0.0/16) in this account
resource "aws_vpc_peering_connection_accepter" "cross_account" {
  vpc_peering_connection_id = "pcx-0940f66b46dc58225"
  auto_accept               = true

  tags = { Name = "CrossAccount-739991759290-Peering" }

  lifecycle {
    ignore_changes = [vpc_peering_connection_id]
  }
}

# ==================== VPC ENDPOINTS ====================

resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id       = aws_vpc.muvi.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [
    aws_route_table.public.id,
    aws_route_table.nated.id,
    aws_route_table.private.id,
  ]
  tags = { Name = "S3-Gateway-Endpoint" }
}

resource "aws_vpc_endpoint" "s3_interface" {
  vpc_id              = aws_vpc.muvi.id
  service_name        = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoint.id]
  private_dns_enabled = false
  tags                = { Name = "S3-Interface-Endpoint" }
}

locals {
  interface_endpoints = {
    "ecr-api"           = "com.amazonaws.${var.aws_region}.ecr.api"
    "ecr-dkr"           = "com.amazonaws.${var.aws_region}.ecr.dkr"
    "ecs"               = "com.amazonaws.${var.aws_region}.ecs"
    "ecs-agent"         = "com.amazonaws.${var.aws_region}.ecs-agent"
    "ecs-telemetry"     = "com.amazonaws.${var.aws_region}.ecs-telemetry"
    "logs"              = "com.amazonaws.${var.aws_region}.logs"
    "ssm"               = "com.amazonaws.${var.aws_region}.ssm"
    "secretsmanager"    = "com.amazonaws.${var.aws_region}.secretsmanager"
    "monitoring"        = "com.amazonaws.${var.aws_region}.monitoring"
    "kms"               = "com.amazonaws.${var.aws_region}.kms"
    "autoscaling"       = "com.amazonaws.${var.aws_region}.application-autoscaling"
    "s3-global"         = "com.amazonaws.s3-global.accesspoint"
  }
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.muvi.id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoint.id]
  private_dns_enabled = true

  tags = { Name = "${each.key}-vpc-endpoint" }
}
