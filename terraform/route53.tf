# ============================================================
# Route 53 Hosted Zones (NEW — not in old TF state)
# ============================================================

resource "aws_route53_zone" "muvicinemas" {
  name    = "muvicinemas.com"
  comment = "Primary public hosted zone"

  tags = { Name = "muvicinemas.com" }
}

resource "aws_route53_zone" "internal_1" {
  name = "internal"

  vpc {
    vpc_id = aws_vpc.muvi.id
  }

  comment = "Private hosted zone for internal services"
  tags    = { Name = "internal-1" }
}

resource "aws_route53_zone" "internal_2" {
  name = "internal"

  vpc {
    vpc_id = aws_vpc.muvi.id
  }

  comment = "Private hosted zone for internal services (secondary)"
  tags    = { Name = "internal-2" }
}

resource "aws_route53_zone" "microservices_internal_1" {
  name = "prod.microservices.internal"

  vpc {
    vpc_id = aws_vpc.muvi.id
  }

  comment = "Private hosted zone for microservices"
  tags    = { Name = "prod-microservices-internal-1" }
}

resource "aws_route53_zone" "microservices_internal_2" {
  name = "prod.microservices.internal"

  vpc {
    vpc_id = aws_vpc.muvi.id
  }

  comment = "Private hosted zone for microservices (secondary)"
  tags    = { Name = "prod-microservices-internal-2" }
}

# ============================================================
# Route 53 Records — Public Zone (muvicinemas.com)
# ============================================================

# ---------- Root & WWW ----------
resource "aws_route53_record" "root_a" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "muvicinemas.com"
  type    = "A"

  alias {
    name                   = "d12v4bs7knoupw.cloudfront.net"
    zone_id                = "Z2FDTNDATAQYW2" # Global CloudFront hosted zone
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "www.muvicinemas.com"
  type    = "CNAME"
  ttl     = 600
  records = ["d12v4bs7knoupw.cloudfront.net"]
}

# ---------- Production CloudFront Records ----------
resource "aws_route53_record" "api_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "api.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["dq7y1f8h3xhf.cloudfront.net"]
}

resource "aws_route53_record" "app_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "app.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d12v4bs7knoupw.cloudfront.net"]
}

resource "aws_route53_record" "cms_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "cms.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["dqwekr7ue7j1c.cloudfront.net"]
}

resource "aws_route53_record" "media_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "media.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d3t6hr3zziy3f6.cloudfront.net"]
}

resource "aws_route53_record" "api_gateway_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "api-gateway.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d32etmylxili1w.cloudfront.net"]
}

# ---------- Production DR Records ----------
resource "aws_route53_record" "api_dr_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "api-dr.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d3l8wz5xsc1bj1.cloudfront.net"]
}

resource "aws_route53_record" "app_dr_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "app-dr.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d3rw9aycvk0lz5.cloudfront.net"]
}

resource "aws_route53_record" "cms_dr_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "cms-dr.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d2wu3n5o1lxc9p.cloudfront.net"]
}

resource "aws_route53_record" "media_dr_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "media-dr.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d1ufz3b7dcaywz.cloudfront.net"]
}

# ---------- Other Production Services ----------
resource "aws_route53_record" "dashboard" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "dashboard.muvicinemas.com"
  type    = "CNAME"
  ttl     = 600
  records = ["dqwekr7ue7j1c.cloudfront.net"]
}

resource "aws_route53_record" "partners" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "partners.muvicinemas.com"
  type    = "CNAME"
  ttl     = 300
  records = ["d1f6y3d7f8ka4n.cloudfront.net"]
}

resource "aws_route53_record" "rewards_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "rewards.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["f4e3jr0jk6aif.cloudfront.net"]
}

resource "aws_route53_record" "rewards" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "rewards.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d1t3ww6ygjqho1.cloudfront.net"]
}

resource "aws_route53_record" "go" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "go.muvicinemas.com"
  type    = "CNAME"
  ttl     = 300
  records = ["des89cjhwvbly.cloudfront.net"]
}

resource "aws_route53_record" "cdp_prod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "cdp.prod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["dnkt7rcb9hqfk.cloudfront.net"]
}

# ---------- Third-party / Email Records ----------
resource "aws_route53_record" "sendgrid_dkim_s1" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "s1._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 1800
  records = ["s1.domainkey.u10072790.wl004.sendgrid.net"]
}

resource "aws_route53_record" "sendgrid_dkim_s2" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "s2._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 1800
  records = ["s2.domainkey.u10072790.wl004.sendgrid.net"]
}

resource "aws_route53_record" "sendgrid_em5401" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "em5401.muvicinemas.com"
  type    = "CNAME"
  ttl     = 1800
  records = ["u10072790.wl004.sendgrid.net"]
}

resource "aws_route53_record" "sendgrid_10072790" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "10072790.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["sendgrid.net"]
}

resource "aws_route53_record" "sendgrid_url8960" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "url8960.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["sendgrid.net"]
}

# Freshdesk DKIM
resource "aws_route53_record" "freshdesk_fd" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "fd._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["fda.domainkey.freshdesk.com"]
}

resource "aws_route53_record" "freshdesk_fd2" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "fd2._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["fd2a.domainkey.freshdesk.com"]
}

resource "aws_route53_record" "freshdesk_fdm" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "fdm._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["accda.domainkey.freshdesk.com"]
}

resource "aws_route53_record" "help" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "help.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["muvicinemas.freshdesk.com"]
}

# Microsoft/Outlook
resource "aws_route53_record" "autodiscover" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "autodiscover.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["autodiscover.outlook.com"]
}

resource "aws_route53_record" "lyncdiscover" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "lyncdiscover.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["webdir.online.lync.com"]
}

resource "aws_route53_record" "sip" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "sip.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["sipdir.online.lync.com"]
}

resource "aws_route53_record" "selector1_dkim" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "selector1._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["selector1-muvicinemas-com._domainkey.muvicinemas.onmicrosoft.com"]
}

resource "aws_route53_record" "selector2_dkim" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "selector2._domainkey.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["selector2-muvicinemas-com._domainkey.muvicinemas.onmicrosoft.com"]
}

resource "aws_route53_record" "enterprise_enrollment" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "enterpriseenrollment.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["enterpriseenrollment-s.manage.microsoft.com"]
}

resource "aws_route53_record" "enterprise_registration" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "enterpriseregistration.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["enterpriseregistration.windows.net"]
}

# ---------- Legacy Vista / On-prem IPs ----------
resource "aws_route53_record" "apiprod" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "apiprod.muvicinemas.com"
  type    = "CNAME"
  ttl     = 600
  records = ["muvi-prod-alb-1987928373.eu-central-1.elb.amazonaws.com"]
}

resource "aws_route53_record" "prod_kiosks" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "prod-kiosks.muvicinemas.com"
  type    = "CNAME"
  ttl     = 600
  records = ["muvi-prod-alb-1987928373.eu-central-1.elb.amazonaws.com"]
}

resource "aws_route53_record" "purchase" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "purchase.muvicinemas.com"
  type    = "CNAME"
  ttl     = 600
  records = ["a279ce08b2b0b4cd1a68f7d7c40c2ad7-2044666614.eu-central-1.elb.amazonaws.com"]
}

# ---------- Other Services ----------
resource "aws_route53_record" "vpn" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "vpn.muvicinemas.com"
  type    = "A"
  ttl     = 3600
  records = ["128.140.86.126"]
}

resource "aws_route53_record" "fivetran" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "fivetran.muvicinemas.com"
  type    = "A"
  ttl     = 3600
  records = ["52.58.197.60"]
}

resource "aws_route53_record" "kayanhr" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "kayanhr.muvicinemas.com"
  type    = "A"
  ttl     = 3600
  records = ["20.74.149.173"]
}

resource "aws_route53_record" "tags" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "tags.muvicinemas.com"
  type    = "CNAME"
  ttl     = 300
  records = ["serverless.google.com"]
}

resource "aws_route53_record" "landing" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "landing.muvicinemas.com"
  type    = "CNAME"
  ttl     = 300
  records = ["badge-landing-muvi.pages.dev"]
}

resource "aws_route53_record" "cdp" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "cdp.muvicinemas.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["d1ak3g4hjkprtw.cloudfront.net"]
}

resource "aws_route53_record" "emailsvc" {
  zone_id = aws_route53_zone.muvicinemas.zone_id
  name    = "emailsvc.muvicinemas.com"
  type    = "CNAME"
  ttl     = 300
  records = ["d1hxl2fihcbv1r.cloudfront.net"]
}

# ============================================================
# Route 53 Records — Microservices Internal Zone (CNAME records)
# ============================================================
# Note: A records for services (gateway, identity, main, etc.) are
# ECS service discovery records — they change dynamically.
# Only CNAME records (DB endpoints, Redis endpoints) are in Terraform.

resource "aws_route53_record" "identity_db_writer" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "identity-db-writer.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-identity.cluster-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "identity_db_reader" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "identity-db-reader.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-identity.cluster-ro-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "main_db_writer" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "main-db-writer.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-main-service.cluster-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "main_db_reader" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "main-db-reader.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-main-service.cluster-ro-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "notification_db_writer" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "notification-db-writer.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-notification.cluster-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "notification_db_reader" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "notification-db-reader.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-notification.cluster-ro-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "payment_db_writer" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "payment-db-writer.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-payments.cluster-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

resource "aws_route53_record" "payment_db_reader" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "payment-db-reader.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 300
  records = ["muvi-prod-payments.cluster-ro-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com"]
}

# ---------- Redis CNAME Records ----------
resource "aws_route53_record" "redis_shared" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "redis.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 60
  records = ["muvi-redis-temp.j9gl10.ng.0001.euc1.cache.amazonaws.com"]
}

resource "aws_route53_record" "redis_gateway" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "getway.redis.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 60
  records = ["foms-redis-prod-getway.j9gl10.ng.0001.euc1.cache.amazonaws.com"]
}

resource "aws_route53_record" "redis_identity" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "identity.redis.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 60
  records = ["foms-redis-prod-identity.j9gl10.ng.0001.euc1.cache.amazonaws.com"]
}

resource "aws_route53_record" "redis_main" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "main.redis.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 60
  records = ["foms-redis-prod-main.j9gl10.ng.0001.euc1.cache.amazonaws.com"]
}

resource "aws_route53_record" "redis_notification" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "notification.redis.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 60
  records = ["foms-redis-prod-notification.j9gl10.ng.0001.euc1.cache.amazonaws.com"]
}

resource "aws_route53_record" "redis_payment" {
  zone_id = aws_route53_zone.microservices_internal_2.zone_id
  name    = "paymnet.redis.prod.microservices.internal"
  type    = "CNAME"
  ttl     = 60
  records = ["foms-redis-prod-paymnet.j9gl10.ng.0001.euc1.cache.amazonaws.com"]
}
