# ============================================================
# KMS Keys
# ============================================================

resource "aws_kms_key" "rds" {
  description         = "KMS key for RDS encryption"
  enable_key_rotation = true
  tags                = { Name = "RDS-key-kms" }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/RDS-key-kms"
  target_key_id = aws_kms_key.rds.key_id
}

resource "aws_kms_key" "cloudtrail" {
  description         = "KMS key for CloudTrail logs"
  enable_key_rotation = true
  tags                = { Name = "cloudtrail-key-kms" }
}

resource "aws_kms_alias" "cloudtrail" {
  name          = "alias/cloudtrail-key-kms"
  target_key_id = aws_kms_key.cloudtrail.key_id
}

resource "aws_kms_key" "va_scan" {
  description         = "KMS key for vulnerability scan"
  enable_key_rotation = true
  tags                = { Name = "va-scan-key-kms" }
}

resource "aws_kms_alias" "va_scan" {
  name          = "alias/va-scan-key-kms"
  target_key_id = aws_kms_key.va_scan.key_id
}
