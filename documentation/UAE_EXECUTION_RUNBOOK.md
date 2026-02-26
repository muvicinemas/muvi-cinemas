# Muvi Cinemas — UAE UAT Build Execution Runbook

> **Status:** IN PROGRESS — Phase 4 (Redis Clusters)  
> **Author:** GitHub Copilot (AI Assistant)  
> **Created:** February 23, 2026  
> **Last Updated:** February 26, 2026  
> **Target:** Account 1 (`739991759290`) — `me-central-1` (UAE)  
> **Source of Truth:** Account 2 (`011566070219`) — `eu-central-1` (Production) — **READ-ONLY, NEVER WRITE**  
> **Goal:** Mirror production architecture into UAE for load testing and penetration testing  

---

## CRITICAL RULES

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | **NEVER write to Account 2 (prod)** | Only `describe-*`, `list-*`, `get-*` on `--profile muvi-prod` |
| 2 | **Source of truth = PROD** | UAE UAT mirrors prod architecture, config, and patterns |
| 3 | **Every action logged** | Each phase has its own `UAE_PHASEn_EXECUTION_LOG.md` |
| 4 | **Runbook updated after every action** | Status table below reflects real-time progress |
| 5 | **VERIFY every write operation** | After every create/modify/delete, run a separate `describe`/`get` call to confirm the change actually applied. NEVER assume success from the CLI command alone. If verification fails, STOP and report — do not proceed. Added Feb 25 after Phase 2 incident where a `modify-db-instance` call returned `InvalidDBInstanceStateFault` but was mistakenly logged as successful. |

---

## Decisions Made

| # | Decision | Answer | Date |
|---|----------|--------|------|
| 1 | Teardown of junk UAE resources? | ✅ YES — Phase 1 complete | Feb 23 |
| 2 | Database strategy? | ✅ Keep Aurora `uatclusterdb`, migrate Frankfurt UAT data into it | Feb 24 |
| 3 | Delete Aurora cluster? | ❌ NO — reusing it (6 DBs with schemas already exist) | Feb 24 |
| 4 | CI/CD approach? | ✅ CodePipeline + CodeBuild (matching Frankfurt pattern) | Feb 23 |
| 5 | Decommission Frankfurt UAT? | ⏳ LATER — after UAE is verified stable 48h | Pending |
| 6 | Third-party sandbox credentials? | ⏳ Will audit existing SSM params first | Pending |
| 7 | DB Ecosystem — RDS Proxies? | ✅ YES — 6 proxies + 6 read-only endpoints + VPC peering | Feb 24 |
| 8 | Aurora public access fix? | ✅→↩️ Set PubliclyAccessible=False in Phase 2B, reverted to True on Feb 26 (UAT convenience) | Feb 24→26 |
| 9 | Bastion for developer DB access? | ❌ REMOVED — bastion EC2 + key pair + SG destroyed after reverting to public access | Feb 26 |
| 10 | Infrastructure-as-Code (IaC) blueprint? | ✅ YES — After Phase 11, codify entire UAE ecosystem into Terraform. One-command deploy/destroy of full environment. | Feb 26 |
| 11 | HTML Control Panel for CTO/CIO? | ✅ YES — Phase 13. Static HTML dashboard with per-service on/off switches via API Gateway + Lambda. | Feb 26 |
| 12 | Redis strategy — 1 shared or 9 per-service? | ✅ 9 per-service (mirror prod 1:1) — needed for accurate load testing. All cache.t3.medium. | Feb 26 |

---

## Phase Progress

| Phase | Description | Status | Log File | Savings/Cost |
|-------|-------------|--------|----------|-------------|
| 1 | UAE Cleanup & Teardown | ✅ COMPLETE | `UAE_PHASE1_EXECUTION_LOG.md` | Saved ~$691/mo |
| 2 | Databases (migrate data to UAE Aurora) | ✅ COMPLETE | `UAE_PHASE2_EXECUTION_LOG.md` | ~$0.02 |
| 2B | DB Ecosystem (RDS Proxies, VPC Peering, Security) | ✅ COMPLETE | `UAE_PHASE2B_EXECUTION_LOG.md` | ~$265/mo |
| 3 | Networking (ALBs, SGs, TGs) | ✅ COMPLETE | `UAE_PHASE3_EXECUTION_LOG.md` | ~$54/mo |
| 4 | Redis Clusters | ✅ COMPLETE | `UAE_PHASE4_EXECUTION_LOG.md` | ~$540/mo |
| 5 | ECS + ECR (task defs, services, images) | ⬜ NOT STARTED | — | ~$200/mo |
| 6 | S3, CloudFront, WAF | ⬜ NOT STARTED | — | ~$10/mo |
| 7 | SSM Parameters + Secrets Manager | ⬜ NOT STARTED | — | ~$3/mo |
| 8 | CI/CD Pipeline (CodePipeline + CodeBuild) | ⬜ NOT STARTED | — | ~$9/mo |
| 9 | Third-Party Sandbox Accounts | ⬜ NOT STARTED | — | — |
| 10 | Verification & Load Testing | ⬜ NOT STARTED | — | — |
| 11 | Decommission Frankfurt | ⬜ NOT STARTED | — | Save ~$650-800/mo |
| 12 | Terraform Blueprint (IaC) | ⬜ NOT STARTED | — | One-command deploy/destroy |
| 13 | HTML Environment Control Panel | ⬜ NOT STARTED | — | CTO/CIO dashboard |

---

## Table of Contents

1. [How I Will Execute This](#1-how-i-will-execute-this)
2. [Phase 1: Teardown](#2-phase-1-teardown--clean-slate-uae)
3. [Phase 2: Databases](#3-phase-2-databases)
4. [Phase 2B: DB Ecosystem (RDS Proxies + VPC Peering)](#3b-phase-2b-db-ecosystem)
5. [Phase 3: Networking](#4-phase-3-networking--albs--sgs--tgs)
5. [Phase 4: Redis](#5-phase-4-redis-clusters)
6. [Phase 5: ECS + ECR](#6-phase-5-ecs-cluster--ecr-images--services)
7. [Phase 6: S3, CloudFront, WAF](#7-phase-6-s3-cloudfront-waf)
8. [Phase 7: SSM Parameters + Secrets Manager](#8-phase-7-ssm-parameters--secrets-manager)
9. [Phase 8: CI/CD Pipeline](#9-phase-8-cicd-pipeline)
10. [Phase 9: Third-Party Sandbox Accounts](#10-phase-9-third-party-sandbox-accounts)
11. [Phase 10: Verification & Load Testing](#11-phase-10-verification--load-testing)
12. [Phase 11: Decommission Frankfurt](#12-phase-11-decommission-frankfurt)
13. [Phase 12: Terraform Blueprint (IaC)](#13-phase-12-terraform-blueprint-iac)
14. [Phase 13: HTML Environment Control Panel](#14-phase-13-html-environment-control-panel)
15. [Cost Summary](#15-cost-summary)
16. [Risk Register](#16-risk-register)

---

## 1. How I Will Execute This

### My Execution Method

I will run **every AWS CLI command** from your VS Code terminal. Here's my workflow:

```
For each phase:
  1. I announce what I'm about to do (brief description)
  2. I run the AWS CLI command(s) via run_in_terminal
  3. I capture the output and verify success
  4. I report the result back to you
  5. If anything fails, I STOP and tell you before continuing
  6. I mark the step complete in the todo list
```

### Safety Rules I Will Follow

| Rule | How I Enforce It |
|------|-----------------|
| **Never write to Account 2 (prod)** | All commands use `--region me-central-1` on default profile (Account 1) |
| **Never delete databases without asking** | I will STOP at Phase 2 and confirm your DB strategy |
| **Show before delete** | Before any `delete-*` command, I'll run a `describe-*` first to confirm what's being deleted |
| **One phase at a time** | I complete each phase before moving to the next |
| **Checkpoint after each phase** | I pause and summarize results before proceeding |
| **Never commit/push without asking** | Any git operations require your explicit approval |

### What I Need From You

| Requirement | When |
|-------------|------|
| Terminal access (already have) | Now |
| AWS CLI configured for Account 1 default profile | Already done ✅ |
| Sandbox API keys for third-party services (see Phase 9) | Before Phase 7 (SSM configuration) |
| Docker Desktop running (for image builds) | Before Phase 5 |
| GitHub repo access for CI/CD setup | Before Phase 8 |

---

## 2. Phase 1: Teardown — Clean Slate UAE

**Duration:** 1-2 hours | **Risk:** Low | **Saves:** ~$450/month

### What I Will Delete (in order)

| # | Resource | Identifier | Action |
|---|----------|-----------|--------|
| 1.1 | ECS services (6) | `muvi-gateway-service-mfnabtxa`, `muvi-identity-uat`, `muvi-main-uat`, `muvi-payment-uat`, `muvi-notification-uat`, `muvi-website-uat` | Scale → 0, then delete |
| 1.2 | ECS cluster | `Muvi-Cluster` | Delete after services gone |
| 1.3 | ALBs (4) | `Muvi-UAT`, `agha-loadbalancer`, `sample-film-session-alb`, `sample-film-session-alb-v2` | Delete all |
| 1.4 | Target Groups (6) | `muvi-gateway-tg`, `muvi-website-tg`, `agha-task-a-taget-group`, `sample-film-session-tg-uae`, `sample-film-session-tg-v2`, `targetgroup-task-aaa` | Delete all |
| 1.5 | Redis (1) | `muvi-uat-redis-uae-classic-001` | Delete |
| 1.6 | Cloud Map services | All services in `uat.internal` namespace | Deregister instances, delete services, keep namespace |
| 1.7 | VPC Peering (2) | `pcx-0351c9bc3f265a5e1`, `pcx-0190f1784ee4c30f6` | Delete + remove routes |
| 1.8 | NAT Gateway (agha-vpc) | `nat-05a3575223ded23d0` | Delete (save $33/mo) |
| 1.9 | NAT Gateway (redundant) | One of the 2 in main VPC | Delete 1, keep 1 (save $33/mo) |
| 1.10 | ECR repos (junk) | `sample-film-session-service`, `agha-test-a-ecr` | Delete |
| 1.11 | Security Groups (test) | Test SGs that are no longer attached | Delete |

### What I Will NOT Delete

| Resource | Identifier | Reason |
|----------|-----------|--------|
| Aurora cluster | `uatclusterdb` (2 instances) | Pending your decision |
| Stopped RDS (6) | `temp-muvi-uat-*` | Pending your decision |
| Main VPC | `vpc-0ab936370488229bd` (10.60.0.0/16) | Reuse for UAT |
| Database VPC | `vpc-04bdd9a...` (10.50.0.0/16) | May be needed |
| Subnets (4) | public-a, public-b, private-a, private-b | Reuse |
| NAT Gateway (1) | Remaining one in main VPC | Needed for outbound |
| Cloud Map namespace | `uat.internal` (ns-jgtxuknznq3siizp) | Reuse |
| ECR repos (6) | `muvi-*-uat` | Reuse for images |
| SSM Parameters (56) | `/uat/*` | Will update values |
| CloudFront (12) | Various distributions | Will update origins |

### My Execution Steps

```
Step 1.1: aws ecs update-service --cluster Muvi-Cluster --service <name> --desired-count 0
          [wait 60s for drain]
          aws ecs delete-service --cluster Muvi-Cluster --service <name> --force
          (repeat for all 6 services)

Step 1.2: aws ecs delete-cluster --cluster Muvi-Cluster

Step 1.3: aws elbv2 delete-load-balancer --load-balancer-arn <arn>
          (for each of 4 ALBs)

Step 1.4: aws elbv2 delete-target-group --target-group-arn <arn>
          (for each of 6 TGs)

Step 1.5: aws elasticache delete-cache-cluster --cache-cluster-id muvi-uat-redis-uae-classic-001

Step 1.6: aws servicediscovery deregister-instance / delete-service
          (for each service in uat.internal)

Step 1.7: aws ec2 delete-vpc-peering-connection --vpc-peering-connection-id pcx-*
          aws ec2 delete-route (remove peering routes)

Step 1.8-1.9: aws ec2 delete-nat-gateway --nat-gateway-id <id>
              aws ec2 release-address (free Elastic IPs)
              aws ec2 replace-route (point private-b to remaining NAT)

Step 1.10: aws ecr delete-repository --repository-name <name> --force

Step 1.11: aws ec2 delete-security-group --group-id <id>
```

**Checkpoint:** After Phase 1, I'll run a full audit to confirm clean slate.

---

## 3. Phase 2: Databases

**Duration:** 2-3 hours | **Status:** 🔄 IN PROGRESS | **Log:** `UAE_PHASE2_EXECUTION_LOG.md`

### Strategy: Reuse UAE Aurora + Migrate Frankfurt UAT Data

**Decision:** Keep existing Aurora cluster `uatclusterdb` in UAE. It already has 6 databases with correct schemas (created by previous team). Migrate real test data from Frankfurt UAT standalone RDS instances into UAE Aurora via pg_dump → pg_restore pipe.

### UAE Aurora Cluster (Target)

| Property | Value |
|----------|-------|
| Cluster | `uatclusterdb` |
| Endpoint | `uatclusterdb.cluster-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| Engine | Aurora PostgreSQL 14.17 |
| Instances | 2 × db.t3.medium (writer + reader) |
| Master | postgres / `HR)q0Cpn?D$OyqREGo0-BlupVueo` |
| VPC | Database-vpc (`vpc-05e2e9c2e88029d4d`) |
| ⚠️ Security | **Publicly accessible, 0.0.0.0/0 on 5432** — MUST FIX in Phase 3 |

### Frankfurt UAT DBs (Source — Account 1, eu-central-1)

| DB | Host | Tables | Rows | Size |
|----|------|--------|------|------|
| muvi_main_service | muvi-uat-main.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | 39 | 13,394 | 11 GB |
| muvi_identity_service | muvi-uat-identity.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | 22 | 2,785 | 15 MB |
| muvi_payment_service | muvi-uat-payment.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | 7 | 4,217 | 13 MB |
| muvi_fb_db | muvi-uat-fb.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | 20 | 28 | 14 MB |
| muvi_notification_service | muvi-uat-notification.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | 6 | 0 | 11 MB |
| muvi_offer_service | muvi-uat-offer.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | 6 | 26,364,608 | 7,553 MB |

### Execution Plan

```
Step 2.1: Audit prod DB architecture (READ-ONLY on Account 2) — compare with UAE Aurora schemas
Step 2.2: Launch temp EC2 in Frankfurt VPC (has access to all 6 RDS instances)
Step 2.3: Install PostgreSQL client tools on EC2
Step 2.4: For each DB: pg_dump from Frankfurt RDS → pipe to UAE Aurora (drop existing + restore)
Step 2.5: Verify row counts match in UAE Aurora
Step 2.6: Terminate EC2
Step 2.7: Update this runbook + Phase 2 log
```

### ⚠️ Post-Phase-2: Compare UAE schemas with PROD

After data is migrated, we'll READ-ONLY audit prod (Account 2) database schemas to ensure UAE Aurora tables match prod structure. If schemas differ, we run the necessary migrations in UAE only.

---

## 3B. Phase 2B: DB Ecosystem

**Duration:** ~30 minutes | **Status:** ✅ COMPLETE | **Cost:** ~$265/month | **Log:** `UAE_PHASE2B_EXECUTION_LOG.md`

### What Was Done

Mimicked prod DB ecosystem by creating:
1. **VPC Peering** (`pcx-015fcde392996ef5d`) — Main VPC ↔ Database VPC with routes in all 9 route tables
2. **6 RDS Proxies** with matching pool config (MaxConn=100%, MaxIdle=50%, BorrowTimeout=120s)
3. **6 Read-Only Proxy Endpoints** for read/write split (matching prod pattern)
4. **6 Secrets Manager Secrets** (one per DB, for proxy auth)
5. **IAM Role** (`muvi-uat-rds-proxy-role`) + SecretsManagerAccess policy
6. **Security Group** (`sg-06c22a1a4cdce43b0`) for proxies
7. **Security hardening** — Aurora PubliclyAccessible set to False

### UAE DB Endpoint Map (for ECS task definitions)

| Service | DB_WRITE_HOST | DB_READ_HOST |
|---------|--------------|-------------|
| main | `uat-main-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` | `uat-main-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| identity | `uat-identity-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` | `uat-identity-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| payment | `uat-payment-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` | `uat-payment-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| fb | `uat-fb-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` | `uat-fb-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| notification | `uat-notification-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` | `uat-notification-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| offer | `uat-offer-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` | `uat-offer-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |

---

## 4. Phase 3: Networking — ALBs + SGs + TGs

**Duration:** 2-3 hours | **Cost:** ~$54/month (3 ALBs)

### Security Groups (Create 5)

| SG Name | Protocol | Port(s) | Source | Purpose |
|---------|----------|---------|--------|---------|
| `muvi-uat-alb-sg` | TCP | 80, 443 | 0.0.0.0/0 | Public ALBs |
| `muvi-uat-internal-alb-sg` | TCP | 5002-5007 | ECS SG | Internal ALB |
| `muvi-uat-ecs-sg` | TCP | 80, all | ALB SG + self | ECS tasks |
| `muvi-uat-rds-sg` | TCP | 5432 | ECS SG | RDS access |
| `muvi-uat-redis-sg` | TCP | 6379 | ECS SG | Redis access |

### Target Groups (Create 9 — mirroring prod)

| TG Name | Port | Protocol | Type | Health Check |
|---------|------|----------|------|-------------|
| `muvi-uat-gateway-tg` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-main-grpc` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-identity-tg` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-payment-grpc` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-fb-grpc-tg` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-notification-grpc` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-offer-grpc` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-ticket-tg` | 80 | HTTP | ip | /heartbeat |
| `muvi-uat-website-tg` | 80 | HTTP | ip | / |

### ALBs (Create 3 — mirroring prod's 3-ALB pattern)

#### ALB 1: `Muvi-UAT` (Public API Gateway)
- Scheme: internet-facing
- Subnets: public-a, public-b
- SG: muvi-uat-alb-sg
- Listener: `:80 HTTP → muvi-uat-gateway-tg`

#### ALB 2: `Muvi-Internal-UAT` (gRPC Microservices)
- Scheme: **internal**
- Subnets: private-a, private-b
- SG: muvi-uat-internal-alb-sg
- **6 Listeners** (mirroring production exactly):

| Port | Protocol | → Target Group | Service |
|------|----------|---------------|---------|
| 5002 | HTTPS | muvi-uat-main-grpc | Main |
| 5003 | HTTPS | muvi-uat-notification-grpc | Notification |
| 5004 | HTTPS | muvi-uat-payment-grpc | Payment |
| 5005 | HTTPS | muvi-uat-identity-tg | Identity |
| 5006 | HTTPS | muvi-uat-fb-grpc-tg | F&B |
| 5007 | HTTPS | muvi-uat-offer-grpc | Offer |

> **Note:** Prod uses HTTPS with real ACM cert. UAT uses HTTPS with self-signed cert (`arn:aws:acm:me-central-1:739991759290:certificate/6f56edba-845d-4680-b058-d610d25b365c`). GRPC target groups require HTTPS listeners.

#### ALB 3: `Muvi-Website-UAT` (Frontend)
- Scheme: internet-facing
- Subnets: public-a, public-b
- SG: muvi-uat-alb-sg
- Listener: `:80 HTTP → muvi-uat-website-tg`

### My Execution Steps

```
Step 3.1: Create 5 Security Groups
Step 3.2: Create 9 Target Groups
Step 3.3: Create Muvi-UAT ALB + listener
Step 3.4: Create Muvi-Internal-UAT ALB + 6 listeners (5002-5007)
Step 3.5: Create Muvi-Website-UAT ALB + listener
Step 3.6: Record all ARNs + DNS names for later use
```

---

## 5. Phase 4: Redis Clusters

**Duration:** ~15 min create + ~10 min wait | **Cost:** ~$540/month (9 × cache.t3.medium)

### Redis Strategy

Production has 9 dedicated Redis clusters (1 per service + shared + bulk-refund). For load testing accuracy, we mirror prod 1:1 — each service gets its own Redis to avoid cross-service interference that would produce misleading load test results.

### Prod → UAE Mapping

| # | Prod Cluster | UAE Cluster | Node Type | Engine |
|---|-------------|------------|-----------|--------|
| 1 | foms-redis-prod-getway | muvi-uat-redis-gateway | cache.t3.medium | 7.0.7 |
| 2 | foms-redis-prod-identity | muvi-uat-redis-identity | cache.t3.medium | 7.0.7 |
| 3 | foms-redis-prod-main | muvi-uat-redis-main | cache.t3.medium | 7.0.7 |
| 4 | foms-redis-prod-paymnet | muvi-uat-redis-payment | cache.t3.medium | 7.0.7 |
| 5 | foms-redis-prod-fb | muvi-uat-redis-fb | cache.t3.medium | 7.0.7 |
| 6 | foms-redis-prod-notification | muvi-uat-redis-notification | cache.t3.medium | 7.0.7 |
| 7 | foms-redis-prod-offer | muvi-uat-redis-offer | cache.t3.medium | 7.0.7 |
| 8 | foms-redis-prod-shared | muvi-uat-redis-shared | cache.t3.medium | 7.0.7 |
| 9 | foms-redis-prod-bulk-refund-booking | muvi-uat-redis-bulk-refund | cache.t3.medium | 7.0.7 |

**Note:** Prod uses `cache.r5.large` for main and notification. We use `cache.t3.medium` for all UAT clusters (sufficient for load testing, saves ~$250/mo vs r5.large).

### Endpoints

| Service | Endpoint |
|---------|----------|
| Gateway | `muvi-uat-redis-gateway.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Identity | `muvi-uat-redis-identity.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Main | `muvi-uat-redis-main.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Payment | `muvi-uat-redis-payment.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| F&B | `muvi-uat-redis-fb.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Notification | `muvi-uat-redis-notification.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Offer | `muvi-uat-redis-offer.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Shared | `muvi-uat-redis-shared.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |
| Bulk Refund | `muvi-uat-redis-bulk-refund.c6kxj3.ng.0001.mec1.cache.amazonaws.com:6379` |

### Security Group

- **Redis SG**: `sg-0731967bbd5ef6e51` (`redis-uat-sg`)
- **Inbound**: Port 6379 from all 7 ECS service SGs (gateway, identity, main, payment, fb, notification, offer)
- **Old stale rule removed**: `sample-film-session-ecs-sg` was the only allowed source — replaced with proper ECS SGs

### Execution Steps Completed

```
Step 4.1: ✅ Audited prod Redis — 9 replication groups, all single-node, no cluster mode
Step 4.2: ✅ Audited UAE Redis — 1 existing generic cluster (muvi-uat-redis-uae-classic, t3.small)
Step 4.3: ✅ Created 9 new per-service replication groups (cache.t3.medium, Redis 7.0.7)
Step 4.4: ✅ Waited for all 9 to become 'available' (~10 min)
Step 4.5: ✅ Deleted old generic cluster (muvi-uat-redis-uae-classic)
Step 4.6: ✅ Fixed Redis SG — added all 7 ECS service SGs, removed old stale rule
Step 4.7: ✅ Verified all endpoints, SGs, and cluster status
```

### Configuration Details

| Setting | Value |
|---------|-------|
| Subnet Group | `muvi-uat-uae` (VPC `vpc-0ab936370488229bd`, 2 subnets) |
| Parameter Group | `default.redis7` |
| Auto-Failover | Disabled (matching prod) |
| Multi-AZ | Disabled (matching prod) |
| Cluster Mode | Disabled (matching prod) |
| Nodes per cluster | 1 (matching prod) |

---

## 6. Phase 5: ECS Cluster + ECR Images + Services

**Duration:** 3-4 hours | **Cost:** ~$200/month (1 task per service)

### ECR Repos

| Repo (existing) | Repo (create if missing) | Service |
|-----------------|-------------------------|---------|
| `muvi-gateway-uat` ✅ | — | Gateway |
| `muvi-main-uat` ✅ | — | Main |
| `muvi-identity-uat` ✅ | — | Identity |
| `muvi-payment-uat` ✅ | — | Payment |
| `muvi-notification-uat` ✅ | — | Notification |
| `muvi-website-uat` ✅ | — | Website |
| — | `muvi-fb-uat` ❌ | F&B |
| — | `muvi-offer-uat` ❌ | Offer |
| — | `muvi-ticket-uat` ❌ | Ticket |

### ECS Task Definitions (matching prod sizes)

| Service | CPU | Memory | Container Port | Image Source |
|---------|-----|--------|---------------|-------------|
| gateway | 1024 | 2048 | 80 | `alpha-muvi-gateway-main/Dockerfile` |
| main-grpc | 4096 | 8192 | 80 | `alpha-muvi-main-main/Dockerfile` |
| identity-grpc | 1024 | 2048 | 80 | `alpha-muvi-identity-main/Dockerfile` |
| payment-grpc | 1024 | 2048 | 80 | `alpha-muvi-payment-main/Dockerfile` |
| fb-muvi | 2048 | 4096 | 80 | `alpha-muvi-fb-main/Dockerfile` |
| notification-grpc | 1024 | 2048 | 80 | `alpha-muvi-notification-main/Dockerfile` |
| offer-muvi | 2048 | 4096 | 80 | `alpha-muvi-offer/Dockerfile` |
| website | 1024 | 2048 | 80 | `web/alpha-muvi-website-main/Dockerfile` |
| ticket | 1024 | 2048 | 80 | TBD (source not in monorepo) |

### IAM Roles Needed

| Role | Purpose |
|------|---------|
| `ecsTaskExecutionRole` | Pull images from ECR, read Secrets Manager, write CloudWatch Logs |
| `ecsTaskRole` | S3 access, SSM read, SES send, CloudMap registration |

### ECS Services (all 1 task, scale up for load tests)

| Service Name | Task Definition | Target Group | ALB |
|-------------|----------------|--------------|-----|
| gateway | muvi-gateway-uat | muvi-uat-gateway-tg | Muvi-UAT |
| main-grpc | muvi-main-uat | muvi-uat-main-grpc | Muvi-Internal-UAT |
| identity-grpc | muvi-identity-uat | muvi-uat-identity-tg | Muvi-Internal-UAT |
| payment-grpc | muvi-payment-uat | muvi-uat-payment-grpc | Muvi-Internal-UAT |
| fb-muvi | muvi-fb-uat | muvi-uat-fb-grpc-tg | Muvi-Internal-UAT |
| notification-grpc | muvi-notification-uat | muvi-uat-notification-grpc | Muvi-Internal-UAT |
| offer-muvi | muvi-offer-uat | muvi-uat-offer-grpc | Muvi-Internal-UAT |
| website | muvi-website-uat | muvi-uat-website-tg | Muvi-Website-UAT |
| ticket | muvi-ticket-uat | muvi-uat-ticket-tg | Muvi-Internal-UAT |

### My Execution Steps

```
Step 5.1:  Create missing ECR repos (muvi-fb-uat, muvi-offer-uat, muvi-ticket-uat)
Step 5.2:  Create CloudWatch Log Groups (/ecs/muvi-*-uat)
Step 5.3:  Create/verify IAM roles (ecsTaskExecutionRole, ecsTaskRole)
Step 5.4:  Build Docker images for all 9 services (requires Docker Desktop)
Step 5.5:  Push images to UAE ECR
Step 5.6:  Create ECS cluster (Muvi-UAT, FARGATE)
Step 5.7:  Register 9 task definitions (with correct env vars from SSM/Secrets)
Step 5.8:  Create 9 ECS services
Step 5.9:  Wait for all tasks to reach RUNNING status
Step 5.10: Health check via ALB endpoints
```

> **Docker build:** I'll run `docker build` for each service from the monorepo. This requires Docker Desktop running on your machine. If Docker isn't available, we can use CodeBuild or build in a GitHub Actions workflow.

---

## 7. Phase 6: S3, CloudFront, WAF

**Duration:** 1-2 hours | **Cost:** ~$10/month

### S3 Buckets

| Bucket | Purpose | Region |
|--------|---------|--------|
| `muvi-media-uat-uae` | Film posters, cinema images | me-central-1 |
| `muvi-cms-uat-uae` | CMS static assets | me-central-1 |

### CloudFront Updates

| Distribution | Current Origin (Frankfurt) | New Origin (UAE) |
|-------------|--------------------------|-----------------|
| api.uat.muvicinemas.com | Frankfurt Muvi-UAT ALB | UAE Muvi-UAT ALB |
| app.uat.muvicinemas.com | Frankfurt Muvi-Website-UAT ALB | UAE Muvi-Website-UAT ALB |

### WAF

| WebACL | Purpose | Associate With |
|--------|---------|---------------|
| `UAT-Rate-Limit` | 500 req/IP rate limit | Muvi-UAT ALB |

### My Execution Steps

```
Step 6.1: Create S3 buckets with proper policy
Step 6.2: Update CloudFront origins to UAE ALBs
Step 6.3: Create WAF WebACL and associate with ALB
Step 6.4: Update SSM S3_BUCKET and S3_REGION params
```

---

## 8. Phase 7: SSM Parameters + Secrets Manager

**Duration:** 2-3 hours | **CRITICAL — all services depend on this**

### SSM Parameters to Update

There are 56 existing parameters in `/uat/*`. I will update ALL of them to point to local UAE resources.

#### Service Discovery (MOST CRITICAL)

These tell the gateway where to find backend services:

| Parameter | Current Value (Frankfurt) | New Value (UAE) |
|-----------|--------------------------|-----------------|
| `/uat/MAIN_SERVICE_HOST` | Frankfurt Internal ALB DNS | `<UAE Internal ALB DNS>` |
| `/uat/MAIN_SERVICE_PORT` | 5002 | 5002 |
| `/uat/IDENTITY_SERVICE_HOST` | Frankfurt Internal ALB DNS | `<UAE Internal ALB DNS>` |
| `/uat/IDENTITY_SERVICE_PORT` | 5005 | 5005 |
| `/uat/PAYMENT_SERVICE_HOST` | Frankfurt Internal ALB DNS | `<UAE Internal ALB DNS>` |
| `/uat/PAYMENT_SERVICE_PORT` | 5004 | 5004 |
| `/uat/NOTIFICATION_SERVICE_HOST` | Frankfurt Internal ALB DNS | `<UAE Internal ALB DNS>` |
| `/uat/NOTIFICATION_SERVICE_PORT` | 5003 | 5003 |
| `/uat/FB_SERVICE_HOST` | Frankfurt Internal ALB DNS | `<UAE Internal ALB DNS>` |
| `/uat/FB_SERVICE_PORT` | 5006 | 5006 |
| `/uat/OFFER_SERVICE_HOST` | Frankfurt Internal ALB DNS | `<UAE Internal ALB DNS>` |
| `/uat/OFFER_SERVICE_PORT` | 5007 | 5007 |

#### Database Parameters

| Parameter | New Value |
|-----------|-----------|
| `/uat/DB_HOST_MAIN` | `muvi-uat-main.xxxx.me-central-1.rds.amazonaws.com` |
| `/uat/DB_HOST_IDENTITY` | `muvi-uat-identity.xxxx.me-central-1.rds.amazonaws.com` |
| `/uat/DB_HOST_PAYMENT` | `muvi-uat-payment.xxxx.me-central-1.rds.amazonaws.com` |
| `/uat/DB_HOST_FB` | `muvi-uat-fb.xxxx.me-central-1.rds.amazonaws.com` |
| `/uat/DB_HOST_NOTIFICATION` | `muvi-uat-notification.xxxx.me-central-1.rds.amazonaws.com` |
| `/uat/DB_HOST_OFFER` | `muvi-uat-offer.xxxx.me-central-1.rds.amazonaws.com` |
| `/uat/DB_PORT` | `5432` |
| `/uat/DB_DIALECT` | `postgres` |

#### Redis Parameters

| Parameter | New Value |
|-----------|-----------|
| `/uat/REDIS_HOST_GATEWAY` | `<muvi-uat-gateway endpoint>` |
| `/uat/REDIS_HOST_MAIN` | `<muvi-uat-main endpoint>` |
| `/uat/REDIS_HOST_FB` | `<muvi-uat-fb endpoint>` |
| `/uat/REDIS_HOST_SHARED` | `<muvi-uat-shared endpoint>` |
| `/uat/REDIS_PORT` | `6379` |

#### AWS Resources

| Parameter | New Value |
|-----------|-----------|
| `/uat/S3_BUCKET` | `muvi-media-uat-uae` |
| `/uat/S3_REGION` | `me-central-1` |
| `/uat/SSM_REGION` | `me-central-1` |
| `/uat/CLOUDFRONT_DOMAIN` | `<new CF distribution domain>` |

### Secrets Manager

I will create these secrets:

| Secret Path | Contents |
|------------|----------|
| `uat/main/rds` | `{username, password, host, port, dbname}` |
| `uat/identity/rds` | `{username, password, host, port, dbname}` |
| `uat/payment/rds` | `{username, password, host, port, dbname}` |
| `uat/fb/rds` | `{username, password, host, port, dbname}` |
| `uat/notification/rds` | `{username, password, host, port, dbname}` |
| `uat/offer/rds` | `{username, password, host, port, dbname}` |

### My Execution Steps

```
Step 7.1: Collect all new resource endpoints (ALBs, RDS, Redis)
Step 7.2: Update all SSM parameters (aws ssm put-parameter --overwrite)
Step 7.3: Create Secrets Manager entries for DB credentials
Step 7.4: Verify all params with aws ssm get-parameters-by-path
```

---

## 9. Phase 8: CI/CD Pipeline

**Duration:** 1 day

### Option A: GitHub Actions (RECOMMENDED)

I will create a `.github/workflows/deploy-uat-uae.yml` that:

1. **Triggers on:** push to `develop` branch (or a dedicated `uat` branch)
2. **Detects changes:** Uses `dorny/paths-filter` to only build services with code changes
3. **Per-service job:** Build → Push ECR → Update ECS service

#### Workflow Architecture

```
push to develop
  ↓
detect-changes (paths-filter)
  ↓ (parallel, only changed services)
  ├── build-gateway      → ECR → ECS update-service
  ├── build-main         → ECR → ECS update-service
  ├── build-identity     → ECR → ECS update-service
  ├── build-payment      → ECR → ECS update-service
  ├── build-fb           → ECR → ECS update-service
  ├── build-notification → ECR → ECS update-service
  ├── build-offer        → ECR → ECS update-service
  ├── build-website      → ECR → ECS update-service
  └── build-ticket       → ECR → ECS update-service
```

#### What I Will Create

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-uat-uae.yml` | Main CI/CD workflow |
| `.github/workflows/reusable-build-push-deploy.yml` | Reusable workflow (DRY) |

#### GitHub Secrets Needed

| Secret Name | Value | Who Provides |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID_UAT` | CI/CD IAM user access key | I create (Phase 8) |
| `AWS_SECRET_ACCESS_KEY_UAT` | CI/CD IAM user secret key | I create (Phase 8) |
| `AWS_REGION_UAT` | `me-central-1` | I set |
| `AWS_ACCOUNT_ID_UAT` | `739991759290` | I set |

#### IAM User for CI/CD

I will create a dedicated IAM user with **least-privilege**:

```
User: muvi-uat-cicd
Permissions:
  - ecr:GetAuthorizationToken (global)
  - ecr:BatchCheckLayerAvailability, PutImage, InitiateLayerUpload, 
    UploadLayerPart, CompleteLayerUpload (muvi-*-uat repos only)
  - ecs:UpdateService, DescribeServices, RegisterTaskDefinition,
    DescribeTaskDefinition (Muvi-UAT cluster only)
  - iam:PassRole (ecsTaskExecutionRole, ecsTaskRole only)
  - logs:CreateLogStream, PutLogEvents (optional, for build logging)
```

### Option B: AWS CodePipeline (Alternative)

If you prefer CodePipeline (like Frankfurt UAT's 18 pipelines):

```
Per service:
  Source (GitHub webhook) → Build (CodeBuild) → Deploy (ECS Blue/Green)
  = 9 pipelines total
```

Cost: ~$9/mo (9 pipelines × $1/mo each) + CodeBuild charges

### My Execution Steps

```
Step 8.1: Create IAM user (muvi-uat-cicd) with least-privilege policy
Step 8.2: Create access key, save securely
Step 8.3: Create reusable GitHub Actions workflow file
Step 8.4: Create main deploy workflow file
Step 8.5: Add GitHub repo secrets (you do this part, or give me a PAT)
Step 8.6: Test with a dummy push to verify pipeline works
```

---

## 10. Phase 9: Third-Party Sandbox Accounts

**Duration:** 1-2 days (mostly waiting for account approval)

This is the COMPLETE inventory of all 25 third-party integrations and what's needed for each in UAT.

### TIER 1 — CRITICAL (Blocking: services won't start without these)

| # | Integration | Env Vars | Sandbox Available? | Action Required |
|---|------------|----------|-------------------|----------------|
| 1 | **Vista Entertainment** | 15 vars across 5 services | ✅ Yes — separate UAT endpoint | Get Vista UAT base URL + tokens from Vista or current SSM |
| 2 | **SendGrid** | `SENDGRID_API_KEY` + 20+ templates | ✅ Yes — create UAT API key | Create restricted API key in SendGrid dashboard |
| 3 | **AWS S3/CloudFront** | 6 vars | ✅ Self-managed | Already being created in Phase 6 |
| 4 | **AWS SSM** | 3 vars | ✅ Self-managed | Use Account 1 IAM credentials |

### TIER 2 — PAYMENT GATEWAYS (Blocking for payment flows)

| # | Integration | Env Vars | Sandbox URL | Action Required |
|---|------------|----------|-------------|----------------|
| 5 | **HyperPay** | 10 vars | `https://eu-test.oppwa.com/v1/` | Get test entity ID + token from HyperPay dashboard |
| 6 | **Checkout.com** | 10 vars | `https://api.sandbox.checkout.com` | Get sandbox API keys from Checkout.com dashboard |
| 7 | **PayFort (Amazon PS)** | 11 vars | `https://sbpaymentservices.payfort.com/FortAPI/` | Get sandbox merchant ID + access code from PayFort back-office |
| 8 | **Tabby** | 6 vars | Test mode via `TABBY_BASE_URL` | Get test API key from Tabby merchant portal |
| 9 | **NearPay** | 5 vars | `https://sandbox.nearpay.io/` | Get sandbox API key + client UUID |

### TIER 3 — AUTH & COMMUNICATION (Blocking for login/OTP)

| # | Integration | Env Vars | Sandbox? | Action Required |
|---|------------|----------|----------|----------------|
| 10 | **Unifonic** | 7 vars | ✅ Test mode available | Get UAT app ID + auth token from Unifonic portal |
| 11 | **Taqnyat** | 3 vars | ✅ Test mode available | Get test API key from Taqnyat dashboard |
| 12 | **OneSignal** | 2 vars | ✅ Create test app | Create separate OneSignal app for UAT |
| 13 | **Braze** | 4 vars | ✅ Separate workspace | Create UAT workspace in Braze, get API key + endpoint |

### TIER 4 — NICE TO HAVE (Services run without these, just features disabled)

| # | Integration | Env Vars | Action |
|---|------------|----------|--------|
| 14 | **Apple Pay** | 3 shared + per-gateway | Skip for UAT— or use sandbox certs from Apple Developer |
| 15 | **Apple Wallet** | 6 vars | Skip for UAT — passbook tickets not needed for load tests |
| 16 | **Google reCAPTCHA** | 4 vars | Use Google's test keys: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI` |
| 17 | **Google Maps** | 1 var | Create restricted key in Google Cloud Console |
| 18 | **Huawei SafetyDetect** | 2 vars | Skip for UAT |
| 19 | **Freshdesk** | 4 vars | Use existing sandbox or skip |
| 20 | **Avius** | 4 vars | Skip for UAT — surveys not needed for load tests |
| 21 | **Unipal** | 2 vars | Skip for UAT — student verification not critical |
| 22 | **ZATCA** | 1 var | Just a seller name string — copy from prod |

### TIER 5 — OBSERVABILITY (Optional but recommended)

| # | Integration | Env Vars | Action |
|---|------------|----------|--------|
| 23 | **Datadog** | 9 (NestJS) + 7 (Go) | Create UAT environment in Datadog, or use same API key with different service tags |
| 24 | **Sentry** | 1 var per service | Create UAT project in Sentry, or use same DSN with environment=uat |
| 25 | **Webhook Forwarder** | 4 vars | Set to empty or localhost for UAT |

### Credentials We Can Reuse from Current SSM

The existing 56 SSM parameters in `/uat/*` likely already have sandbox credentials for Tier 1-3 services from the previous UAT setup. My plan:

```
Step 9.1: Dump all current SSM params:
          aws ssm get-parameters-by-path --path /uat/ --recursive --with-decryption

Step 9.2: Identify which third-party credentials are still valid
          (Vista UAT URL, SendGrid key, HyperPay test key, etc.)

Step 9.3: For expired/missing credentials, create a TODO list for you:
          "Need new Tabby sandbox key", "Need new Checkout.com sandbox key", etc.

Step 9.4: For Tier 4 (skippable) integrations, set env vars to empty or
          use hardcoded test values (like Google reCAPTCHA test keys)
```

### Credential Checklist (Fill In Before Phase 7)

| Integration | Credential | Value | Status |
|-------------|-----------|-------|--------|
| Vista UAT | `VISTA_BASE_URL` | `https://____` | ⬜ |
| Vista UAT | `VISTA_*_TOKEN` (5) | `____` | ⬜ |
| HyperPay Sandbox | `HYPER_PAY_BASE_URL` | `https://eu-test.oppwa.com/v1/` | ⬜ |
| HyperPay Sandbox | `HYPER_PAY_TOKEN` | `____` | ⬜ |
| HyperPay Sandbox | `HYPER_PAY_ENTITY_ID` | `____` | ⬜ |
| Checkout.com Sandbox | `CHECKOUT_SECRET_KEY` | `sk_sbox_____` | ⬜ |
| Checkout.com Sandbox | `CHECKOUT_PRIMARY_KEY` | `pk_sbox_____` | ⬜ |
| PayFort Sandbox | `PAYFORT_BASE_URL` | `https://sbpaymentservices.payfort.com/FortAPI/` | ⬜ |
| PayFort Sandbox | `PAYFORT_ACCESS_CODE` | `____` | ⬜ |
| PayFort Sandbox | `PAYFORT_MERCHANT_IDENTIFIER` | `____` | ⬜ |
| Tabby Test | `TABBY_API_KEY` | `____` | ⬜ |
| Tabby Test | `TABBY_MERCHANT_CODE` | `____` | ⬜ |
| NearPay Sandbox | `NEARPAY_API_KEY` | `____` | ⬜ |
| Unifonic UAT | `UNIFONIC_APP_ID` | `____` | ⬜ |
| Unifonic UAT | `UNIFONIC_AUTH_TOKEN` | `____` | ⬜ |
| Taqnyat Test | `TAQNYAT_API_KEY` | `____` | ⬜ |
| OneSignal UAT | `ONESIGNAL_APP_ID` | `____` | ⬜ |
| OneSignal UAT | `ONESIGNAL_API_KEY` | `____` | ⬜ |
| Braze UAT | `BRAZE_API_KEY` | `____` | ⬜ |
| Braze UAT | `BRAZE_BASE_URL` | `https://rest.____` | ⬜ |
| SendGrid | `SENDGRID_API_KEY` | `SG.____` | ⬜ |
| Datadog | `DATADOG_API_KEY` | `____` | ⬜ |
| Sentry | `SENTRY_DSN` | `https://____@sentry.io/____` | ⬜ |

> **Shortcut:** I'll first check if the current `/uat/*` SSM params already have valid sandbox keys. If they do, we skip this whole checklist.

---

## 11. Phase 10: Verification & Load Testing

**Duration:** 1 day

### Health Checks

I will verify each service is healthy:

```
Step 10.1: curl http://<Muvi-UAT-ALB>/heartbeat  (Gateway)
Step 10.2: Test internal ALB ports 5002-5007 from within VPC (ECS Exec)
Step 10.3: Test DB connectivity per service (check CloudWatch logs for errors)
Step 10.4: Test Redis connectivity (check for cache hit/miss in logs)
Step 10.5: Test Vista API connectivity (curl Vista UAT endpoint from ECS task)
Step 10.6: Test full booking flow: browse films → select session → reserve seats → payment
```

### Smoke Test Script

I will create a smoke test script that hits every critical endpoint:

```javascript
// tests/smoke-test-uat.js
const endpoints = [
  { name: 'Gateway Health', url: '/heartbeat', expect: 200 },
  { name: 'Film List', url: '/api/v1/films', expect: 200 },
  { name: 'Cinema List', url: '/api/v1/cinemas', expect: 200 },
  { name: 'Sessions', url: '/api/v1/sessions', expect: 200 },
  { name: 'Settings', url: '/api/v1/settings', expect: 200 },
  // ... etc
];
```

### Load Test Setup

After smoke tests pass, scale up for load testing:

```
aws ecs update-service --cluster Muvi-UAT --service gateway --desired-count 3
aws ecs update-service --cluster Muvi-UAT --service main-grpc --desired-count 3
aws ecs update-service --cluster Muvi-UAT --service identity-grpc --desired-count 3
# Scale others to 2
```

Then use k6 load tests from `load-tests/` directory.

---

## 12. Phase 11: Decommission Frankfurt

**Duration:** 1 hour | **ONLY after 48 hours of UAE verification**

### Pre-Checks

- [ ] All 9 UAE services passing health checks for 48+ hours
- [ ] CloudFront fully propagated (check via `dig api.uat.muvicinemas.com`)
- [ ] At least one successful CI/CD deployment cycle
- [ ] No errors in CloudWatch logs

### What Gets Deleted (Account 1, eu-central-1)

| Resource | Count | Monthly Savings |
|----------|-------|----------------|
| ECS services | 9 | ~$250 |
| ALBs | 3 | ~$54 |
| RDS instances | 7 | ~$300 |
| Redis clusters | 4 | ~$50 |
| CodePipelines | 18 | ~$18 |
| NAT Gateways | 2 | ~$66 |
| CodeBuild projects | 9 | Variable |
| **Total** | | **~$650-800/mo** |

### My Execution Steps

```
Step 11.1: Take final RDS snapshots (safety net, 30-day retention)
Step 11.2: Scale all ECS services to 0, then delete
Step 11.3: Delete ECS cluster
Step 11.4: Delete ALBs, TGs
Step 11.5: Delete Redis clusters
Step 11.6: Delete RDS instances (after snapshots complete)
Step 11.7: Delete CodePipelines and CodeBuild projects
Step 11.8: Delete NAT Gateways and release EIPs
Step 11.9: Clean up ECR repos (optional, keep for reference)
Step 11.10: Clean up Cloud Map namespace
Step 11.11: Final audit — confirm no remaining resources billing
```

---

## 13. Phase 12: Terraform Blueprint (IaC)

> **Status:** ⬜ NOT STARTED  
> **Prerequisite:** All phases 1-11 complete (need to know every resource before codifying)  
> **Estimated Effort:** ~3-4 days  

### Why This Phase Exists

Phases 1-11 are **manual discovery and build** — we learn exactly what prod looks like and replicate it by hand. Phase 12 takes everything we built and codifies it into **Terraform** so the entire environment can be:

- **Created from zero** in ~30 minutes with `terraform apply`
- **Destroyed completely** with `terraform destroy` (back to $0/mo)
- **Cloned to any region** by changing one variable
- **Version controlled** — every infra change is a git commit

### Terraform Module Structure

```
terraform/
  environments/
    uae-uat/
      main.tf              # Module composition
      variables.tf          # Environment-specific values
      terraform.tfvars      # Actual values (gitignored)
      backend.tf            # S3 state storage
  modules/
    networking/
      vpc.tf                # VPCs, subnets, peering
      security-groups.tf    # All 12+ SGs with rules
      alb.tf                # 3 ALBs, 9 TGs, listeners
      acm.tf                # Certificates
    database/
      aurora.tf             # Cluster, instances
      rds-proxy.tf          # 6 proxies + IAM roles
      secrets.tf            # DB credentials in Secrets Manager
    redis/
      elasticache.tf        # 9 replication groups
      subnet-groups.tf      # Redis subnet group
    compute/
      ecs-cluster.tf        # Cluster definition
      ecs-services.tf       # 7 services with desired_count variable
      task-definitions.tf   # 7 task defs with container configs
      ecr.tf                # 7 repositories
      iam.tf                # Task execution + task roles
    storage/
      s3.tf                 # Buckets
      cloudfront.tf         # Distributions
    config/
      ssm.tf                # SSM parameters
      secrets.tf            # Secrets Manager entries
    cicd/
      codepipeline.tf       # Pipelines per service
      codebuild.tf          # Build projects
```

### Key Variables (Switchable)

```hcl
variable "environment" { default = "uat" }       # uat, staging, prod
variable "region" { default = "me-central-1" }    # Any AWS region
variable "ecs_desired_count" {
  type = map(number)
  default = {
    gateway      = 1
    identity     = 1
    main         = 1
    payment      = 1
    fb           = 1
    notification = 1
    offer        = 1
  }
}
variable "redis_node_type" { default = "cache.t3.medium" }
variable "aurora_instance_class" { default = "db.r5.large" }
variable "enable_aurora" { default = true }
variable "enable_redis" { default = true }
variable "enable_albs" { default = true }
```

### Deliverables

| # | Deliverable | Description |
|---|------------|-------------|
| 1 | Terraform modules | Reusable modules for each infrastructure layer |
| 2 | S3 backend + DynamoDB lock | Remote state management |
| 3 | `terraform plan` output | Verified against actual UAE resources |
| 4 | Import existing resources | `terraform import` for resources already created manually |
| 5 | README.md | How to use, prerequisites, variable reference |

### Important Notes

- We will **import** all manually-created resources (Phases 1-11) into Terraform state, NOT recreate them
- Terraform state stored in S3 with DynamoDB locking (prevents concurrent modifications)
- Sensitive values (passwords, API keys) stored in `terraform.tfvars` which is `.gitignore`d
- All modules are **environment-agnostic** — same code works for UAT, staging, or a second prod

---

## 14. Phase 13: HTML Environment Control Panel

> **Status:** ⬜ NOT STARTED  
> **Prerequisite:** Phase 12 complete (Terraform provides the infrastructure knowledge)  
> **Estimated Effort:** ~2 days  

### Vision

A simple, secure web dashboard that lets CTO/CIO control the UAE environment without touching AWS Console or CLI.

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Static HTML │────▶│ API Gateway  │────▶│   Lambda     │────▶│  AWS SDK │
│  (S3/CF)     │     │ (REST API)   │     │  (Node.js)   │     │  (ECS,   │
│              │     │ + Cognito    │     │              │     │   RDS,   │
│  Toggle UI   │◀────│  Auth        │◀────│  Returns     │◀────│   Redis) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

### UI Mockup

```
┌─────────────────────────────────────────────────┐
│  🎬 Muvi UAE Environment Control Panel          │
├─────────────────────────────────────────────────┤
│                                                 │
│  MASTER SWITCH       [████ ON ████]  💰$1,200/mo│
│                                                 │
│  ─── Microservices ──────────────────────────── │
│  Gateway             [████ ON ████]  $45/mo     │
│  Identity            [████ ON ████]  $45/mo     │
│  Main                [████ ON ████]  $45/mo     │
│  Payment             [████ ON ████]  $45/mo     │
│  F&B                 [░░░ OFF ░░░]   $0/mo      │
│  Notification        [░░░ OFF ░░░]   $0/mo      │
│  Offer (Go)          [████ ON ████]  $45/mo     │
│                                                 │
│  ─── Infrastructure ────────────────────────── │
│  Aurora Database      [████ ON ████]  $350/mo   │
│  Redis Clusters (9)   [████ ON ████]  $540/mo   │
│  Load Balancers (3)   [████ ON ████]  $85/mo    │
│                                                 │
│  ─── Quick Presets ─────────────────────────── │
│  [🚀 Full Load Test Mode]  ← all services ON   │
│  [💤 Sleep Mode]           ← everything OFF     │
│  [🔧 Dev Mode]             ← core 4 only       │
│  [🎫 Booking Test]         ← GW+Main+Pay+ID    │
│                                                 │
│  Monthly Estimate: $575/mo (current config)     │
│  Last Action: Rehan turned on Payment (2m ago)  │
└─────────────────────────────────────────────────┘
```

### Lambda Actions Mapped

| UI Action | Lambda Call | AWS SDK Method |
|-----------|------------|----------------|
| Toggle service ON | Set desiredCount=1 | `ecs.updateService()` |
| Toggle service OFF | Set desiredCount=0 | `ecs.updateService()` |
| Aurora ON | Start cluster | `rds.startDBCluster()` |
| Aurora OFF | Stop cluster (7-day auto-restart) | `rds.stopDBCluster()` |
| Redis ON | Create from snapshot | `elasticache.createReplicationGroup()` |
| Redis OFF | Snapshot + delete | `elasticache.deleteReplicationGroup()` |
| ALB ON | Recreate from Terraform | Trigger CodeBuild/Terraform |
| ALB OFF | Delete (can't pause) | `elbv2.deleteLoadBalancer()` |
| Sleep Mode | All of the above OFF | Sequential Lambda calls |
| Full Mode | All of the above ON | Sequential Lambda calls |

### Security

| Layer | Implementation |
|-------|---------------|
| Authentication | AWS Cognito User Pool (CTO/CIO accounts only) |
| Authorization | IAM role with least-privilege (only ECS, RDS, ElastiCache actions) |
| API Protection | API Gateway with Cognito authorizer |
| Audit Trail | CloudWatch Logs + CloudTrail for every action |
| Rate Limiting | API Gateway throttling (prevent accidental rapid toggles) |

### Integration with Existing Dev Portal

The control panel can be added as a new page in the existing `dev-portal/` directory, extending the current developer tools with infrastructure management.

### Deliverables

| # | Deliverable | Description |
|---|------------|-------------|
| 1 | Static HTML/JS/CSS | Control panel UI (in `dev-portal/` or standalone) |
| 2 | Lambda function | Node.js handler for all toggle actions |
| 3 | API Gateway | REST API with Cognito auth |
| 4 | Cognito User Pool | CTO/CIO user accounts |
| 5 | IAM role for Lambda | Least-privilege ECS/RDS/ElastiCache permissions |
| 6 | CloudWatch dashboard | Cost + status monitoring embedded in UI |

---

## 15. Cost Summary

### Monthly Cost After Full Migration

| Resource | Count | Unit Cost | Monthly |
|----------|-------|-----------|---------|
| ECS Fargate (9 services × 1 task) | 9 | Variable | ~$200 |
| RDS PostgreSQL (Aurora 2-instance cluster) | 2 | ~$94 | ~$188 |
| RDS Proxies (6) | 6 | ~$44 | ~$265 |
| Redis (9 × cache.t3.medium) | 9 | ~$60 | ~$540 |
| ALBs (3) | 3 | ~$18 | ~$54 |
| NAT Gateway (1) | 1 | ~$33 | ~$33 |
| S3 + CloudFront | — | — | ~$10 |
| WAF | 1 | $6 | ~$6 |
| CloudWatch Logs | — | — | ~$5 |
| Secrets Manager | 6 | $0.40 | ~$3 |
| **SUBTOTAL** | | | **~$1,304/mo** |
| **After Frankfurt decommission** | | | **Save $650-800/mo** |
| **NET vs current spend** | | | **Save ~$850/mo ($10,200/yr)** |

### Cost Optimization Tips (After Stable)

| Optimization | Saving | Effort |
|-------------|--------|--------|
| Stop/start ECS tasks outside business hours (EventBridge) | ~40% ($220) | Low |
| Use Fargate Spot for non-critical services | ~70% on those | Low |
| Stop RDS outside business hours | ~$60/mo | Medium |
| Use single NAT Gateway (already doing) | Already saved | Done |

---

## 16. Risk Register

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | Docker build fails (missing deps, private packages) | Phase 5 blocked | Pre-check Dockerfile deps, run local build first |
| 2 | Sequelize migrations fail on fresh DB | No tables | Run migrations in proper order, check dependencies |
| 3 | Third-party sandbox credentials expired | Services crash | Check existing SSM params first, have backup plan |
| 4 | GORM AutoMigrate creates wrong schema | Offer service broken | Compare with Go source, manual SQL if needed |
| 5 | Internal ALB ports not reachable from ECS | gRPC calls fail | Check Security Groups allow 5002-5007 from ECS SG |
| 6 | CloudFront caching stale Frankfurt origins | Users hit old infra | Invalidate all distributions after origin update |
| 7 | `ticket` service source not in monorepo | Can't build image | Check Frankfurt ECR for existing image, copy cross-region |
| 8 | 2TB temp-muvi-uat-main can't be shrunk | $160/mo wasted | pg_dump → fresh 50GB instance, delete 2TB |
| 9 | VPC peering route deletion breaks something unknown | Connectivity issue | Check all route tables before deleting |
| 10 | Rate limiting too aggressive for load tests | Tests fail | Increase WAF rate limit before load tests |
| 11 | Terraform state corruption | Can't manage infra | Use S3 backend with DynamoDB lock table |
| 12 | Lambda control panel unauthorized access | Anyone can toggle services | Cognito auth + IAM least privilege |

---

## Ready to Execute

**After your approval, here's my plan:**

1. I start Phase 1 immediately (teardown) — ~1-2 hours
2. I ask for your DB decision (Phase 2) — you answer
3. I build networking (Phase 3) and Redis (Phase 4) — ~3 hours
4. I check existing SSM params for sandbox credentials (Phase 9) — quick audit
5. I do ECS + ECR (Phase 5) — ~3-4 hours (biggest phase)
6. I configure SSM + Secrets (Phase 7) — ~2 hours
7. I set up S3/CloudFront/WAF (Phase 6) — ~1 hour
8. I create CI/CD workflow files (Phase 8) — ~2 hours
9. We verify everything (Phase 10) — ~1 day
10. After 48h stable → Frankfurt decommission (Phase 11)

**Phases 1-11 Total: ~3-4 working days to full production mirror in UAE.**

11. After environment stable → Codify into Terraform (Phase 12) — ~3-4 days
12. Build HTML Control Panel (Phase 13) — ~2 days

**Phases 12-13 Total: ~5-6 additional days for IaC blueprint + control panel.**

**Grand Total: ~8-10 working days from zero to fully automated, switchable UAE environment.**

Say "approved" and I begin.
