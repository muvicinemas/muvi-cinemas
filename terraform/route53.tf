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
