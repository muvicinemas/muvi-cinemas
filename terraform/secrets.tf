# ============================================================
# Secrets Manager (NEW — not in old TF state)
# ============================================================

# ---------- RDS Secrets ----------
locals {
  rds_secrets = {
    main         = "prod/main/rds"
    identity     = "prod/identity/rds"
    payment      = "prod/payment/rds"
    notification = "prod/notification/rds"
    fb           = "prod/fb/rds"
  }
}

resource "aws_secretsmanager_secret" "rds" {
  for_each = local.rds_secrets
  name     = each.value
  tags     = { Name = each.value }
}

# ---------- LB Certificate Secrets ----------
locals {
  lb_cert_secrets = {
    gateway      = "prod/gateway/lb/certificate"
    identity     = "prod/identity/lb/certificate"
    main         = "prod/main/lb/certificate"
    payment      = "prod/payment/lb/certificate"
    notification = "prod/notification/lb/certificate"
    fb           = "prod/fb/lb/certificate"
  }
}

resource "aws_secretsmanager_secret" "lb_cert" {
  for_each = local.lb_cert_secrets
  name     = each.value
  tags     = { Name = each.value }
}

# ---------- Payment-specific Secrets ----------
resource "aws_secretsmanager_secret" "apple_merchant_id" {
  name = "prod/apple/merchant/id"
  tags = { Name = "prod/apple/merchant/id" }
}

resource "aws_secretsmanager_secret" "applepay_hyperpay_privatekey" {
  name = "prod/payment/applepay/hyperpay/privatekey"
  tags = { Name = "applepay-hyperpay-privatekey" }
}

resource "aws_secretsmanager_secret" "applepay_hyperpay_cert" {
  name = "prod/payment/applepay/hyperpay/cert"
  tags = { Name = "applepay-hyperpay-cert" }
}

resource "aws_secretsmanager_secret" "applepay_checkout_cert" {
  name = "prod/payment/applepay/checkout/cert"
  tags = { Name = "applepay-checkout-cert" }
}

resource "aws_secretsmanager_secret" "applepay_checkout_privatekey" {
  name = "prod/payment/applepay/checkout/privatekey"
  tags = { Name = "applepay-checkout-privatekey" }
}

resource "aws_secretsmanager_secret" "nearpay_privatekey" {
  name = "prod/payment/nearpay/privatekey"
  tags = { Name = "nearpay-privatekey" }
}

resource "aws_secretsmanager_secret" "applepay_payfort_privatekey" {
  name = "prod/payment/applepay/payfort/privatekey."
  tags = { Name = "applepay-payfort-privatekey" }
}

# ---------- Misc Secrets ----------
resource "aws_secretsmanager_secret" "braze_api_key" {
  name = "identity-ecs-braze-api-key"
  tags = { Name = "identity-ecs-braze-api-key" }
}

resource "aws_secretsmanager_secret" "offer_db" {
  name = "OfferDBSecret"
  tags = { Name = "OfferDBSecret" }
}

# RDS auto-generated secret (Aurora managed)
resource "aws_secretsmanager_secret" "rds_auto" {
  name = "rds-db-credentials/cluster-LMVIMHWKEGHSISX3GDESVJKWIA/postgres/1700736840411"

  lifecycle {
    ignore_changes = [name]
  }

  tags = { Name = "rds-auto-credentials" }
}

# Aurora-managed password secret
resource "aws_secretsmanager_secret" "rds_cluster_auto" {
  name = "rds!cluster-5253bcbe-7680-405c-bd02-e26c53286471"

  lifecycle {
    ignore_changes = [name]
  }

  tags = { Name = "rds-cluster-auto-password" }
}
