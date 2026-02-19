# Muvi Cinemas — Production Infrastructure Report

> **Source Account**: `011566070219` (eu-central-1, Frankfurt)  
> **DR Region**: eu-west-1 (Ireland)  
> **Target UAT Account**: `739991759290` (me-central-1, UAE)  
> **Generated**: June 2025 via AWS CLI discovery

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [ECS Fargate — Compute](#2-ecs-fargate--compute)
3. [Aurora PostgreSQL — Databases](#3-aurora-postgresql--databases)
4. [ElastiCache Redis](#4-elasticache-redis)
5. [Load Balancers](#5-load-balancers)
6. [CloudFront CDN](#6-cloudfront-cdn)
7. [WAF — Web Application Firewall](#7-waf--web-application-firewall)
8. [S3 Buckets](#8-s3-buckets)
9. [Lambda Functions](#9-lambda-functions)
10. [EventBridge Rules (Cron Jobs)](#10-eventbridge-rules-cron-jobs)
11. [CI/CD Pipelines](#11-cicd-pipelines)
12. [VPC & Networking](#12-vpc--networking)
13. [DNS & Certificates](#13-dns--certificates)
14. [Secrets & Parameters](#14-secrets--parameters)
15. [Monitoring & Alarms](#15-monitoring--alarms)
16. [Backup & DR](#16-backup--dr)
17. [Other Services](#17-other-services)
18. [UAT Replication Plan](#18-uat-replication-plan)
19. [Cost Estimation](#19-cost-estimation)
20. [Key Differences: Prod vs UAT](#20-key-differences-prod-vs-uat)

---

## 1. Executive Summary

Production runs **9 ECS Fargate services** (39 tasks), **6 Aurora PostgreSQL clusters** with **6 RDS Proxies**, **9 Redis clusters**, **3 ALBs**, **9 CloudFront distributions**, **32 Lambda functions**, across a **3-tier VPC** with DR warm standby in Ireland.

**Total Compute at Baseline**:
- **66 vCPU** / **132 GB RAM** (ECS Fargate)
- Auto-scales up to **570 vCPU** (all services at max)

**Critical Finding**: A `ticket` service exists in production but is **NOT in the codebase** — it's a clone of `muvi-main` using the same Docker image (`muvi-main:latest`), dedicated to ticket processing.

---

## 2. ECS Fargate — Compute

### Cluster: `Muvi-Production` (eu-central-1)

| Service | Running Tasks | CPU (vCPU) | Memory (GB) | Task Def Rev | Docker Image | Container Port | AutoScale Min→Max |
|---------|:---:|:---:|:---:|---|---|:---:|---|
| **gateway** | 7 | 1 | 2 | muvi-gateway:169 | `muvi-gateway:f01ef16` | 3001 | 7 → 120 |
| **identity-grpc** | 7 | 1 | 2 | muvi-identity:136 | `muvi-identity:*` | 5005 | 7 → 100 |
| **main-grpc** | 7 | **4** | **8** | muvi-main:293 | `muvi-main:97462bd` | 5002 | 7 → 100 |
| **website** | 5 | 1 | 2 | muvi-website:147 | `muvi-website:*` | 80 | 5 → 100 |
| **payment-grpc** | 3 | 1 | 2 | muvi-payment:191 | `muvi-payment:*` | 5003 | 3 → 100 |
| **offer-muvi** | 3 | 2 | 4 | muvi-offer:49 | `muvi-offer:*` | 5006 | 3 → 10 |
| **fb-muvi** | 3 | 2 | 4 | muvi-fb:70 | `muvi-fb:*` | 5004 | 3 → 15 |
| **notification-grpc** | 2 | 1 | 2 | muvi-notification:126 | `muvi-notification:*` | 5007 | 2 → 25 |
| **ticket** ⚠️ | 2 | 1 | 2 | muvi-ticket:147 | `muvi-main:latest` | 5002 | 2 → 100 |

**Total Baseline**: 39 tasks × (avg ~1.7 vCPU) = **66 vCPU, 132 GB RAM**

> **Every service has a Datadog agent sidecar container** for log/metric collection.

### Auto-Scaling Policies (TargetTrackingScaling)

| Service | Policies |
|---------|----------|
| gateway | CPU Utilization, Memory Utilization, Request Count |
| identity-grpc | CPU Utilization, Memory Utilization, Request Count |
| main-grpc | CPU Utilization, Memory Utilization, Request Count |
| website | CPU Utilization, Memory Utilization, Request Count |
| payment-grpc | CPU Utilization, Memory Utilization, Request Count |
| offer-muvi | CPU Scaling, Memory Scaling, Request Count |
| fb-muvi | CPU Scaling, Memory Scaling, Request Count |
| notification-grpc | CPU Utilization, Memory Utilization, Request Count |
| ticket | CPU Utilization, RAM Utilization |

### Key Environment Variables (from Gateway task def)

| Variable | Value | Notes |
|----------|-------|-------|
| `SSM_REGION` | eu-central-1 | SSM Parameter Store region |
| `S3_REGION` | eu-west-1 | Media assets in Ireland S3 |
| `S3_BUCKET` | muvi-media-prod | Media bucket |
| `SERVER_PORT` | 3001 | Gateway port (NOT 3000 like UAT) |
| `BASE_URLS` | https://api-gateway.prod.muvicinemas.com/api/v1 | |
| `IDENTITY_SERVICE_PORT` | 5005 | gRPC port |
| `MAIN_SERVICE_PORT` | 5002 | gRPC port |
| `NOTIFICATION_SERVICE_HOST` | notification.prod.microservices.internal | Internal ALB DNS |
| `REDIS_PORT` | 6379 | Standard Redis port |
| `DATADOG_HOST` | http-intake.logs.datadoghq.eu | EU Datadog endpoint |

### DR Region (eu-west-1) — Cluster: `Production`

| Service | Status |
|---------|--------|
| gateway | **Scaled to 0** |
| identity-grpc | **Scaled to 0** |
| main-grpc | **Scaled to 0** |
| website | **Scaled to 0** |
| payment-grpc | **Scaled to 0** |
| notification-grpc | **Scaled to 0** |

> **Not in DR**: fb-muvi, offer-muvi, ticket

---

## 3. Aurora PostgreSQL — Databases

### Active Clusters (6)

| Cluster | Engine Version | Writer Class | Reader Class | RDS Proxy | Encrypted | Backup Retention |
|---------|:---:|:---:|:---:|---|:---:|:---:|
| **muvi-prod-main-service** | 14.17 | **db.r5.2xlarge** | **db.r5.2xlarge** | main-proxy | ✅ | 7 days |
| **muvi-prod-identity** | 14.15 | db.r5.xlarge | db.r5.xlarge | identity-proxy | ✅ | 7 days |
| **muvi-prod-payments-recovered-cluster** | 14.15 | db.r5.xlarge | db.r5.xlarge | payment-proxy | ✅ | 7 days |
| **muvi-prod-fb** | 14.17 | db.r5.large | db.r5.large | fb-proxy | ✅ | 7 days |
| **muvi-offer-prod** | 14.17 | db.r5.large | db.r5.large | offer-proxy | ✅ | 7 days |
| **muvi-prod-notification** | 14.15 | db.r5.large | ❌ No reader | notification-proxy | ✅ | 7 days |

### Stopped/Migration

| Cluster | Engine Version | Instance Class | Status |
|---------|:---:|:---:|---|
| prod-alldb-mig | 17.4 | db.t3.medium | **STOPPED** |

### RDS Proxies (6)

Every database has an RDS Proxy (PostgreSQL engine family) with **both writer and read-only endpoints**:

| Proxy Name | Read-Only Endpoint | Status |
|---|---|---|
| main-proxy | main-proxy-read-only | available |
| identity-proxy | identity-proxy-read-only | available |
| payment-proxy | payment-proxy-read-only | available |
| fb-proxy | fb-proxy-read-only | available |
| offer-proxy | offer-proxy-ro | available |
| notification-proxy | notification-proxy-read-only | available |

### Instance Size Reference

| Class | vCPU | Memory | Use Case |
|-------|:---:|:---:|---|
| db.r5.2xlarge | 8 | 64 GB | Main DB (highest traffic) |
| db.r5.xlarge | 4 | 32 GB | Identity, Payment |
| db.r5.large | 2 | 16 GB | FB, Offer, Notification |

---

## 4. ElastiCache Redis

### Clusters (9)

| Cluster ID | Node Type | Redis Version | Purpose |
|---|:---:|:---:|---|
| foms-redis-prod-main-001 | **cache.r5.large** | 7.0.7 | Main service (Bull queues, caching) |
| foms-redis-prod-notification-001 | **cache.r5.large** | 7.0.7 | Notification queues |
| foms-redis-prod-getway-001 | cache.t3.medium | 7.0.7 | Gateway (rate limiting, sessions) |
| foms-redis-prod-identity-001 | cache.t3.medium | 7.0.7 | Identity (OTP, tokens) |
| foms-redis-prod-paymnet-001 | cache.t3.medium | 7.0.7 | Payment (Pub/Sub events) |
| foms-redis-prod-offer-001 | cache.t3.medium | 7.1.0 | Offer service |
| foms-redis-prod-fb-001 | cache.t3.medium | 7.1.0 | F&B service |
| foms-redis-prod-shared-001 | cache.t3.medium | 7.0.7 | Cross-service shared cache |
| foms-redis-prod-bulk-refund-booking-001 | cache.t3.medium | 7.1.0 | Bulk refund processing |

**Configuration**: All clusters are **single-node, no auto-failover, no Multi-AZ**.

| Node Type | vCPU | Memory | Network |
|---|:---:|:---:|---|
| cache.r5.large | 2 | 13.07 GB | Up to 10 Gbps |
| cache.t3.medium | 2 | 3.09 GB | Up to 5 Gbps |

---

## 5. Load Balancers

### Application Load Balancers (3)

| Name | Scheme | Listeners | Purpose | VPC |
|---|---|---|---|---|
| **Muvi-Prod** | internet-facing | HTTP:80 | API Gateway (CloudFront terminates SSL) | vpc-078c1286f49e3383e |
| **Muvi-Website-ALB** | internet-facing | HTTP:80 | Website (CloudFront terminates SSL) | vpc-078c1286f49e3383e |
| **Muvi-Microservices-Prod** | **internal** | HTTPS:5002-5007 | gRPC inter-service communication | vpc-078c1286f49e3383e |

### Internal ALB Listener Mapping

| Port | Protocol | Service | Health Check |
|:---:|---|---|---|
| 5002 | HTTPS | main-grpc (muvi-main-grpc TG) | /healthCheck.HealthCheckService/HealthCheck |
| 5003 | HTTPS | payment-grpc | /healthCheck.HealthCheckService/HealthCheck |
| 5004 | HTTPS | fb-muvi (muvi-fb-grpc-tg) | /healthCheck.HealthCheckService/HealthCheck |
| 5005 | HTTPS | identity-grpc | /healthCheck.HealthCheckService/HealthCheck |
| 5006 | HTTPS | offer-muvi (muvi-offer-grpc) | /healthCheck.HealthCheckService/HealthCheck |
| 5007 | HTTPS | notification-grpc | /healthCheck.HealthCheckService/HealthCheck |

### Target Groups (8)

| Target Group | Port | Protocol | Target Type | Load Balancer | Health Check |
|---|:---:|---|---|---|---|
| muvi-gateway-tg | 80 | HTTP | IP | Muvi-Prod | /heartbeat |
| muvi-website-tg | 80 | HTTP | IP | Muvi-Website-ALB | /api/healthcheck |
| muvi-main-grpc | 80 | HTTP | IP | Muvi-Microservices-Prod | gRPC health check |
| muvi-identity-tg | 80 | HTTP | IP | Muvi-Microservices-Prod | gRPC health check |
| muvi-payment-grpc | 80 | HTTP | IP | Muvi-Microservices-Prod | gRPC health check |
| muvi-fb-grpc-tg | 80 | HTTP | IP | Muvi-Microservices-Prod | gRPC health check |
| muvi-offer-grpc | 80 | HTTP | IP | Muvi-Microservices-Prod | gRPC health check |
| muvi-notification-grpc | 80 | HTTP | IP | Muvi-Microservices-Prod | gRPC health check |
| muvi-ticket-tg | 80 | HTTP | IP | **Unattached** | gRPC health check |

> ⚠️ `muvi-ticket-tg` exists but is NOT attached to any load balancer.

---

## 6. CloudFront CDN

### Distributions (9)

| # | Alias (Domain) | Origin | WAF | Purpose |
|---|---|---|---|---|
| 1 | **api.prod.muvicinemas.com** | Muvi-Prod ALB (eu-central-1) | Backend-ACL ✅ | API Gateway |
| 2 | **muvicinemas.com** | Muvi-Website-ALB (eu-central-1) | Backend-ACL ✅ | Public Website |
| 3 | **dashboard.muvicinemas.com** | muvi-cms-prod S3 (eu-central-1) | ❌ | CMS Dashboard |
| 4 | **media.prod.muvicinemas.com** | muvi-media-prod S3 (eu-central-1) | ❌ | Media/Assets CDN |
| 5 | **api-dr.prod.muvicinemas.com** | Muvi-Prod ALB (eu-west-1) | ❌ | API DR |
| 6 | **app-dr.prod.muvicinemas.com** | Website ALB (eu-west-1) | Backend-ACL ✅ | Website DR |
| 7 | **cms-dr.prod.muvicinemas.com** | muvi-cms-prod-dr S3 (eu-west-1) | ❌ | CMS DR |
| 8 | **media-dr.prod.muvicinemas.com** | muvi-media-prod-dr S3 (eu-west-1) | ❌ | Media DR |
| 9 | **go.muvicinemas.com** | eu.spgo.io | ❌ | URL Shortener (SpGo) |

All distributions use **PriceClass_All** (all edge locations globally).

---

## 7. WAF — Web Application Firewall

### Backend-ACL (CloudFront Scope — us-east-1)

Applied to: API CloudFront, Website CloudFront, DR Website CloudFront

| Priority | Rule Name | Type |
|:---:|---|---|
| 1 | LimitBlock | Custom |
| 2 | block-rate-otp | Custom (OTP rate limiting) |
| 3 | Allow-White-List-Rule | Custom (IP whitelist) |
| 4 | Block-Black-List-Rule | Custom (IP blacklist) |
| 5 | AWS-AWSManagedRulesCommonRuleSet | AWS Managed |
| 6 | Throttling-Rule | Custom |
| 7 | padmini-malayalam | Custom (content filter?) |
| 8 | AWS-AWSManagedRulesAdminProtectionRuleSet | AWS Managed |
| 9 | AWS-AWSManagedRulesAmazonIpReputationList | AWS Managed |
| 10 | AWS-AWSManagedRulesAnonymousIpList | AWS Managed |
| 11 | AWS-AWSManagedRulesKnownBadInputsRuleSet | AWS Managed |
| 12 | AWS-AWSManagedRulesLinuxRuleSet | AWS Managed |
| 13 | AWS-AWSManagedRulesSQLiRuleSet | AWS Managed |

### OTP-ACL (Regional Scope — eu-central-1)

Applied to ALBs for additional OTP endpoint rate limiting.

---

## 8. S3 Buckets

### Application Buckets (6)

| Bucket | Purpose |
|---|---|
| `muvi-media-prod` | Film posters, banners, user uploads (CloudFront origin) |
| `muvi-media-prod-dr` | DR replica of media bucket (eu-west-1) |
| `muvi-cms-prod` | CMS static frontend (S3 website hosting, CloudFront origin) |
| `muvi-cms-prod-dr` | DR replica of CMS (eu-west-1) |
| `muvi-menu-public` | F&B menu images/assets |
| `alpha-zero-store` | App store / general storage |

### CI/CD Artifact Buckets (11)

| Bucket | Purpose |
|---|---|
| `gitlab-muvi-gateway` | Gateway CI artifacts |
| `gitlab-muvi-identity` | Identity CI artifacts |
| `gitlab-main-muvi` | Main CI artifacts |
| `gitlab-muvi-payment` | Payment CI artifacts |
| `gitlab-muvi-notification` | Notification CI artifacts |
| `gitlab-muvi-fb` | F&B CI artifacts |
| `gitlab-muvi-cms` | CMS CI artifacts |
| `gitlab-website-muvi` | Website CI artifacts |
| `gitlab-gateway-muvi` | Gateway (duplicate?) |
| `gitlab-identity-muvi` | Identity (duplicate?) |
| `codepipeline-eu-central-1-288456816626` | CodePipeline artifacts |

### Logging & Security Buckets (8)

| Bucket | Purpose |
|---|---|
| `aws-cloudtrail-logs-011566070219-95d0077e` | CloudTrail audit logs |
| `aws-waf-logs-backend-acl` | WAF Backend-ACL logs |
| `aws-waf-logs-otp-acl` | WAF OTP-ACL logs |
| `waf-backend-acl-logs` | WAF logs (alternate) |
| `muvi-alb-accesslogs` | ALB access logs |
| `muvi-microservices-prod-internal-alb-logs` | Internal ALB logs |
| `muvi-microservices-load-balancer` | LB logs |
| `muvi-datadog-archives` | Datadog log archives |

### Infrastructure Buckets (5)

| Bucket | Purpose |
|---|---|
| `terraform-statefile-muvi` | Terraform state |
| `tf-state-file-bkt` | Terraform state (secondary) |
| `cf-templates-1evx9rkccyvvq-eu-central-1` | CloudFormation templates |
| `cf-templates-1evx9rkccyvvq-eu-west-1` | CloudFormation templates (DR) |
| `config-bucket-011566070219` | AWS Config logs |

### Other (8)

| Bucket | Purpose |
|---|---|
| `muvi-athena` | Athena query data |
| `aws-athena-query-results-eu-central-1-011566070219` | Athena results |
| `awsdatasecurityscanlogs` | Security scan logs |
| `securityaccesslogs-muvi-prod` | Security access logs |
| `muvi-prd-inspector-va-scan` | Inspector vulnerability scans |
| `muvi-replication-completion-reports` | S3 replication reports |
| `bluepi-billing-cur2-7-011566070219-*` | Cost & Usage Reports |
| `cf-templates--9nyo4zgvsgwj-me-south-1` | CF templates (Bahrain) |

**Total: 38 S3 buckets**

---

## 9. Lambda Functions

### Vista Sync Functions (6)

| Function | Runtime | Memory | Timeout | Schedule |
|---|---|:---:|:---:|---|
| sync-films-prod | nodejs16.x | 128 MB | 3s | Every 30 min |
| sync-sessions-prod | nodejs16.x | 128 MB | 3s | Every 20 min |
| sync-cinemas | nodejs16.x | 128 MB | 3s | Bi-monthly |
| sync-genres-prod | nodejs16.x | 128 MB | 3s | Every 2 hours |
| sync-person-prod | nodejs16.x | 128 MB | 3s | Every 30 min |
| sync-concessions | nodejs20.x | 128 MB | 3s | 3x daily (05:00, 09:00, 13:00) |

### Cleanup Functions (7)

| Function | Runtime | Memory | Timeout | Schedule |
|---|---|:---:|:---:|---|
| clean-sessions-production | nodejs20.x | **1024 MB** | **900s** | Midnight daily |
| clean-orders-production | nodejs20.x | 256 MB | 900s | Midnight daily |
| clear-orders-fb | nodejs20.x | 128 MB | 900s | 02:00 daily |
| delete-old-notifications | nodejs20.x | 128 MB | 3s | 08:00 daily |
| unpublished-old-films | nodejs20.x | 128 MB | 30s | 1st of month |
| terminate-pending-sync-process | nodejs18.x | 128 MB | 3s | Every 10 min |
| process-expired-cashback-transaction | nodejs22.x | 128 MB | 120s | 21:00 daily |

### Customer Engagement Functions (4)

| Function | Runtime | Memory | Timeout | Schedule |
|---|---|:---:|:---:|---|
| birthday-notification-prod | nodejs16.x | 512 MB | 60s | 11:00 daily |
| user-anniversary-prod | nodejs16.x | 128 MB | 300s | 12:00 daily |
| cron-survey-prod | nodejs16.x | 512 MB | 60s | Every 5 min (DISABLED) |
| survey-email-prod | nodejs16.x | 128 MB | 3s | Every 15 min (DISABLED) |

### Operations Functions (4)

| Function | Runtime | Memory | Timeout | Schedule |
|---|---|:---:|:---:|---|
| cron-cancel-expired-prod | nodejs16.x | 128 MB | 60s | Every 10 min |
| cron-reminder-prod | nodejs16.x | 128 MB | 3s | Every 30 min |
| cron-reminder-transaction | nodejs16.x | 128 MB | 60s | Specific hours |
| cron-check-and-update-stock-status | nodejs18.x | 128 MB | 63s | Every hour |

### Auto-Scaling Functions (5)

| Function | Runtime | Memory | Timeout | Purpose |
|---|---|:---:|:---:|---|
| ECS-main-grpc-tasks-SCALE_UP | python3.10 | 128 MB | 63s | Scale up main-grpc ECS tasks |
| ECS-main-grpc-tasks-SCALE_DOWN | python3.10 | 128 MB | 63s | Scale down main-grpc ECS tasks |
| RDS-WeekEnd-ScaleOut | python3.10 | 128 MB | 30s | Scale up RDS on weekends |
| RDS-WeekEnd-Scale-in | python3.10 | 128 MB | 10s | Scale down RDS on weekdays |
| weekend-ECSscaling | python3.10 | 128 MB | 15s | Weekend ECS scaling |

### Utility Functions (4)

| Function | Runtime | Memory | Timeout | Purpose |
|---|---|:---:|:---:|---|
| ewallet-transactions-export | nodejs18.x | **2048 MB** | **900s** | Export e-wallet transactions |
| InvalidateCache | nodejs16.x | 128 MB | 600s | Invalidate CloudFront cache |
| S3_to_Blob | python3.10 | 128 MB | 240s | Copy S3 assets to Azure Blob |
| Lambda_to_stepfunction | python3.10 | 128 MB | 63s | Trigger Step Functions |

### Other (2)

| Function | Runtime | Memory | Timeout |
|---|---|:---:|:---:|
| DatadogIntegration-DatadogA-DatadogAPICallFunction | python3.8 | 128 MB | 30s |
| event-test | python3.13 | 128 MB | 3s |

**Total: 32 Lambda functions**

---

## 10. EventBridge Rules (Cron Jobs)

### Vista Sync Schedules

| Rule | Schedule | Lambda Target |
|---|---|---|
| film-sync | `*/30 * ? * * *` (every 30 min) | sync-films-prod |
| sync-sessions | `0/20 * * * ? *` (every 20 min) | sync-sessions-prod |
| sync-sessions-mid-night | `0 22-14 ? * * *` (extended hours) | sync-sessions-prod |
| sync-cinemas | `0 0 1 */2 ? *` (bi-monthly) | sync-cinemas |
| sync-genres | `0 */2 ? * * *` (every 2 hours) | sync-genres-prod |
| person-sync | `*/30 * ? * * *` (every 30 min) | sync-person-prod |
| sync-concessions | `0 5,9,13 * * ? *` (3x/day) | sync-concessions |

### Cleanup Schedules

| Rule | Schedule | Lambda Target |
|---|---|---|
| clean-sessions-production | `0 0 * * ? *` (midnight) | clean-sessions-production |
| clean-orders-production | `0 0 * * ? *` (midnight) | clean-orders-production |
| clean-order-fb | `0 2 * * ? *` (02:00) | clear-orders-fb |
| delete-old-notifications-event | `0 8 * * ? *` (08:00) | delete-old-notifications |
| unpublished-old-films | `0 2 1 * ? *` (1st of month) | unpublished-old-films |
| terminate-pending-sync-process | `rate(10 minutes)` | terminate-pending-sync-process |
| process-expired-cashback-transaction | `0 21 * * ? *` (21:00) | process-expired-cashback |

### Operations Schedules

| Rule | Schedule | Lambda Target | Status |
|---|---|---|---|
| cron-cancel-expired | `*/10 * * * ? *` (every 10 min) | cron-cancel-expired-prod | ENABLED |
| cron-reminder-order | `rate(30 minutes)` | cron-reminder-prod | ENABLED |
| cron-reminder-transaction | `0 21-03,07-11 * * ? *` | cron-reminder-transaction | ENABLED |
| cron-check-and-update-stock-status | `0 * * * ? *` (hourly) | cron-check-and-update-stock | ENABLED |
| birthday-notification | `0 11 * * ? *` (11:00) | birthday-notification-prod | ENABLED |
| user-anniversary | `0 12 * * ? *` (12:00) | user-anniversary-prod | ENABLED |
| cron-survey-notification | `*/5 * * * ? *` | cron-survey-prod | **DISABLED** |
| cron-survey-email-prod | `*/15 * * * ? *` | survey-email-prod | **DISABLED** |

### CI/CD Event Rules

| Rule | Purpose |
|---|---|
| CopyProdToStaging-muvi-gateway | ECR image push → copy to staging |
| CopyProdToStaging-muvi-identity | ECR image push → copy to staging |
| CopyProdToStaging-muvi-main | ECR image push → copy to staging |
| CopyProdToStaging-muvi-notification | ECR image push → copy to staging |
| CopyProdToStaging-muvi-payment | ECR image push → copy to staging |
| CopyProdToStaging-muvi-website | ECR image push → copy to staging |

---

## 11. CI/CD Pipelines

### CodePipeline (9 Pipelines)

| Pipeline | Source → Stages |
|---|---|
| Production-Gateway | CodeStar Source → **Manual Approval** → CodeBuild → Azure Blob Copy → ECS Deploy |
| Production-Identity | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-Main | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-Payment | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-Notification | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-FB | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-offer | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-Website | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS Deploy |
| Production-CMS | CodeStar Source → Manual Approval → CodeBuild → Azure Blob → ECS/S3 Deploy |

> **Key**: Every pipeline has a **Manual Approval** gate and an **Azure Blob** stage (copies build artifacts to Azure).

### ECR Repositories (8)

| Repository | URI |
|---|---|
| muvi-gateway | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-gateway |
| muvi-identity | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-identity |
| muvi-main | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-main |
| muvi-payment | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-payment |
| muvi-notification | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-notification |
| muvi-fb | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-fb |
| muvi-offer | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-offer |
| muvi-website | 011566070219.dkr.ecr.eu-central-1.amazonaws.com/muvi-website |

> **Note**: No separate ECR repo for `ticket` — it uses `muvi-main:latest`.

---

## 12. VPC & Networking

### VPC

| Name | CIDR | VPC ID | Purpose |
|---|---|---|---|
| Muvi-VPC | 10.230.0.0/16 | vpc-078c1286f49e3383e | Production workloads |
| Default VPC | 172.31.0.0/16 | vpc-01b9b60da94db4af9 | AWS default (unused) |
| prismacloud-scan-* | 10.0.0.0/16 | vpc-0353ac4b1fbc0d469 | Security scanning |

### Subnets (9 across 3 AZs)

| Tier | AZ-a | AZ-b | AZ-c |
|---|---|---|---|
| **Public** (ALBs, NAT GW) | 10.230.1.0/24 | 10.230.2.0/24 | 10.230.3.0/24 |
| **NAT** (ECS tasks) | 10.230.4.0/24 | 10.230.5.0/24 | 10.230.6.0/24 |
| **Private** (RDS, Redis) | 10.230.7.0/24 | 10.230.8.0/24 | 10.230.9.0/24 |

### NAT Gateway

| NAT GW ID | Subnet | Public IP | State |
|---|---|---|---|
| nat-084762c0476c4fe74 | Public-c (subnet-037c958cfdc279ac6) | 18.158.143.26 | available |

> ⚠️ **Single NAT Gateway** — not HA. If AZ-c goes down, all outbound internet traffic stops.

### VPC Endpoints (16)

| Service | Type | Purpose |
|---|---|---|
| S3 | Gateway | S3 access without NAT GW |
| S3 | Interface | S3 access (alternative) |
| S3 Global Accesspoint | Interface | Cross-region S3 |
| Application Auto Scaling | Interface | Auto-scaling API |
| Datadog PrivateLink (×12) | Interface | Datadog agent communication |

### Service Discovery (Cloud Map)

| Namespace | Type | Services |
|---|---|---|
| internal | DNS_PRIVATE | gateway, website |

> Other microservices use the **internal ALB** (`Muvi-Microservices-Prod`) for routing via private hosted zone `prod.microservices.internal`.

### Security Groups (~40)

| Category | Groups |
|---|---|
| **ECS Services** | Muvi-Gateway-ECS, Muvi-Identity-ECS, Muvi-Main-ECS, Muvi-Payment-ECS, Muvi-FB-ECS, Muvi-offer-ECS, Muvi-Notification-ECS, Muvi-Website-ECS, muvi-ticket-sg |
| **ALBs** | Muvi-Prod-ALB, Muvi-Microservices-Prod-SG, Muvi-Website-SG |
| **RDS** | Muvi-Prod-RDS-sg, Muvi-identity-prod-rds-sg, muvi-prod-payment-service-RDS-sg, Muvi-notification-prod-rds-sg, muvi-prod-fb-rds-sg, muvi-prod-offer-rds-sg |
| **RDS Proxies** | proxy-main-sg, proxy-identity-sg, proxy-payment-sg, proxy-notification-sg, proxy-fb-sg, proxy-offer-sg |
| **Redis** | muvi-redis-sg, offer-redis-sg, fb-redis-sg, muvi-redis-notification-sg, bulk-refund-booking-redis-sg, redis-shared-sg |
| **Lambda** | lambda-clean-orders, lambda-ewallet-transactions-export, unpublished-old-films-SG, Lambda Functions (clean orders & clean sessions) |
| **Other** | VPC-Endpoint-SG, Jumpbox-sg, DB-Preparation-SG, DB-migration-SG, ALLDB-MIGRATION-SG, temp-JB |

---

## 13. DNS & Certificates

### Route 53 Hosted Zones

| Zone | Type | Records | Purpose |
|---|---|:---:|---|
| **muvicinemas.com** | Public | 161 | Main public DNS |
| **prod.microservices.internal** | Private | 20-23 | Internal service discovery |
| **internal** | Private | 2-14 | Cloud Map namespace |

### ACM Certificates

| Domain | Region | Scope |
|---|---|---|
| `*.prod.muvicinemas.com` | us-east-1 | CloudFront |
| `*.muvicinemas.com` | us-east-1 | CloudFront |
| `prod.microservices.internal` | eu-central-1 | Internal ALB (HTTPS gRPC) |

---

## 14. Secrets & Parameters

### Secrets Manager (22 secrets)

| Category | Secrets |
|---|---|
| **RDS Credentials** (6) | prod/main/rds, prod/identity/rds, prod/payment/rds, prod/notification/rds, prod/fb/rds, OfferDBSecret |
| **Internal ALB Certs** (6) | prod/gateway/lb/certificate, prod/main/lb/certificate, prod/identity/lb/certificate, prod/payment/lb/certificate, prod/notification/lb/certificate, prod/fb/lb/certificate |
| **Apple Pay Certs** (5) | HyperPay cert+key, Checkout cert+key, PayFort key |
| **Other** (3) | NearPay private key, Braze API key, RDS auto-generated creds |

### SSM Parameter Store

Services load configuration from SSM Parameter Store (referenced by `SSM_ACCESS_KEY_ID` env var in task definitions). Parameters are organized by service path.

---

## 15. Monitoring & Alarms

### CloudWatch Alarms (~99 total)

| Category | Count | Examples |
|---|:---:|---|
| **ECS Auto-Scaling** | ~78 | TargetTracking high/low for each service (CPU, Memory, Request Count) |
| **RDS Auto-Scaling** | ~12 | TargetTracking for Aurora cluster scaling |
| **DynamoDB** | ~6 | TargetTracking for Terraform lock table |
| **Security** | ~14 | Console sign-in failures, unauthorized API calls, root usage, VPC changes, IAM changes, S3 policy changes, route table changes, SG changes, CMK deletions, CloudTrail config changes |

### Datadog Integration

- **Every ECS task** has a Datadog agent sidecar
- Logs shipped to `http-intake.logs.datadoghq.eu` (EU endpoint)
- Archives stored in `muvi-datadog-archives` S3 bucket
- **PrivateLink** endpoints (12) for secure agent → Datadog communication
- SNS topic `Guarduty-Findings-Datadog` routes GuardDuty findings to Datadog

### SNS Topics (9)

| Topic | Purpose |
|---|---|
| Production-CMS | CMS pipeline notifications |
| Production-Website | Website pipeline notifications |
| Security-Alarms | CloudWatch security alarm notifications |
| Trigger_Lambda_Step_Function | Trigger Step Functions via SNS |
| Jira-Notification | Jira integration alerts |
| bespin | Managed services provider alerts |
| codestar-notifications-prod | CodeStar CI/CD notifications |
| AWS_Data_Scan | Data security scan results |
| CloudTrail logs | CloudTrail event notifications |

---

## 16. Backup & DR

### AWS Backup Plans (4)

| Plan | Purpose |
|---|---|
| S3-Backup | S3 bucket backups |
| Media-Backup | Media assets backup |
| RDS-DR-To-Ireland-1 | RDS snapshot replication to eu-west-1 |
| RDS-DR-To-Ireland-3 | RDS snapshot replication to eu-west-1 (additional) |

### DR Architecture (eu-west-1, Ireland)

| Component | Primary (eu-central-1) | DR (eu-west-1) | Status |
|---|---|---|---|
| ECS Cluster | Muvi-Production (39 tasks) | Production (0 tasks) | Warm standby |
| ECS Services | 9 services | 6 services | Scaled to 0 |
| RDS | 6 Aurora clusters | Backup snapshots only | Cold |
| S3 Media | muvi-media-prod | muvi-media-prod-dr | Replicated |
| S3 CMS | muvi-cms-prod | muvi-cms-prod-dr | Replicated |
| CloudFront | 5 primary distributions | 3 DR distributions | Active |
| ALB | 3 ALBs | 2 ALBs (assumed) | Idle |

> **Missing from DR**: fb-muvi, offer-muvi, ticket services

---

## 17. Other Services

| Service | Details |
|---|---|
| **Step Functions** | `Step-Function-LambdaECS` — orchestrates ECS scaling (triggered by Lambda_to_stepfunction) |
| **DynamoDB** | `muvi-tf-lockid` — Terraform state lock table (auto-scaling enabled) |
| **SQS** | None (app uses Bull queues via Redis) |
| **Terraform** | State in `terraform-statefile-muvi` S3 + DynamoDB lock |
| **CloudFormation** | Templates in S3, used alongside Terraform |
| **Inspector** | Enabled (EC2, ECR, Lambda scanning) |
| **GuardDuty** | Enabled (findings → Datadog via SNS) |
| **CloudTrail** | Enabled (logs in S3) |
| **AWS Config** | Enabled (config in S3) |
| **Athena** | Query engine for log analysis |
| **DevOps Guru** | Enabled with CodeGuru Profiler |

---

## 18. UAT Replication Plan

### Phase 1: Foundation (VPC & Networking)

```
Region: me-central-1 (UAE)
Target Account: 739991759290
```

| Resource | Prod Config | UAT Config (Recommended) |
|---|---|---|
| VPC CIDR | 10.230.0.0/16 | 10.240.0.0/16 (or keep 10.230.0.0/16) |
| Subnets | 9 (3×Public, 3×NAT, 3×Private) across 3 AZs | Same layout, 2 AZs minimum |
| NAT Gateway | 1 (single AZ) | 1 (match prod — save costs) |
| VPC Endpoints | S3 Gateway, Auto Scaling, Datadog PrivateLink | S3 Gateway only (save costs) |
| Security Groups | ~40 | Mirror pattern but consolidate where possible |

### Phase 2: Data Layer

| Resource | Prod Config | UAT Config (Recommended) |
|---|---|---|
| Aurora Main | db.r5.2xlarge (writer+reader) | **db.r6g.large** (writer only) |
| Aurora Identity | db.r5.xlarge (writer+reader) | **db.r6g.medium** (writer only) |
| Aurora Payment | db.r5.xlarge (writer+reader) | **db.r6g.medium** (writer only) |
| Aurora FB | db.r5.large (writer+reader) | **db.r6g.medium** (writer only) |
| Aurora Offer | db.r5.large (writer+reader) | **db.r6g.medium** (writer only) |
| Aurora Notification | db.r5.large (writer only) | **db.r6g.medium** (writer only) |
| RDS Proxies | 6 proxies (writer+reader endpoints) | **Skip for UAT** (connect direct) |
| Redis (main, notification) | cache.r5.large | **cache.t3.small** |
| Redis (others) | cache.t3.medium | **cache.t3.micro** or single shared instance |
| Redis total | 9 separate clusters | **3 clusters** (shared per tier) |

### Phase 3: Compute (ECS)

| Service | Prod Tasks | UAT Tasks (Recommended) |
|---|:---:|:---:|
| gateway | 7 (1 vCPU / 2 GB) | **1** (0.5 vCPU / 1 GB) |
| identity-grpc | 7 (1 vCPU / 2 GB) | **1** (0.5 vCPU / 1 GB) |
| main-grpc | 7 (4 vCPU / 8 GB) | **1** (1 vCPU / 2 GB) |
| website | 5 (1 vCPU / 2 GB) | **1** (0.5 vCPU / 1 GB) |
| payment-grpc | 3 (1 vCPU / 2 GB) | **1** (0.5 vCPU / 1 GB) |
| offer-muvi | 3 (2 vCPU / 4 GB) | **1** (0.5 vCPU / 1 GB) |
| fb-muvi | 3 (2 vCPU / 4 GB) | **1** (0.5 vCPU / 1 GB) |
| notification-grpc | 2 (1 vCPU / 2 GB) | **1** (0.5 vCPU / 1 GB) |
| ticket | 2 (1 vCPU / 2 GB) | **0** (same as main, not needed) |
| **Total** | **39 tasks / 66 vCPU** | **8 tasks / 4.5 vCPU** |

### Phase 4: CDN & Edge

| Resource | Prod Config | UAT Config |
|---|---|---|
| CloudFront | 9 distributions | 3 (API, Website, Media) |
| WAF | Backend-ACL (13 rules) + OTP-ACL | Basic rate limiting only |
| ACM Certs | 3 certs (2×us-east-1, 1×eu-central-1) | 2 certs (wildcard + internal) |

### Phase 5: Load Balancers

| Resource | Prod Config | UAT Config |
|---|---|---|
| Internet-facing ALBs | 2 (API + Website) | 1 (combined) or 2 |
| Internal ALB | 1 (6 listeners for gRPC) | 1 (same pattern, 6 listeners) |
| Target Groups | 9 | 8 (skip ticket) |

### Phase 6: CI/CD

| Resource | Prod Config | UAT Config |
|---|---|---|
| CodePipeline | 9 pipelines | Use GitHub Actions instead |
| ECR | 8 repos | 8 repos (mirror) |
| Build | CodeBuild | GitHub Actions runners |
| Deploy | ECS rolling update | ECS rolling update |

### Phase 7: Serverless

| Resource | Prod Config | UAT Config |
|---|---|---|
| Lambda Functions | 32 | **Essential only**: sync functions (6) + cleanup (4) + cancel-expired (1) = 11 |
| EventBridge Rules | 39 | Match Lambda count |
| Step Functions | 1 | Skip (manual scaling for UAT) |

### Phase 8: Monitoring

| Resource | Prod Config | UAT Config |
|---|---|---|
| Datadog | Full APM + logs + PrivateLink | **CloudWatch only** (save $$) |
| CloudWatch Alarms | 99 | ~20 (essential ECS/RDS alarms) |
| CloudTrail | Enabled | Enabled |
| Inspector | Enabled | Optional |

---

## 19. Cost Estimation

### Production Monthly Cost (eu-central-1)

| Category | Resource | Estimated Monthly Cost |
|---|---|---|
| **ECS Fargate** | 39 tasks baseline (scales higher) | ~$2,800 - $4,500 |
| **Aurora PostgreSQL** | 6 clusters (12 instances) | ~$3,500 - $4,200 |
| **RDS Proxy** | 6 proxies | ~$650 |
| **ElastiCache Redis** | 2× r5.large + 7× t3.medium | ~$800 |
| **ALB** | 3 ALBs + 9 target groups | ~$120 |
| **CloudFront** | 9 distributions | ~$200 - $600 |
| **WAF** | 2 ACLs, 13+ rules | ~$65 |
| **S3** | 38 buckets | ~$50 - $200 |
| **Lambda** | 32 functions | ~$20 |
| **NAT Gateway** | 1 | ~$35 + data transfer |
| **Route 53** | 5 hosted zones | ~$5 |
| **Secrets Manager** | 22 secrets | ~$10 |
| **VPC Endpoints** | 16 Interface endpoints | ~$240 |
| **Datadog** | PrivateLink + agent costs | ~$500+ (external) |
| **DR (eu-west-1)** | ECS (0 tasks) + S3 replication | ~$100 |
| | | |
| **TOTAL** | | **~$9,000 - $11,500/month** |

### UAT Estimated Monthly Cost (me-central-1)

| Category | Config | Estimated Monthly Cost |
|---|---|---|
| **ECS Fargate** | 8 tasks (minimal sizing) | ~$150 |
| **Aurora PostgreSQL** | 6 clusters (6× db.r6g.medium, no readers) | ~$1,100 |
| **ElastiCache Redis** | 3 clusters (t3.small/micro) | ~$100 |
| **ALB** | 2 ALBs | ~$60 |
| **CloudFront** | 3 distributions | ~$30 |
| **S3** | ~10 buckets | ~$20 |
| **Lambda** | 11 functions | ~$5 |
| **NAT Gateway** | 1 | ~$35 |
| **Other** | Route53, ACM, CW, ECR | ~$50 |
| | | |
| **TOTAL** | | **~$550 - $700/month** |

---

## 20. Key Differences: Prod vs UAT

| Feature | Production | What UAT Needs |
|---|---|---|
| **9 ECS services** | 39 running tasks | 8 services, 1 task each |
| **ticket service** ⚠️ | Exists (muvi-main clone) | Likely not needed for UAT |
| **Aurora readers** | Every DB has reader replica | Skip readers for UAT |
| **RDS Proxy** | 6 proxies (12 endpoints) | Not needed for UAT |
| **9 Redis clusters** | Per-service isolation | 1-3 shared Redis |
| **Datadog agent** | Every ECS task has sidecar | Use CloudWatch |
| **DR region** | Full warm standby in Ireland | Not needed for UAT |
| **Azure Blob sync** | CI/CD copies artifacts to Azure | Not needed for UAT |
| **Weekend scaling** | Lambda auto-scales RDS/ECS | Not needed for UAT |
| **PriceClass_All** | CloudFront all edge locations | PriceClass_100 or PriceClass_200 |
| **Single NAT GW** | ⚠️ Not HA even in prod | Same (1 NAT GW) |
| **Manual Approval** | Every pipeline requires approval | Auto-deploy for UAT |
| **Gateway port** | 3001 | Standardize to 3000 or keep 3001 |
| **Internal ALB HTTPS** | TLS on internal gRPC (port 5002-5007) | Can use HTTP for UAT (simpler) |
| **S3 media in eu-west-1** | `S3_REGION=eu-west-1` (Ireland) | Use me-central-1 (local) |

---

## Architecture Diagram

```
Internet
    │
    ├── CloudFront (api.prod.muvicinemas.com) ──WAF──► ALB:Muvi-Prod (HTTP:80) ──► ECS:gateway (:3001)
    │                                                                                    │ gRPC
    │                                                ┌──────────────────────────────────────┤
    │                                                │                                      │
    │                                         Internal ALB                             Internal ALB
    │                                     (Muvi-Microservices-Prod)                (Muvi-Microservices-Prod)
    │                                                │                                      │
    │                               ┌────────────────┼──────────────────┐                   │
    │                               │                │                  │                    │
    │                          HTTPS:5005        HTTPS:5002         HTTPS:5003          HTTPS:5004/5006/5007
    │                               │                │                  │                    │
    │                          identity-grpc     main-grpc         payment-grpc       fb/offer/notification
    │                               │                │                  │                    │
    │                          ┌────┘                │                  │                    │
    │                          │                     │                  │                    │
    │                    Aurora PG              Aurora PG           Aurora PG            Aurora PG (x3)
    │                    (r5.xlarge)            (r5.2xlarge)        (r5.xlarge)          (r5.large)
    │                          │                     │                  │                    │
    │                    RDS Proxy             RDS Proxy           RDS Proxy           RDS Proxy (x3)
    │                          │                     │                  │                    │
    │                    Redis (t3.med)        Redis (r5.large)   Redis (t3.med)       Redis (t3.med x4)
    │
    ├── CloudFront (muvicinemas.com) ──WAF──► ALB:Website-ALB (HTTP:80) ──► ECS:website
    │
    ├── CloudFront (dashboard.muvicinemas.com) ──► S3:muvi-cms-prod (static)
    │
    └── CloudFront (media.prod.muvicinemas.com) ──► S3:muvi-media-prod
```

---

*Report generated by automated AWS CLI infrastructure discovery.*
