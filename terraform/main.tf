# ============================================================
# Muvi Cinemas — Production Infrastructure (eu-central-1)
# Terraform v1.9+  |  AWS Provider ~> 5.0
# ============================================================

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "terraform-statefile-muvi"
    key     = "aws/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
}

# ---------- Providers ----------
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "terraform"
      Project     = "muvi-cinemas"
    }
  }
}

# CloudFront WAF + ACM certs must live in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "terraform"
      Project     = "muvi-cinemas"
    }
  }
}
