# ============================================================
# ECR Repositories
# ============================================================

locals {
  ecr_repos = toset([
    "muvi-gateway",
    "muvi-identity",
    "muvi-main",
    "muvi-payment",
    "muvi-notification",
    "muvi-fb",
    "muvi-offer",
    "muvi-website",
  ])
}

resource "aws_ecr_repository" "services" {
  for_each = local.ecr_repos

  name                 = each.key
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = each.key }
}
