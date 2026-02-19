# ============================================================
# API Gateway (REST API v1)
# ============================================================

resource "aws_api_gateway_rest_api" "muvi" {
  name        = "Muvi-API"
  description = "Main API Gateway — proxies to ALB"

  binary_media_types = ["application/json", "multipart/form-data"]
  api_key_source     = "HEADER"

  endpoint_configuration {
    types = ["EDGE"]
  }

  tags = { Name = "Muvi-API" }
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.muvi.id
  parent_id   = aws_api_gateway_rest_api.muvi.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method → HTTP_PROXY to ALB
resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.muvi.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Accept"       = false
    "method.request.header.Content-Type" = false
    "method.request.path.proxy"          = true
  }
}

resource "aws_api_gateway_integration" "proxy_any" {
  rest_api_id             = aws_api_gateway_rest_api.muvi.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_any.http_method
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${aws_lb.public.dns_name}/{proxy}"
  connection_type         = "INTERNET"
  timeout_milliseconds    = 29000

  request_parameters = {
    "integration.request.header.Accept"       = "method.request.header.Accept"
    "integration.request.header.Content-Type" = "method.request.header.Content-Type"
    "integration.request.path.proxy"          = "method.request.path.proxy"
  }
}

# GET method → Lambda (cron-cancel-expired)
resource "aws_api_gateway_method" "proxy_get" {
  rest_api_id   = aws_api_gateway_rest_api.muvi.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "proxy_get" {
  rest_api_id             = aws_api_gateway_rest_api.muvi.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.cron_cancel_expired.invoke_arn
  timeout_milliseconds    = 29000
}

resource "aws_api_gateway_model" "empty" {
  rest_api_id  = aws_api_gateway_rest_api.muvi.id
  name         = "Empty"
  content_type = "application/json"
  schema       = "{}"
}

resource "aws_api_gateway_model" "error" {
  rest_api_id  = aws_api_gateway_rest_api.muvi.id
  name         = "Error"
  content_type = "application/json"
  schema = jsonencode({
    type = "object"
    properties = {
      message = { type = "string" }
    }
  })
}

# ---------- Deployment + Stage ----------
resource "aws_api_gateway_deployment" "prod" {
  rest_api_id = aws_api_gateway_rest_api.muvi.id

  depends_on = [
    aws_api_gateway_integration.proxy_any,
    aws_api_gateway_integration.proxy_get,
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.muvi.id
  deployment_id = aws_api_gateway_deployment.prod.id
  stage_name    = "prod"

  tags = { Name = "prod" }

  lifecycle {
    ignore_changes = [deployment_id]
  }
}

# ---------- Custom Domain ----------
resource "aws_api_gateway_domain_name" "prod" {
  domain_name     = "api-gateway.prod.muvicinemas.com"
  certificate_arn = "arn:aws:acm:us-east-1:011566070219:certificate/b6673333-7881-4d33-89d6-d9251c677a70"

  endpoint_configuration {
    types = ["EDGE"]
  }

  security_policy = "TLS_1_2"
}

resource "aws_api_gateway_base_path_mapping" "prod" {
  api_id      = aws_api_gateway_rest_api.muvi.id
  domain_name = aws_api_gateway_domain_name.prod.domain_name
  stage_name  = aws_api_gateway_stage.prod.stage_name
}

# ---------- API Gateway v2 Domain (websocket/http) ----------
resource "aws_apigatewayv2_domain_name" "prod" {
  domain_name = "api-gateway.prod.muvicinemas.com"

  domain_name_configuration {
    certificate_arn = "arn:aws:acm:us-east-1:011566070219:certificate/b6673333-7881-4d33-89d6-d9251c677a70"
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  lifecycle {
    ignore_changes = [domain_name_configuration]
  }
}

# ---------- WAF Association ----------
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_api_gateway_stage.prod.arn
  web_acl_arn  = aws_wafv2_web_acl.otp_acl.arn
}
