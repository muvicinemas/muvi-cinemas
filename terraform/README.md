# Muvi Production — Terraform Infrastructure

## Overview

Complete Infrastructure-as-Code for the Muvi Cinemas production AWS environment in **eu-central-1** (Frankfurt).

### Resource Coverage

| File | Resources | Count |
|------|-----------|-------|
| `vpc.tf` | VPC, subnets, IGW, NAT, route tables, NACLs, VPC endpoints | ~40 |
| `security-groups.tf` | All security groups (ALB, ECS, RDS, Redis, Proxy, etc.) | ~34 |
| `kms.tf` | KMS keys (RDS, CloudTrail, VA-scan) | 6 |
| `iam.tf` | IAM roles (ECS, CodeBuild, CodePipeline, Lambda, RDS Proxy) | ~90 |
| `ecr.tf` | ECR repositories | 8 |
| `rds.tf` | Aurora clusters, instances, proxies, subnet/param groups | ~50 |
| `elasticache.tf` | Redis replication groups, subnet/param groups | 13 |
| `alb.tf` | 3 ALBs, 9 target groups, 8 listeners | 20 |
| `ecs.tf` | ECS cluster, 9 task definitions, 9 services, autoscaling | ~30 |
| `lambda.tf` | 32 Lambda functions | 32 |
| `s3.tf` | 38 S3 buckets with versioning/encryption | 38 |
| `cloudfront.tf` | 9 CloudFront distributions, 2 OAIs | 11 |
| `api-gateway.tf` | REST API, resources, methods, deployment, custom domain | 10 |
| `waf.tf` | 2 WAF web ACLs (regional + CloudFront) | 2 |
| `acm.tf` | 3 ACM certificates (eu-central-1 + us-east-1) | 3 |
| `route53.tf` | 5 hosted zones | 5 |
| `eventbridge.tf` | 37 EventBridge rules + targets | 74 |
| `cloudtrail.tf` | 3 CloudTrail trails | 3 |
| `cloudwatch.tf` | Log groups, metric filters, alarms, dashboards | ~100+ |
| `sns.tf` | 9 SNS topics, subscriptions, policies | 15 |
| `backup.tf` | 2 vaults, 4 backup plans | 6 |
| `codepipeline.tf` | 9 CodePipelines, 12 CodeBuild projects | 21 |
| `step-functions.tf` | 1 Step Function state machine | 1 |
| `ec2.tf` | 3 EC2 instances, 3 key pairs | 6 |
| `dynamodb.tf` | Terraform lock table | 1 |
| `secrets.tf` | 22 Secrets Manager secrets | 22 |
| `ssm.tf` | 57 SSM parameters | 57 |

**Total: ~700+ resources**

## Getting Started

### Prerequisites
- Terraform >= 1.5.0
- AWS CLI configured with `muvi-prod` profile
- Access to S3 backend bucket `terraform-statefile-muvi`

### Initialize

```bash
cd terraform/
export AWS_PROFILE=muvi-prod
terraform init
```

### Import Existing Resources

Since all resources already exist in AWS, they must be imported into the Terraform state:

```bash
chmod +x import.sh
./import.sh 2>&1 | tee import.log
```

### Plan & Apply

```bash
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CloudFront (9)                        │
│  api / website / media / cms / dashboard / DR(3) / go    │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                     WAF (2 ACLs)                          │
│  OTP-ACL (Regional) │ Backend-ACL (CloudFront)            │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│            ALB Public (Muvi-Prod)                │
│  → gateway TG → ticket TG                       │
├─────────────────────────────────────────────────┤
│        ALB Internal (Muvi-Microservices)         │
│  → identity/main/payment/fb/notification/offer   │
├─────────────────────────────────────────────────┤
│        ALB Website (Muvi-Website-ALB)            │
│  → website TG                                    │
└────────────────────────┬────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│           ECS Cluster (Muvi-Production)          │
│  9 Fargate services, auto-scaling                │
│  gateway│identity│main│payment│notification      │
│  fb│offer│website│ticket                         │
└─────────┬───────────────────────┬───────────────┘
          │                       │
┌─────────▼──────────┐  ┌────────▼────────────────┐
│  RDS Proxies (6)   │  │  ElastiCache Redis (9)  │
│  → Aurora PG (7)   │  │  gateway│identity│main   │
│  main│identity│pay │  │  payment│notification│fb │
│   notif│fb│offer   │  │  offer│shared│bulk-refund│
└────────────────────┘  └─────────────────────────┘
```

## Important Notes

1. **State Backend**: Uses S3 (`terraform-statefile-muvi`) with DynamoDB locking (`muvi-tf-lockid`)
2. **Sensitive Values**: RDS passwords, SSM parameter values, and secrets use `lifecycle { ignore_changes }` — Terraform won't overwrite deployed values
3. **CI/CD Compatibility**: ECS task definitions and services use `ignore_changes` on container definitions and task definitions to avoid reverting deployments
4. **Lambda Code**: All Lambda functions use `ignore_changes` on source code — code is deployed separately
5. **CloudWatch Dashboards**: Dashboard bodies use `ignore_changes` — update via AWS Console

## File Structure

```
terraform/
├── main.tf              # Provider, backend, data sources
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── vpc.tf               # Networking
├── security-groups.tf   # Security groups
├── kms.tf               # KMS encryption keys
├── iam.tf               # IAM roles & policies
├── ecr.tf               # Container registries
├── rds.tf               # Aurora PostgreSQL databases
├── elasticache.tf       # Redis clusters
├── alb.tf               # Load balancers
├── ecs.tf               # ECS services & tasks
├── lambda.tf            # Lambda functions
├── s3.tf                # S3 buckets
├── cloudfront.tf        # CDN distributions
├── api-gateway.tf       # API Gateway
├── waf.tf               # Web Application Firewall
├── acm.tf               # SSL certificates
├── route53.tf           # DNS zones
├── eventbridge.tf       # Scheduled events/crons
├── cloudtrail.tf        # Audit logging
├── cloudwatch.tf        # Monitoring & alerts
├── sns.tf               # Notifications
├── backup.tf            # Backup plans
├── codepipeline.tf      # CI/CD pipelines
├── step-functions.tf    # Step Functions
├── ec2.tf               # Bastion hosts
├── dynamodb.tf          # DynamoDB tables
├── secrets.tf           # Secrets Manager
├── ssm.tf               # SSM parameters
├── import.sh            # Resource import script
└── .gitignore           # Ignore state & secrets
```
