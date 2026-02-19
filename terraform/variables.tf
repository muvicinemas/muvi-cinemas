# ============================================================
# Variables
# ============================================================

variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "account_id" {
  description = "AWS Account ID"
  type        = string
  default     = "011566070219"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.230.0.0/16"
}

# ---------- Availability Zones ----------
variable "azs" {
  description = "Availability zones"
  type        = list(string)
  default     = ["eu-central-1a", "eu-central-1b", "eu-central-1c"]
}

# ---------- Subnet CIDRs ----------
variable "public_subnets" {
  type    = list(string)
  default = ["10.230.1.0/24", "10.230.2.0/24", "10.230.3.0/24"]
}

variable "nated_subnets" {
  type    = list(string)
  default = ["10.230.4.0/24", "10.230.5.0/24", "10.230.6.0/24"]
}

variable "private_subnets" {
  type    = list(string)
  default = ["10.230.7.0/24", "10.230.8.0/24", "10.230.9.0/24"]
}

# ---------- Service Names ----------
variable "services" {
  description = "Microservice names"
  type        = list(string)
  default     = ["gateway", "identity", "main", "payment", "notification", "fb", "offer", "website", "ticket"]
}
