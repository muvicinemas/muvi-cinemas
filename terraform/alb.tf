# ============================================================
# Application Load Balancers, Target Groups, Listeners
# ============================================================

# ==================== ALBs ====================

# ---------- Public ALB (Gateway API) ----------
resource "aws_lb" "public" {
  name               = "Muvi-Prod"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_public.id]
  subnets            = aws_subnet.public[*].id

  access_logs {
    bucket  = aws_s3_bucket.buckets["muvi-alb-accesslogs"].id
    enabled = true
  }

  tags = { Name = "Muvi-Prod" }
}

# ---------- Internal ALB (Microservices gRPC) ----------
resource "aws_lb" "internal" {
  name               = "Muvi-Microservices-Prod"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_internal.id]
  subnets            = aws_subnet.private[*].id

  access_logs {
    bucket  = aws_s3_bucket.buckets["muvi-microservices-prod-internal-alb-logs"].id
    enabled = true
  }

  tags = { Name = "Muvi-Microservices-Prod" }
}

# ---------- Website ALB ----------
resource "aws_lb" "website" {
  name               = "Muvi-Website-ALB"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_website.id]
  subnets            = aws_subnet.public[*].id

  access_logs {
    bucket  = aws_s3_bucket.buckets["muvi-microservices-load-balancer"].id
    enabled = true
  }

  tags = { Name = "Muvi-Website-ALB" }
}

# ==================== TARGET GROUPS ====================

resource "aws_lb_target_group" "gateway" {
  name        = "muvi-gateway-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.muvi.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "muvi-gateway-tg" }
}

resource "aws_lb_target_group" "website" {
  name        = "muvi-website-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.muvi.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "muvi-website-tg" }
}

resource "aws_lb_target_group" "ticket" {
  name        = "muvi-ticket-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.muvi.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "muvi-ticket-tg" }
}

# gRPC target groups (internal ALB)
locals {
  grpc_target_groups = {
    identity     = { name = "muvi-identity-tg", port = 80 }
    main         = { name = "muvi-main-grpc", port = 80 }
    payment      = { name = "muvi-payment-grpc", port = 80 }
    notification = { name = "muvi-notification-grpc", port = 80 }
    fb           = { name = "muvi-fb-grpc-tg", port = 80 }
    offer        = { name = "muvi-offer-grpc", port = 80 }
  }
}

resource "aws_lb_target_group" "grpc" {
  for_each = local.grpc_target_groups

  name        = each.value.name
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.muvi.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = each.value.name }
}

# ==================== LISTENERS ====================

# Public ALB listener (HTTPS → Gateway)
resource "aws_lb_listener" "public_https" {
  load_balancer_arn = aws_lb.public.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }
}

# Internal ALB listeners (per service port)
resource "aws_lb_listener" "internal_5001" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 5001
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc["identity"].arn
  }
}

resource "aws_lb_listener" "internal_5002" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 5002
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc["main"].arn
  }
}

resource "aws_lb_listener" "internal_5003" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 5003
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc["notification"].arn
  }
}

resource "aws_lb_listener" "internal_5004" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 5004
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc["payment"].arn
  }
}

resource "aws_lb_listener" "internal_5005" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 5005
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc["fb"].arn
  }
}

resource "aws_lb_listener" "internal_5006" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 5006
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc["offer"].arn
  }
}

# Website ALB listener
resource "aws_lb_listener" "website_https" {
  load_balancer_arn = aws_lb.website.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.website.arn
  }
}
