# ============================================================
# ECS Cluster, Services, Task Definitions, Autoscaling
# ============================================================

# ---------- Cluster ----------
resource "aws_ecs_cluster" "production" {
  name = "Muvi-Production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { App = "Muvi" }
}

# ---------- Task Definitions ----------
# Task definitions are deployed by CodePipeline. These are placeholders
# that will be imported with their current revisions.
# lifecycle.ignore_changes prevents Terraform from reverting deployments.

locals {
  ecs_tasks = {
    gateway = {
      family = "muvi-gateway"
      cpu    = 512
      memory = 1024
      port   = 3001
    }
    identity = {
      family = "muvi-identity"
      cpu    = 512
      memory = 1024
      port   = 5005
    }
    main = {
      family = "muvi-main"
      cpu    = 1024
      memory = 2048
      port   = 5002
    }
    payment = {
      family = "muvi-payment"
      cpu    = 512
      memory = 1024
      port   = 5004
    }
    notification = {
      family = "muvi-notification"
      cpu    = 512
      memory = 1024
      port   = 5003
    }
    fb = {
      family = "muvi-fb"
      cpu    = 512
      memory = 1024
      port   = 5006
    }
    offer = {
      family = "muvi-offer"
      cpu    = 512
      memory = 1024
      port   = 5007
    }
    website = {
      family = "muvi-website"
      cpu    = 512
      memory = 1024
      port   = 3000
    }
    ticket = {
      family = "muvi-ticket"
      cpu    = 512
      memory = 1024
      port   = 3000
    }
  }
}

resource "aws_ecs_task_definition" "services" {
  for_each = local.ecs_tasks

  family                   = each.value.family
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name      = each.value.family
    image     = "${var.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${each.value.family}:latest"
    essential = true
    portMappings = [{
      containerPort = each.value.port
      hostPort      = each.value.port
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${each.value.family}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  lifecycle {
    # CodePipeline manages container_definitions — don't revert deployments
    ignore_changes = [container_definitions]
  }

  tags = { Name = each.value.family }
}

# ---------- Services ----------
locals {
  ecs_services = {
    gateway = {
      name           = "gateway"
      task_family    = "gateway"
      desired_count  = 7
      container_name = "muvi-gateway"
      container_port = 3001
      target_group   = "gateway"
      sg_key         = "gateway"
    }
    identity = {
      name           = "identity-grpc"
      task_family    = "identity"
      desired_count  = 7
      container_name = "muvi-identity"
      container_port = 5005
      target_group   = "identity"
      sg_key         = "identity"
    }
    main = {
      name           = "main-grpc"
      task_family    = "main"
      desired_count  = 7
      container_name = "muvi-main"
      container_port = 5002
      target_group   = "main"
      sg_key         = "main"
    }
    payment = {
      name           = "payment-grpc"
      task_family    = "payment"
      desired_count  = 3
      container_name = "muvi-payment"
      container_port = 5004
      target_group   = "payment"
      sg_key         = "payment"
    }
    notification = {
      name           = "notification-grpc"
      task_family    = "notification"
      desired_count  = 2
      container_name = "muvi-notification"
      container_port = 5003
      target_group   = "notification"
      sg_key         = "notification"
    }
    fb = {
      name           = "fb-muvi"
      task_family    = "fb"
      desired_count  = 3
      container_name = "muvi-fb"
      container_port = 5006
      target_group   = "fb"
      sg_key         = "fb"
    }
    offer = {
      name           = "offer-muvi"
      task_family    = "offer"
      desired_count  = 3
      container_name = "muvi-offer"
      container_port = 5007
      target_group   = "offer"
      sg_key         = "offer"
    }
    website = {
      name           = "website"
      task_family    = "website"
      desired_count  = 5
      container_name = "muvi-website"
      container_port = 3000
      target_group   = "website_direct"
      sg_key         = "website"
    }
    ticket = {
      name           = "ticket"
      task_family    = "ticket"
      desired_count  = 2
      container_name = "muvi-ticket"
      container_port = 3000
      target_group   = null # Ticket has no ALB
      sg_key         = "ticket"
    }
  }
}

resource "aws_ecs_service" "services" {
  for_each = local.ecs_services

  name            = each.value.name
  cluster         = aws_ecs_cluster.production.id
  task_definition = aws_ecs_task_definition.services[each.value.task_family].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.nated[*].id
    security_groups  = [aws_security_group.ecs[each.value.sg_key].id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = each.value.target_group != null ? [1] : []
    content {
      target_group_arn = (
        each.value.target_group == "gateway" ? aws_lb_target_group.gateway.arn :
        each.value.target_group == "website_direct" ? aws_lb_target_group.website.arn :
        each.value.target_group == "ticket" ? aws_lb_target_group.ticket.arn :
        aws_lb_target_group.grpc[each.value.target_group].arn
      )
      container_name = each.value.container_name
      container_port = each.value.container_port
    }
  }

  lifecycle {
    # Task definition changes come from CodePipeline, desired_count from autoscaling
    ignore_changes = [task_definition, desired_count]
  }

  tags = { Name = each.value.name }
}

# ==================== AUTOSCALING ====================

locals {
  autoscaling_services = {
    gateway      = { min = 2, max = 15 }
    identity     = { min = 2, max = 15 }
    main         = { min = 2, max = 15 }
    payment      = { min = 2, max = 10 }
    notification = { min = 1, max = 8 }
    fb           = { min = 1, max = 10 }
    offer        = { min = 1, max = 10 }
    website      = { min = 2, max = 15 }
    ticket       = { min = 1, max = 5 }
  }
}

resource "aws_appautoscaling_target" "ecs" {
  for_each = local.autoscaling_services

  max_capacity       = each.value.max
  min_capacity       = each.value.min
  resource_id        = "service/${aws_ecs_cluster.production.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  for_each = local.autoscaling_services

  name               = "ecs-${each.key}-cpu-utilization-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_policy" "ecs_memory" {
  for_each = local.autoscaling_services

  name               = "ecs-${each.key}-memory-utilization-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_policy" "ecs_request_count" {
  for_each = {
    for k, v in local.autoscaling_services : k => v
    if k != "ticket" # Ticket has no ALB
  }

  name               = "ecs-${each.key}-request-count-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label = (
        each.key == "gateway" ? "${aws_lb.public.arn_suffix}/${aws_lb_target_group.gateway.arn_suffix}" :
        each.key == "website" ? "${aws_lb.website.arn_suffix}/${aws_lb_target_group.website.arn_suffix}" :
        "${aws_lb.internal.arn_suffix}/${aws_lb_target_group.grpc[each.key].arn_suffix}"
      )
    }
    target_value = 1000.0
  }
}

# ---------- RDS Autoscaling ----------
locals {
  rds_autoscaling = {
    identity     = aws_rds_cluster.identity.cluster_identifier
    main         = aws_rds_cluster.main.cluster_identifier
    notification = aws_rds_cluster.notification.cluster_identifier
    payment      = aws_rds_cluster.payment.cluster_identifier
  }
}

resource "aws_appautoscaling_target" "rds" {
  for_each = local.rds_autoscaling

  max_capacity       = 15
  min_capacity       = 1
  resource_id        = "cluster:${each.value}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  service_namespace  = "rds"
}

resource "aws_appautoscaling_policy" "rds_cpu" {
  for_each = local.rds_autoscaling

  name               = "muvi-prod-${each.key}-rds-cpu-utilization-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.rds[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.rds[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.rds[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
