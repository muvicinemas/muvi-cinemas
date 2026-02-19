# ============================================================
# CodeBuild Projects — 12 Projects
# ============================================================

# ---------- Main service build (NestJS services) ----------
resource "aws_codebuild_project" "muvi_build" {
  name         = "Muvi-Build"
  service_role = aws_iam_role.codebuild["Muvi-Build"].arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/Muvi-Build"
    }
  }

  lifecycle {
    ignore_changes = [environment, source, artifacts, secondary_sources, secondary_artifacts]
  }

  tags = { Name = "Muvi-Build" }
}

# ---------- Offer service build (Go) ----------
resource "aws_codebuild_project" "muvi_build_offer" {
  name         = "Muvi-Build-offer"
  service_role = aws_iam_role.codebuild["Muvi-Build-offer"].arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/Muvi-Build-offer"
    }
  }

  lifecycle {
    ignore_changes = [environment, source, artifacts]
  }

  tags = { Name = "Muvi-Build-offer" }
}

# ---------- CMS Build ----------
resource "aws_codebuild_project" "muvi_cms_build" {
  name         = "Muvi-CMS-Build"
  service_role = aws_iam_role.codebuild["Muvi-CMS-Build"].arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/Muvi-CMS-Build"
    }
  }

  lifecycle {
    ignore_changes = [environment, source, artifacts]
  }

  tags = { Name = "Muvi-CMS-Build" }
}

# ---------- DB Migration ----------
resource "aws_codebuild_project" "db_migration" {
  name         = "DB-migration"
  service_role = aws_iam_role.codebuild["DB-migration"].arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = false
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type     = "NO_SOURCE"
    buildspec = "version: 0.2\nphases:\n  build:\n    commands:\n      - echo 'DB Migration'"
  }

  vpc_config {
    vpc_id             = aws_vpc.main.id
    subnets            = aws_subnet.nated[*].id
    security_group_ids = [aws_security_group.db_migration.id]
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/DB-migration"
    }
  }

  lifecycle {
    ignore_changes = [environment, source, vpc_config]
  }

  tags = { Name = "DB-migration" }
}

# ---------- DB Preparation ----------
resource "aws_codebuild_project" "db_preparation" {
  name         = "DB-Preparation"
  service_role = aws_iam_role.codebuild["DB-Preparation"].arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = false
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type     = "NO_SOURCE"
    buildspec = "version: 0.2\nphases:\n  build:\n    commands:\n      - echo 'DB Preparation'"
  }

  vpc_config {
    vpc_id             = aws_vpc.main.id
    subnets            = aws_subnet.nated[*].id
    security_group_ids = [aws_security_group.db_preparation.id]
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/DB-Preparation"
    }
  }

  lifecycle {
    ignore_changes = [environment, source, vpc_config]
  }

  tags = { Name = "DB-Preparation" }
}

# ---------- Azure Blob (S3 to Azure sync) ----------
resource "aws_codebuild_project" "azure_blob" {
  name         = "azure-blob"
  service_role = aws_iam_role.codebuild["azure-blob"].arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = false
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type     = "NO_SOURCE"
    buildspec = "version: 0.2\nphases:\n  build:\n    commands:\n      - echo 'Azure Blob Sync'"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/azure-blob"
    }
  }

  lifecycle {
    ignore_changes = [environment, source]
  }

  tags = { Name = "azure-blob" }
}

# ---------- CopyProdToStaging Projects (6) ----------
locals {
  copy_prod_to_staging_services = [
    "muvi-gateway",
    "muvi-identity",
    "muvi-main",
    "muvi-notification",
    "muvi-payment",
    "muvi-website",
  ]
}

resource "aws_codebuild_project" "copy_prod_to_staging" {
  for_each     = toset(local.copy_prod_to_staging_services)
  name         = "CopyProdToStaging-${each.key}"
  service_role = aws_iam_role.codebuild["CopyProdToStaging-${each.key}"].arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"
  }

  source {
    type     = "NO_SOURCE"
    buildspec = "version: 0.2\nphases:\n  build:\n    commands:\n      - echo 'Copy image to staging'"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/CopyProdToStaging-${each.key}"
    }
  }

  lifecycle {
    ignore_changes = [environment, source]
  }

  tags = { Name = "CopyProdToStaging-${each.key}" }
}


# ============================================================
# CodePipeline — 9 Pipelines
# ============================================================

# --- Artifact stores ---
# All pipelines use the existing S3 bucket for artifacts
# The bucket is: muvi-prod-codepipeline-artifacts (in s3.tf)

# ---------- Service Pipelines (7 backend services) ----------
locals {
  service_pipelines = {
    "Production-Gateway" = {
      ecr_repo   = "muvi-gateway"
      build_proj = aws_codebuild_project.muvi_build.name
      ecs_svc    = "gateway"
    }
    "Production-Identity" = {
      ecr_repo   = "muvi-identity"
      build_proj = aws_codebuild_project.muvi_build.name
      ecs_svc    = "identity-grpc"
    }
    "Production-Main" = {
      ecr_repo   = "muvi-main-service"
      build_proj = aws_codebuild_project.muvi_build.name
      ecs_svc    = "main-grpc"
    }
    "Production-Payment" = {
      ecr_repo   = "muvi-payment"
      build_proj = aws_codebuild_project.muvi_build.name
      ecs_svc    = "payment-grpc"
    }
    "Production-Notification" = {
      ecr_repo   = "muvi-notification"
      build_proj = aws_codebuild_project.muvi_build.name
      ecs_svc    = "notification-grpc"
    }
    "Production-FB" = {
      ecr_repo   = "muvi-fb-service"
      build_proj = aws_codebuild_project.muvi_build.name
      ecs_svc    = "fb-muvi"
    }
    "Production-offer" = {
      ecr_repo   = "muvi-offer"
      build_proj = aws_codebuild_project.muvi_build_offer.name
      ecs_svc    = "offer-muvi"
    }
  }
}

resource "aws_codepipeline" "service" {
  for_each = local.service_pipelines
  name     = each.key
  role_arn = aws_iam_role.codepipeline[each.key].arn

  artifact_store {
    location = "muvi-prod-codepipeline-artifacts"
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "ECR"
      version          = "1"
      output_artifacts = ["SourceOutput"]
      configuration = {
        RepositoryName = each.value.ecr_repo
        ImageTag       = "latest"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["SourceOutput"]
      output_artifacts = ["BuildOutput"]
      configuration = {
        ProjectName = each.value.build_proj
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["BuildOutput"]
      configuration = {
        ClusterName = "Muvi-Production"
        ServiceName = each.value.ecs_svc
      }
    }
  }

  lifecycle {
    ignore_changes = [stage]
  }

  tags = { Name = each.key }
}

# ---------- Website Pipeline ----------
resource "aws_codepipeline" "website" {
  name     = "Production-Website"
  role_arn = aws_iam_role.codepipeline["Production-Website"].arn

  artifact_store {
    location = "muvi-prod-codepipeline-artifacts"
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "ECR"
      version          = "1"
      output_artifacts = ["SourceOutput"]
      configuration = {
        RepositoryName = "muvi-website"
        ImageTag       = "latest"
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["SourceOutput"]
      configuration = {
        ClusterName = "Muvi-Production"
        ServiceName = "website"
      }
    }
  }

  lifecycle {
    ignore_changes = [stage]
  }

  tags = { Name = "Production-Website" }
}

# ---------- CMS Pipeline ----------
resource "aws_codepipeline" "cms" {
  name     = "Production-CMS"
  role_arn = aws_iam_role.codepipeline["Production-CMS"].arn

  artifact_store {
    location = "muvi-prod-codepipeline-artifacts"
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "S3"
      version          = "1"
      output_artifacts = ["SourceOutput"]
      configuration = {
        S3Bucket    = "muvi-cms-prod"
        S3ObjectKey = "build.zip"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["SourceOutput"]
      output_artifacts = ["BuildOutput"]
      configuration = {
        ProjectName = aws_codebuild_project.muvi_cms_build.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "S3"
      version         = "1"
      input_artifacts = ["BuildOutput"]
      configuration = {
        BucketName = "muvi-cms-prod"
        Extract    = "true"
      }
    }
  }

  lifecycle {
    ignore_changes = [stage]
  }

  tags = { Name = "Production-CMS" }
}
