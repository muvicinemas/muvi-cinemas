# ============================================================
# EC2 Instances & Key Pairs — 3 Instances, 3 Key Pairs
# ============================================================

# ---------- Key Pairs ----------
resource "aws_key_pair" "jumpbox" {
  key_name = "muvi-prod-jumpbox"
  # Public key already deployed — import only
  public_key = "IMPORT_ONLY_placeholder"

  lifecycle {
    ignore_changes = [public_key]
  }

  tags = { Name = "muvi-prod-jumpbox" }
}

resource "aws_key_pair" "jumpbox_muvi" {
  key_name = "jumpbox-key-muvi"
  # Public key already deployed — import only
  public_key = "IMPORT_ONLY_placeholder"

  lifecycle {
    ignore_changes = [public_key]
  }

  tags = { Name = "jumpbox-key-muvi" }
}

resource "aws_key_pair" "temp_jb" {
  key_name = "temp-JB"
  # Public key already deployed — import only
  public_key = "IMPORT_ONLY_placeholder"

  lifecycle {
    ignore_changes = [public_key]
  }

  tags = { Name = "temp-JB" }
}

# ---------- Instance: Jumpbox (running — primary bastion) ----------
resource "aws_instance" "jumpbox_temp" {
  ami                    = "ami-placeholder"
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.jumpbox.key_name
  subnet_id              = aws_subnet.public[0].id # subnet-036ca19262e4d4f1a (public-1)
  vpc_security_group_ids = [aws_security_group.jumpbox.id]

  iam_instance_profile = "AmazonSSMRoleForInstancesQuickSetup"

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
  }

  tags = {
    Name = "Temp"
  }

  lifecycle {
    ignore_changes = [ami, user_data, instance_type, root_block_device, iam_instance_profile]
  }
}

# ---------- Instance: Jumpbox (stopped — original) ----------
resource "aws_instance" "jumpbox_original" {
  ami                    = "ami-placeholder"
  instance_type          = "t3.small"
  key_name               = aws_key_pair.jumpbox.key_name
  subnet_id              = aws_subnet.nated[1].id # subnet-06e94b755777af5b2 (nated-2)
  vpc_security_group_ids = [aws_security_group.jumpbox.id]

  tags = {
    Name = "Jumpbox"
  }

  lifecycle {
    ignore_changes = [ami, user_data, instance_type, root_block_device, iam_instance_profile]
  }
}

# ---------- Instance: Muvi-Temp-JumpBox (stopped) ----------
resource "aws_instance" "jumpbox_muvi_temp" {
  ami                    = "ami-placeholder"
  instance_type          = "t3.small"
  key_name               = aws_key_pair.jumpbox_muvi.key_name
  subnet_id              = aws_subnet.public[0].id # subnet-036ca19262e4d4f1a (public-1)
  vpc_security_group_ids = [aws_security_group.jumpbox.id]

  tags = {
    Name = "Muvi-Temp-JumpBox"
  }

  lifecycle {
    ignore_changes = [ami, user_data, instance_type, root_block_device, iam_instance_profile]
  }
}
