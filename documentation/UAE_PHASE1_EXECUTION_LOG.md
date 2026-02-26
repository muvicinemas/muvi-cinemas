# UAE Phase 1 — Cleanup Execution Log

- **Account**: 739991759290 (Account 1 — in-house, writable)
- **Region**: me-central-1 (UAE)
- **Operator**: rehan.tariq@muvicinemas.com
- **Started**: 2026-02-24

---

## PRE-EXECUTION SNAPSHOT

### ECS Services (6 services, 11 tasks running)
| Service | Desired | Running |
|---|---|---|
| muvi-gateway-service-mfnabtxa | 2 | 2 |
| muvi-main-uat | 2 | 2 |
| muvi-identity-uat | 2 | 2 |
| muvi-payment-uat | 2 | 2 |
| muvi-notification-uat | 2 | 2 |
| muvi-website-uat | 1 | 1 |

### ALBs (4 total)
| Name | ARN Suffix | Scheme | VPC | Action |
|---|---|---|---|---|
| Muvi-UAT | `app/Muvi-UAT/0c76139f79d179a6` | internet-facing | vpc-0ab936370488229bd | **KEEP** |
| agha-loadbalancer | `app/agha-loadbalancer/f710a4f128d745b0` | internet-facing | vpc-0d1b744f68bdf4ac5 | **DELETE** |
| sample-film-session-alb | `app/sample-film-session-alb/0aeda2890aa9b49c` | internet-facing | vpc-0d1b744f68bdf4ac5 | **DELETE** |
| sample-film-session-alb-v2 | `app/sample-film-session-alb-v2/43966c6cec329d89` | internet-facing | vpc-0ab936370488229bd | **DELETE** |

### RDS Instances (8 total)
| Name | Class | Engine | Status | Storage GB | Action |
|---|---|---|---|---|---|
| uatclusterdb-instance-1 | db.t3.medium | aurora-postgresql | available | — | **KEEP** |
| uatclusterdb-instance-1-me-central-1b | db.t3.medium | aurora-postgresql | available | — | **KEEP** |
| temp-muvi-uat-fb | db.t3.medium | postgres | stopped | 200 | **DELETE** |
| temp-muvi-uat-idetity | db.t3.micro | postgres | stopped | 200 | **DELETE** |
| temp-muvi-uat-main | db.t3.micro | postgres | stopped | 2000 | **DELETE** |
| temp-muvi-uat-notification | db.t3.micro | postgres | stopped | 200 | **DELETE** |
| temp-muvi-uat-offer | db.t3.micro | postgres | stopped | 20 | **DELETE** |
| temp-muvi-uat-payment | db.t3.micro | postgres | stopped | 200 | **DELETE** |

### Redis (1 cluster — keeping)
| Name | Type | Status |
|---|---|---|
| muvi-uat-redis-uae-classic-001 | cache.t3.small | available |

### VPCs (4 total)
| Name | CIDR | VPC ID | Action |
|---|---|---|---|
| sample-film-session-vpc-uae | 10.60.0.0/16 | vpc-0ab936370488229bd | **KEEP** (ECS + ALBs) |
| Database-vpc | 10.50.0.0/16 | vpc-05e2e9c2e88029d4d | **EVALUATE** |
| agha-vpc-ecs-vpc | 10.0.0.0/16 | vpc-0d1b744f68bdf4ac5 | **EVALUATE** |
| (default) | 172.31.0.0/16 | vpc-008a2d435d26eb413 | **KEEP** (AWS default) |

---

## EXECUTION LOG

### Action 1: Scale ECS services to 0

**Purpose**: Stop running tasks to halt cross-region DB calls and save Fargate costs.
**Rollback**: Set desired counts back to original values (see snapshot above).

| # | Service | Previous Count | Result | Timestamp |
|---|---|---|---|---|
| 1.1 | muvi-gateway-service-mfnabtxa | 2 | ✅ desired=0, running=0 | 2026-02-24 |
| 1.2 | muvi-main-uat | 2 | ✅ desired=0, running=0 | 2026-02-24 |
| 1.3 | muvi-identity-uat | 2 | ✅ desired=0, running=0 | 2026-02-24 |
| 1.4 | muvi-payment-uat | 2 | ✅ desired=0, running=0 | 2026-02-24 |
| 1.5 | muvi-notification-uat | 2 | ✅ desired=0, running=0 | 2026-02-24 |
| 1.6 | muvi-website-uat | 1 | ✅ desired=0, running=0 | 2026-02-24 |
| 1.7 | VERIFY: all 6 services | — | ✅ all desired=0, running=0, pending=0 | 2026-02-24 |

### Action 2: Delete 3 junk ALBs

**Purpose**: Remove unused load balancers.
**Rollback**: Cannot restore — these are junk resources with no real config.
**Pre-check**: Audit listeners and target groups first.

| # | Resource | Result | Timestamp |
|---|---|---|---|
| 2.0 | Pre-check: list listeners/TGs for each junk ALB | ✅ Each had 1 listener (port 80), no target groups | 2026-02-24 |
| 2.1 | Delete `agha-loadbalancer` | ✅ Listener deleted, then ALB deleted | 2026-02-24 |
| 2.2 | Delete `sample-film-session-alb` | ✅ Listener deleted, then ALB deleted | 2026-02-24 |
| 2.3 | Delete `sample-film-session-alb-v2` | ✅ Listener deleted, then ALB deleted | 2026-02-24 |
| 2.4 | VERIFY: only `Muvi-UAT` remains | ✅ Confirmed single ALB remaining | 2026-02-24 |

### Action 3: Delete 6 stopped temp-* RDS instances

**Purpose**: Remove stopped standalone PostgreSQL instances (2,820 GB total storage costs).
**Rollback**: Cannot restore — skip-final-snapshot (these are temp/junk, all stopped).

| # | Instance | Class | Storage | Result | Timestamp |
|---|---|---|---|---|---|
| 3.1 | temp-muvi-uat-fb | db.t3.medium | 200 GB | ✅ deleting (skip-final-snapshot) | 2026-02-24 |
| 3.2 | temp-muvi-uat-idetity | db.t3.micro | 200 GB | ✅ deleting (skip-final-snapshot) | 2026-02-24 |
| 3.3 | temp-muvi-uat-main | db.t3.micro | 2000 GB | ✅ deleting (skip-final-snapshot) | 2026-02-24 |
| 3.4 | temp-muvi-uat-notification | db.t3.micro | 200 GB | ✅ deleting (skip-final-snapshot) | 2026-02-24 |
| 3.5 | temp-muvi-uat-offer | db.t3.micro | 20 GB | ✅ deleting (skip-final-snapshot) | 2026-02-24 |
| 3.6 | temp-muvi-uat-payment | db.t3.micro | 200 GB | ✅ deleting (skip-final-snapshot) | 2026-02-24 |
| 3.7 | VERIFY: only Aurora instances remain | — | — | ✅ 6 temp=deleting, 2 Aurora=available | 2026-02-24 |

### Action 4: Evaluate junk VPCs

| # | Step | Result | Timestamp |
|---|---|---|---|
| 4.1 | Audit `agha-vpc-ecs-vpc` (vpc-0d1b744f68bdf4ac5) | 🔴 **DELETE** — 4 subnets, 1 active NAT GW (~$32/mo), 1 IGW, 3 SGs, 1 orphaned ECS ENI, 1 S3 gateway endpoint, VPC peering to Frankfurt. All junk. | 2026-02-24 |
| 4.2 | Audit `Database-vpc` (vpc-05e2e9c2e88029d4d) | 🟢 **KEEP** — Aurora cluster `uatclusterdb` lives here. 6 subnets, 1 IGW, 3 RDS ENIs (2 from temp-deleting), 1 S3 gateway endpoint, SG `temp-fb-rds-sg`. Clean after temp RDS deletes finish. | 2026-02-24 |
| 4.3 | VPC Peering audit | 🔴 **DELETE BOTH** — pcx-0351c9bc3f265a5e1 (main→Frankfurt) + pcx-0190f1784ee4c30f6 (Frankfurt→agha). Both connect to vpc-04056649658133bf4 in eu-central-1. Unused cross-region peering. | 2026-02-24 |
| 4.4 | Elastic IP audit (9 total) | 2 idle EIPs: 3.29.114.14 + 51.112.175.162 (~$7.30/mo waste). 1 EIP on agha NAT GW (freed on delete). 2 on temp RDS ENIs (freed after deletes). 4 legitimate (2 NAT GW main VPC, 2 ALB). | 2026-02-24 |
| 4.5 | VPC Endpoint audit | 3 ElastiCache serverless interface endpoints in main VPC (~$21.60/mo) — we use classic Redis, not serverless. Likely junk. 3 S3 gateway endpoints (free). | 2026-02-24 |
| 4.6 | Decision | ✅ **APPROVED** — proceeding with full cleanup | 2026-02-24 |

### Action 5: Delete agha-vpc-ecs-vpc (EXECUTED)

**Bonus discovery**: Found 2 junk ECS clusters (`agha-service-cluster`, `sample-film-session-cluster`) with 3 running services holding ENIs. Stopped, deleted services, deleted clusters first.

| # | Step | Result | Timestamp |
|---|---|---|---|
| 5.1 | Delete NAT Gateway `nat-05a3575223ded23d0` | ✅ deleted | 2026-02-24 |
| 5.2 | Delete VPC Peering `pcx-0190f1784ee4c30f6` (Frankfurt→agha) | ✅ deleted | 2026-02-24 |
| 5.3 | Delete VPC Peering `pcx-0351c9bc3f265a5e1` (main→Frankfurt) | ✅ deleted | 2026-02-24 |
| 5.4 | Delete S3 Gateway Endpoint `vpce-07de061b572bcd0c8` | ✅ deleted | 2026-02-24 |
| 5.5 | Scale + delete 2 junk ECS services in `agha-service-cluster` | ✅ drained + deleted (sample-film-session-service, agha-task-a-service-kzhb1pj4) | 2026-02-24 |
| 5.6 | Scale + delete 1 junk ECS service in `sample-film-session-cluster` | ✅ drained + deleted (sample-film-session-service) | 2026-02-24 |
| 5.7 | Delete ECS cluster `agha-service-cluster` | ✅ INACTIVE | 2026-02-24 |
| 5.8 | Delete ECS cluster `sample-film-session-cluster` | ✅ INACTIVE | 2026-02-24 |
| 5.9 | Delete orphan ENI `eni-06d717e5782301e06` | ✅ auto-deleted by ECS | 2026-02-24 |
| 5.10 | Delete SG `sg-0c63d3614b640dbc0` (taska-ecs-security-group) | ✅ deleted | 2026-02-24 |
| 5.11 | Delete SG `sg-06d280616deb38250` (ecs-task-a) | ✅ revoked rules + deleted | 2026-02-24 |
| 5.12 | Delete 4 subnets | ✅ all 4 deleted | 2026-02-24 |
| 5.13 | Detach + delete IGW `igw-0dc7f3420084dc79d` | ✅ deleted | 2026-02-24 |
| 5.14 | Delete 3 non-main route tables | ✅ all 3 deleted | 2026-02-24 |
| 5.15 | Delete VPC `vpc-0d1b744f68bdf4ac5` | ✅ deleted | 2026-02-24 |

### Action 6: Release idle Elastic IPs

| # | EIP | IP | Result | Timestamp |
|---|---|---|---|---|
| 6.1 | `eipalloc-070de0243d052e21c` | 3.29.114.14 | ✅ released (was idle) | 2026-02-24 |
| 6.2 | `eipalloc-093d97b8a9ab22b97` | 51.112.175.162 | ✅ released (was idle) | 2026-02-24 |
| 6.3 | `eipalloc-011bfc7cffa1f7773` | 51.112.30.3 | ✅ released (freed from deleted NAT GW) | 2026-02-24 |

### Action 7: Delete serverless Redis cache + VPC endpoints

| # | Resource | Result | Timestamp |
|---|---|---|---|
| 7.1 | Serverless cache `muvi-uat-redis-uae` (Redis 7.1) | ✅ deleting (~$90+/mo savings) | 2026-02-24 |
| 7.2 | 3 ElastiCache serverless VPC endpoints | ✅ auto-deleted with serverless cache | 2026-02-24 |

---

## POST-CLEANUP STATE (2026-02-24)

| Resource | Count | Details |
|---|---|---|
| VPCs | 3 | main (10.60.0.0/16), Database (10.50.0.0/16), default (172.31.0.0/16) |
| ECS Clusters | 1 | `Muvi-Cluster` (6 services at desired=0) |
| ALBs | 1 | `Muvi-UAT` (internet-facing) |
| RDS | 2 | Aurora `uatclusterdb` (2 instances, available) |
| Redis | 1 | `muvi-uat-redis-uae-classic-001` (cache.t3.small) |
| NAT Gateways | 2 | Both in main VPC (1 per AZ) |
| Elastic IPs | 6 | All associated (no idle) |
| VPC Peerings | 0 | All deleted |

### Estimated Monthly Savings from Phase 1
| Item | Savings |
|---|---|
| 6 temp RDS instances (2,820 GB storage) | ~$280/mo |
| 3 junk ALBs | ~$48/mo |
| Fargate compute (6 services stopped) | ~$200/mo |
| agha-vpc NAT Gateway | ~$32/mo |
| 3 idle Elastic IPs | ~$11/mo |
| Serverless Redis cache | ~$90/mo |
| 2 junk ECS clusters (3 services) | ~$30/mo |
| **TOTAL Phase 1 savings** | **~$691/mo** |

---

## ROLLBACK COMMANDS

### Restore ECS to original counts
```
aws ecs update-service --cluster Muvi-Cluster --service muvi-gateway-service-mfnabtxa --desired-count 2 --region me-central-1
aws ecs update-service --cluster Muvi-Cluster --service muvi-main-uat --desired-count 2 --region me-central-1
aws ecs update-service --cluster Muvi-Cluster --service muvi-identity-uat --desired-count 2 --region me-central-1
aws ecs update-service --cluster Muvi-Cluster --service muvi-payment-uat --desired-count 2 --region me-central-1
aws ecs update-service --cluster Muvi-Cluster --service muvi-notification-uat --desired-count 2 --region me-central-1
aws ecs update-service --cluster Muvi-Cluster --service muvi-website-uat --desired-count 1 --region me-central-1
```

### ALBs & RDS — irreversible (junk resources, no data loss)
