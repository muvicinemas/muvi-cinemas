# ============================================================
# AWS Backup — 2 Vaults, 4 Backup Plans
# ============================================================

# ---------- Backup Vaults ----------
resource "aws_backup_vault" "default" {
  name        = "Default"
  kms_key_arn = "arn:aws:kms:eu-central-1:011566070219:key/698fb477-472c-46ad-a5da-61a6e8197ad3"
  tags        = { Name = "Default" }
}

resource "aws_backup_vault" "rds_dr" {
  name        = "RDS-DR-To-Ireland-Vault"
  kms_key_arn = "arn:aws:kms:eu-central-1:011566070219:key/698fb477-472c-46ad-a5da-61a6e8197ad3"
  tags        = { Name = "RDS-DR-To-Ireland-Vault" }
}

# ---------- Backup Plan: S3-Backup ----------
resource "aws_backup_plan" "s3_backup" {
  name = "S3-Backup"

  rule {
    rule_name         = "S3-Daily-Backup"
    target_vault_name = aws_backup_vault.default.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = 30
    }
  }

  tags = { Name = "S3-Backup" }

  lifecycle {
    ignore_changes = [rule]
  }
}

# ---------- Backup Plan: Media-Backup ----------
resource "aws_backup_plan" "media_backup" {
  name = "Media-Backup"

  rule {
    rule_name         = "Media-Daily-Backup"
    target_vault_name = aws_backup_vault.default.name
    schedule          = "cron(0 2 * * ? *)"

    lifecycle {
      delete_after = 30
    }
  }

  tags = { Name = "Media-Backup" }

  lifecycle {
    ignore_changes = [rule]
  }
}

# ---------- Backup Plan: RDS-DR-To-Ireland-1 ----------
resource "aws_backup_plan" "rds_dr_ireland_1" {
  name = "RDS-DR-To-Ireland-1"

  rule {
    rule_name         = "RDS-DR-Daily"
    target_vault_name = aws_backup_vault.rds_dr.name
    schedule          = "cron(0 4 * * ? *)"

    lifecycle {
      delete_after = 7
    }

    copy_action {
      destination_vault_arn = "arn:aws:backup:eu-west-1:011566070219:backup-vault:Default"

      lifecycle {
        delete_after = 7
      }
    }
  }

  tags = { Name = "RDS-DR-To-Ireland-1" }

  lifecycle {
    ignore_changes = [rule]
  }
}

# ---------- Backup Plan: RDS-DR-To-Ireland-3 ----------
resource "aws_backup_plan" "rds_dr_ireland_3" {
  name = "RDS-DR-To-Ireland-3"

  rule {
    rule_name         = "RDS-DR-Daily-3"
    target_vault_name = aws_backup_vault.rds_dr.name
    schedule          = "cron(0 5 * * ? *)"

    lifecycle {
      delete_after = 7
    }

    copy_action {
      destination_vault_arn = "arn:aws:backup:eu-west-1:011566070219:backup-vault:Default"

      lifecycle {
        delete_after = 7
      }
    }
  }

  tags = { Name = "RDS-DR-To-Ireland-3" }

  lifecycle {
    ignore_changes = [rule]
  }
}

# ---------- IAM Role for Backup ----------
resource "aws_iam_role" "backup" {
  name = "AWSBackupDefaultServiceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  lifecycle {
    ignore_changes = [assume_role_policy]
  }
}

resource "aws_iam_role_policy_attachment" "backup_service" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

resource "aws_iam_role_policy_attachment" "backup_s3" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Backup"
}

resource "aws_iam_role_policy_attachment" "backup_s3_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Restore"
}
