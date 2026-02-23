# ============================================================
# Amazon Inspector v2 — Vulnerability Scanning
# ============================================================

resource "aws_inspector2_enabler" "main" {
  account_ids    = [var.account_id]
  resource_types = ["EC2", "ECR", "LAMBDA"]
}
