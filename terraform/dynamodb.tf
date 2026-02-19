# ============================================================
# DynamoDB — Terraform Lock Table
# ============================================================

resource "aws_dynamodb_table" "terraform_lock" {
  name         = "muvi-tf-lockid"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = { Name = "muvi-tf-lockid" }

  lifecycle {
    prevent_destroy = true
  }
}
