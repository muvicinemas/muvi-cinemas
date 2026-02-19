# ============================================================
# Aurora PostgreSQL — 7 Clusters
# ============================================================

# ---------- DB Subnet Groups ----------
resource "aws_db_subnet_group" "main" {
  name       = "muvi-prod-subnetg"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "muvi-prod-subnetg" }
}

resource "aws_db_subnet_group" "identity" {
  name       = "muvi-prod0identity-service-subnetg"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "muvi-prod0identity-service-subnetg" }
}

resource "aws_db_subnet_group" "notification" {
  name       = "muvi-prod-notification-service-subnetg"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "muvi-prod-notification-service-subnetg" }
}

resource "aws_db_subnet_group" "payment" {
  name       = "muvi-prod-payment-service-subnetg"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "muvi-prod-payment-service-subnetg" }
}

resource "aws_db_subnet_group" "order" {
  name       = "muvi-prod-order-service-subnetg"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "muvi-prod-order-service-subnetg" }
}

# ---------- Cluster Parameter Groups ----------
resource "aws_rds_cluster_parameter_group" "main" {
  name        = "muvi-db-cluster-pg"
  family      = "aurora-postgresql14"
  description = "Main cluster parameter group"
}

resource "aws_rds_cluster_parameter_group" "identity" {
  name        = "muvi-identity-cluster-pg"
  family      = "aurora-postgresql14"
  description = "Identity cluster parameter group"
}

resource "aws_rds_cluster_parameter_group" "notification" {
  name        = "muvi-notification-cluster-pg"
  family      = "aurora-postgresql14"
  description = "Notification cluster parameter group"
}

resource "aws_rds_cluster_parameter_group" "payment" {
  name        = "muvi-prod-payment-service-cluster-pg"
  family      = "aurora-postgresql14"
  description = "Payment cluster parameter group"
}

resource "aws_rds_cluster_parameter_group" "fb" {
  name        = "muvi-fb-cluster-pg"
  family      = "aurora-postgresql14"
  description = "F&B cluster parameter group"
}

resource "aws_rds_cluster_parameter_group" "offer" {
  name        = "muvi-offer-cluster-pg"
  family      = "aurora-postgresql14"
  description = "Offer cluster parameter group"
}

# ---------- DB Parameter Groups ----------
resource "aws_db_parameter_group" "main" {
  name   = "muvi-prod-db-pg"
  family = "aurora-postgresql14"
}

resource "aws_db_parameter_group" "identity" {
  name   = "muvi-prod-identity-pg"
  family = "aurora-postgresql14"
}

resource "aws_db_parameter_group" "notification" {
  name   = "muvi-prod-notification-pg"
  family = "aurora-postgresql14"
}

resource "aws_db_parameter_group" "payment" {
  name   = "muvi-prod-payment-service-pg"
  family = "aurora-postgresql14"
}

# ==================== CLUSTERS ====================

# ---------- Main Service (107 GB — largest) ----------
resource "aws_rds_cluster" "main" {
  cluster_identifier              = "muvi-prod-main-service"
  engine                          = "aurora-postgresql"
  engine_version                  = "14.17"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME" # Import will use existing password
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.rds["main"].id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  preferred_maintenance_window    = "tue:04:12-tue:04:42"
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "muvi-prod-main-final"

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "muvi-prod-main-service" }
}

resource "aws_rds_cluster_instance" "main_writer" {
  identifier           = "muvi-prod-main-writer"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.r5.2xlarge"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  db_parameter_group_name = aws_db_parameter_group.main.name
  monitoring_role_arn  = aws_iam_role.rds_monitoring.arn
  monitoring_interval  = 60
}

resource "aws_rds_cluster_instance" "main_reader" {
  identifier           = "muvi-prod-main-reader"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.r5.2xlarge"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  db_parameter_group_name = aws_db_parameter_group.main.name
  monitoring_role_arn  = aws_iam_role.rds_monitoring.arn
  monitoring_interval  = 60
}

# ---------- Identity ----------
resource "aws_rds_cluster" "identity" {
  cluster_identifier              = "muvi-prod-identity"
  engine                          = "aurora-postgresql"
  engine_version                  = "14.15"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME"
  db_subnet_group_name            = aws_db_subnet_group.identity.name
  vpc_security_group_ids          = [aws_security_group.rds["identity"].id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.identity.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  preferred_maintenance_window    = "mon:05:00-mon:05:30"
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "muvi-prod-identity-final"

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "muvi-prod-identity" }
}

resource "aws_rds_cluster_instance" "identity_writer" {
  identifier         = "muvi-prod-identity-writer"
  cluster_identifier = aws_rds_cluster.identity.id
  instance_class     = "db.r5.xlarge"
  engine             = aws_rds_cluster.identity.engine
  engine_version     = aws_rds_cluster.identity.engine_version
  db_parameter_group_name = aws_db_parameter_group.identity.name
}

resource "aws_rds_cluster_instance" "identity_reader" {
  identifier         = "muvi-prod-identity-reader"
  cluster_identifier = aws_rds_cluster.identity.id
  instance_class     = "db.r5.xlarge"
  engine             = aws_rds_cluster.identity.engine
  engine_version     = aws_rds_cluster.identity.engine_version
  db_parameter_group_name = aws_db_parameter_group.identity.name
}

# ---------- Payment (Serverless v2) ----------
resource "aws_rds_cluster" "payment" {
  cluster_identifier              = "muvi-prod-payments-recovered-cluster"
  engine                          = "aurora-postgresql"
  engine_version                  = "14.15"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME"
  db_subnet_group_name            = aws_db_subnet_group.identity.name # shares identity subnet group
  vpc_security_group_ids          = [aws_security_group.rds["payment"].id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.payment.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  preferred_maintenance_window    = "wed:00:30-wed:01:00"
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "muvi-prod-payments-final"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 128
  }

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "muvi-prod-payments" }
}

# ---------- Notification ----------
resource "aws_rds_cluster" "notification" {
  cluster_identifier              = "muvi-prod-notification"
  engine                          = "aurora-postgresql"
  engine_version                  = "14.15"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME"
  db_subnet_group_name            = aws_db_subnet_group.notification.name
  vpc_security_group_ids          = [aws_security_group.rds["notification"].id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.notification.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  preferred_maintenance_window    = "tue:00:13-tue:00:43"
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "muvi-prod-notification-final"

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "muvi-prod-notification" }
}

resource "aws_rds_cluster_instance" "notification_writer" {
  identifier         = "muvi-prod-notification-writer"
  cluster_identifier = aws_rds_cluster.notification.id
  instance_class     = "db.r5.large"
  engine             = aws_rds_cluster.notification.engine
  engine_version     = aws_rds_cluster.notification.engine_version
  db_parameter_group_name = aws_db_parameter_group.notification.name
}

# ---------- F&B ----------
resource "aws_rds_cluster" "fb" {
  cluster_identifier              = "muvi-prod-fb"
  engine                          = "aurora-postgresql"
  engine_version                  = "14.17"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME"
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.rds["fb"].id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.fb.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  preferred_maintenance_window    = "wed:02:55-wed:03:25"
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "muvi-prod-fb-final"

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "muvi-prod-fb" }
}

resource "aws_rds_cluster_instance" "fb_writer" {
  identifier         = "muvi-prod-fb-writer"
  cluster_identifier = aws_rds_cluster.fb.id
  instance_class     = "db.r5.large"
  engine             = aws_rds_cluster.fb.engine
  engine_version     = aws_rds_cluster.fb.engine_version
}

resource "aws_rds_cluster_instance" "fb_reader" {
  identifier         = "muvi-prod-fb-reader"
  cluster_identifier = aws_rds_cluster.fb.id
  instance_class     = "db.r5.large"
  engine             = aws_rds_cluster.fb.engine
  engine_version     = aws_rds_cluster.fb.engine_version
}

# ---------- Offer ----------
resource "aws_rds_cluster" "offer" {
  cluster_identifier              = "muvi-offer-prod"
  engine                          = "aurora-postgresql"
  engine_version                  = "14.17"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME"
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.rds["offer"].id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.offer.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  preferred_maintenance_window    = "wed:02:55-wed:03:25"
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "muvi-prod-offer-final"

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "muvi-offer-prod" }
}

resource "aws_rds_cluster_instance" "offer_writer" {
  identifier         = "muvi-prod-offer-writer"
  cluster_identifier = aws_rds_cluster.offer.id
  instance_class     = "db.r5.large"
  engine             = aws_rds_cluster.offer.engine
  engine_version     = aws_rds_cluster.offer.engine_version
}

resource "aws_rds_cluster_instance" "offer_reader" {
  identifier         = "muvi-prod-offer-reader"
  cluster_identifier = aws_rds_cluster.offer.id
  instance_class     = "db.r5.large"
  engine             = aws_rds_cluster.offer.engine
  engine_version     = aws_rds_cluster.offer.engine_version
}

# ---------- Migration DB (NEW — not in old TF state) ----------
resource "aws_rds_cluster" "migration" {
  cluster_identifier              = "prod-alldb-mig"
  engine                          = "aurora-postgresql"
  engine_version                  = "17.4"
  master_username                 = "postgres"
  manage_master_user_password     = false
  master_password                 = "CHANGE_ME"
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.rds["main"].id]
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.rds.arn
  backup_retention_period         = 7
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "prod-alldb-mig-final"

  lifecycle {
    ignore_changes = [master_password, engine_version]
  }

  tags = { Name = "prod-alldb-mig" }
}

# ==================== RDS PROXIES ====================

resource "aws_db_proxy" "main" {
  name                   = "main-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy["main"].arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy["main"].id]

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds["main"].arn
  }

  tags = { Name = "main-proxy" }
}

resource "aws_db_proxy" "identity" {
  name                   = "identity-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy["identity"].arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy["identity"].id]

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds["identity"].arn
  }

  tags = { Name = "identity-proxy" }
}

resource "aws_db_proxy" "payment" {
  name                   = "payment-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy["payment"].arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy["payment"].id]

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds["payment"].arn
  }

  tags = { Name = "payment-proxy" }
}

resource "aws_db_proxy" "notification" {
  name                   = "notification-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy["notification"].arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy["notification"].id]

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds["notification"].arn
  }

  tags = { Name = "notification-proxy" }
}

resource "aws_db_proxy" "fb" {
  name                   = "fb-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy["fb"].arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy["fb"].id]

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds["fb"].arn
  }

  tags = { Name = "fb-proxy" }
}

resource "aws_db_proxy" "offer" {
  name                   = "offer-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy["offer"].arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy["offer"].id]

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.rds["offer"].arn
  }

  tags = { Name = "offer-proxy" }
}
