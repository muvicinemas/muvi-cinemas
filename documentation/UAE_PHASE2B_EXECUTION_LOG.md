# UAE Phase 2B: DB Ecosystem — RDS Proxies + VPC Peering + Security Hardening

> **Status:** ✅ COMPLETE  
> **Started:** February 24, 2026  
> **Completed:** February 24, 2026  
> **Operator:** GitHub Copilot (AI Assistant)  
> **Master Runbook:** `UAE_EXECUTION_RUNBOOK.md`  

---

## Rules

1. **NEVER write to Account 2 (prod, `011566070219`)** — READ-ONLY queries only (`--profile muvi-prod`)
2. All writes target Account 1 (default profile) — UAE `me-central-1`
3. Every action logged below with timestamp, command, and result

---

## Objective

Mimic production DB ecosystem in UAE:
- **Prod pattern:** 6 RDS Proxies → 6 separate Aurora clusters (all in one VPC with ECS)
- **UAE current:** 1 shared Aurora cluster with 6 DBs, no RDS Proxies, different VPC from ECS, publicly accessible
- **UAE target:** 6 RDS Proxies → 1 shared Aurora cluster, VPC peering for ECS→DB access, private-only access

---

## Prod DB Ecosystem Audit (READ-ONLY)

### Prod RDS Proxies

| Proxy | Write Endpoint | Read Endpoint | Pool Config |
|-------|---------------|---------------|-------------|
| main-proxy | `main-proxy.proxy-cnihwqn2uhpn.eu-central-1.rds.amazonaws.com` | `main-proxy-read-only.endpoint.proxy-cnihwqn2uhpn...` | MaxConn=100%, MaxIdle=50%, Borrow=120s |
| identity-proxy | `identity-proxy.proxy-cnihwqn2uhpn...` | `identity-proxy-read-only.endpoint.proxy-cnihwqn2uhpn...` | MaxConn=100%, MaxIdle=50%, Borrow=120s |
| payment-proxy | `payment-proxy.proxy-cnihwqn2uhpn...` | `payment-proxy-read-only.endpoint.proxy-cnihwqn2uhpn...` | MaxConn=100%, MaxIdle=50%, Borrow=120s |
| fb-proxy | `fb-proxy.proxy-cnihwqn2uhpn...` | `fb-proxy-read-only.endpoint.proxy-cnihwqn2uhpn...` | MaxConn=100%, MaxIdle=50%, Borrow=120s |
| notification-proxy | `notification-proxy.proxy-cnihwqn2uhpn...` | `notification-proxy.proxy-cnihwqn2uhpn...` (same!) | MaxConn=100%, MaxIdle=50%, Borrow=120s |
| offer-proxy | `offer-proxy.proxy-cnihwqn2uhpn...` | `offer-proxy-ro.endpoint.proxy-cnihwqn2uhpn...` | MaxConn=100%, MaxIdle=50%, Borrow=120s |

### Prod Architecture

- All ECS, Aurora, RDS Proxies in **one VPC**: `vpc-078c1286f49e3383e`
- Services use `DB_WRITE_HOST` → proxy write endpoint, `DB_READ_HOST` → proxy read-only endpoint
- Aurora instances: Private only, SG allows traffic from ECS SG only

### UAE Architecture (Before)

| Aspect | Current State | Issue |
|--------|--------------|-------|
| VPCs | Main VPC (10.60.0.0/16) for ECS, Database VPC (10.50.0.0/16) for Aurora | No peering! |
| RDS Proxies | None | ECS has no connection pooling layer |
| Aurora access | ⚠️ PubliclyAccessible=True | Security risk |
| SG rules | 10.50.0.0/16 only on port 5432 | OK but should be SG-based |

---

## Execution Plan

| Step | Action | Status |
|------|--------|--------|
| 2B.1 | Fix Aurora — set PubliclyAccessible=False | ✅ Done |
| 2B.2 | Create VPC Peering: Main VPC ↔ Database VPC | ✅ Done |
| 2B.3 | Update route tables in both VPCs | ✅ Done |
| 2B.4 | Create RDS Proxy SG in Database VPC | ✅ Done |
| 2B.5 | Update Aurora SG to allow from proxy SG | ✅ Done |
| 2B.6 | Create Secrets Manager secrets (6 — one per DB) | ✅ Done |
| 2B.7 | Create IAM role for RDS Proxy | ✅ Done |
| 2B.8 | Create 6 RDS Proxies | ✅ Done |
| 2B.9 | Register Aurora as target + set pool config | ✅ Done |
| 2B.10 | Create read-only endpoints (6) | ✅ Done |
| 2B.11 | Verify all targets AVAILABLE | ✅ Done |
| 2B.12 | Update logs and runbook | ✅ Done |

---

## Execution Log

### Action 2B.1 — Fix Aurora Public Access

```
aws rds modify-db-instance --db-instance-identifier uatclusterdb-instance-1 --no-publicly-accessible --apply-immediately
aws rds modify-db-instance --db-instance-identifier uatclusterdb-instance-1-me-central-1b --no-publicly-accessible --apply-immediately
```

**Result:** Both instances now `PubliclyAccessible: False`. Verified.

---

### Action 2B.2 — Create VPC Peering

```
aws ec2 create-vpc-peering-connection --vpc-id vpc-0ab936370488229bd --peer-vpc-id vpc-05e2e9c2e88029d4d
aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id pcx-015fcde392996ef5d
aws ec2 create-tags --resources pcx-015fcde392996ef5d --tags Key=Name,Value=muvi-uat-main-to-db-peering
```

**Result:** Peering `pcx-015fcde392996ef5d` — Main VPC (10.60.0.0/16) ↔ Database VPC (10.50.0.0/16) — ACTIVE

---

### Action 2B.3 — Route Tables

**Main VPC → Database VPC (10.50.0.0/16 → pcx-015fcde392996ef5d):**

| Route Table | Name | Result |
|-------------|------|--------|
| rtb-02471d72c6b2f4dd6 | rt-private-b | ✅ True |
| rtb-0dc208b77187889e8 | rt-private-a | ✅ True |
| rtb-05fb7cbd802026a81 | (main) | ✅ True |
| rtb-057aa39aa4b148292 | rt-public | ✅ True |

**Database VPC → Main VPC (10.60.0.0/16 → pcx-015fcde392996ef5d):**

| Route Table | Name | Result |
|-------------|------|--------|
| rtb-0e03cece634427e14 | rtb-private3-1c | ✅ True |
| rtb-0f34bf460956e2c85 | rtb-private1-1a | ✅ True |
| rtb-02f56ed37c0dd94cd | rtb-private2-1b | ✅ True |
| rtb-0c6264add5e0f9a46 | rtb-public | ✅ True |
| rtb-05ec67effb875a0c5 | (main) | ✅ True |

---

### Action 2B.4 — RDS Proxy Security Group

```
SG Created: sg-06c22a1a4cdce43b0 (muvi-uat-rds-proxy-sg)
VPC: vpc-05e2e9c2e88029d4d (Database VPC)
Inbound Rules:
  - TCP 5432 from 10.60.0.0/16 (Main VPC — ECS via peering)
  - TCP 5432 from 10.50.0.0/16 (Database VPC — internal)
```

---

### Action 2B.5 — Aurora SG Update

```
Aurora SG: sg-06048c6d73bab420a
Added: TCP 5432 from sg-06c22a1a4cdce43b0 (proxy SG)
Existing: TCP 5432 from 10.50.0.0/16
```

---

### Action 2B.6 — Secrets Manager Secrets

| Secret Name | DB Name | ARN |
|-------------|---------|-----|
| muvi-uat-main-db-secret | muvi_main_service | `arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-main-db-secret-Bq8VjU` |
| muvi-uat-identity-db-secret | muvi_identity_service | `arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-identity-db-secret-tCaxe5` |
| muvi-uat-payment-db-secret | muvi_payment_service | `arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-payment-db-secret-5JStyc` |
| muvi-uat-fb-db-secret | muvi_fb_db | `arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-fb-db-secret-SkXA9h` |
| muvi-uat-notification-db-secret | muvi_notification_service | `arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-notification-db-secret-3M5lzB` |
| muvi-uat-offer-db-secret | muvi_offer_service | `arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-offer-db-secret-26v6AP` |

All secrets contain: `{"username":"postgres","password":"<aurora-pass>","engine":"postgres","host":"<aurora-writer>","port":5432,"dbname":"<db-name>"}`

**Note:** Initial creation had malformed JSON (PowerShell stripped quotes). Fixed with `put-secret-value` using `file://` approach.

---

### Action 2B.7 — IAM Role

```
Role: muvi-uat-rds-proxy-role
ARN: arn:aws:iam::739991759290:role/muvi-uat-rds-proxy-role
Trust: rds.amazonaws.com
Inline Policy: SecretsManagerAccess → arn:aws:secretsmanager:me-central-1:739991759290:secret:muvi-uat-*
```

---

### Action 2B.8 — RDS Proxies Created

All 6 RDS Proxies created with:
- Engine: POSTGRESQL
- TLS: Required
- Idle timeout: 600s
- VPC: Database VPC (private subnets: subnet-05cc88f71a11f32f9, subnet-0622a75c9ddce4ddd, subnet-0741e8afe1295d77e)
- SG: sg-06c22a1a4cdce43b0
- Role: arn:aws:iam::739991759290:role/muvi-uat-rds-proxy-role

---

### Action 2B.9 — Targets + Pool Config

All 6 proxies registered to Aurora cluster `uatclusterdb`.

Pool configuration (matching prod):
- MaxConnectionsPercent: 100
- MaxIdleConnectionsPercent: 50
- ConnectionBorrowTimeout: 120s

---

### Action 2B.10 — Read-Only Endpoints

All 6 read-only endpoints created and available.

---

### Action 2B.11 — Verification

All 6 proxies: **Status = available**, All targets: **State = AVAILABLE**

---

## Final UAE DB Endpoint Map

### Writer Endpoints (DB_WRITE_HOST)

| Service | Proxy Write Endpoint |
|---------|---------------------|
| main | `uat-main-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| identity | `uat-identity-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| payment | `uat-payment-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| fb | `uat-fb-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| notification | `uat-notification-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| offer | `uat-offer-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |

### Reader Endpoints (DB_READ_HOST)

| Service | Proxy Read-Only Endpoint |
|---------|-------------------------|
| main | `uat-main-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| identity | `uat-identity-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| payment | `uat-payment-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| fb | `uat-fb-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| notification | `uat-notification-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |
| offer | `uat-offer-proxy-read-only.endpoint.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com` |

---

## Prod vs UAE Comparison (After Phase 2B)

| Aspect | Prod | UAE UAT | Match? |
|--------|------|---------|--------|
| RDS Proxies | 6 | 6 | ✅ |
| Read/Write split | Proxy writer + RO endpoints | Proxy writer + RO endpoints | ✅ |
| Pool Config | MaxConn=100%, MaxIdle=50%, Borrow=120s | MaxConn=100%, MaxIdle=50%, Borrow=120s | ✅ |
| TLS Required | Yes | Yes | ✅ |
| Idle Timeout | 600s | 600s | ✅ |
| Aurora Access | Private (SG-based) | Private (SG-based + CIDR) | ✅ |
| Topology | 6 clusters in 1 VPC | 1 cluster in DB VPC, peered to ECS VPC | ⚠️ Acceptable |
| Instance Class | r5.large-2xlarge | db.t3.medium | ⚠️ OK for UAT |

---

## Cost Impact

| Resource | Monthly Cost |
|----------|-------------|
| 6 RDS Proxies (2 ACUs min each) | ~$263/mo |
| VPC Peering | $0 (same region, same account) |
| Secrets Manager (6 secrets) | ~$2.40/mo |
| IAM Role | $0 |
| **Total** | **~$265/mo** |

---

## Cleanup Checklist (if needed)

- [ ] Delete 6 RDS Proxy read-only endpoints
- [ ] Delete 6 RDS Proxies
- [ ] Delete 6 Secrets Manager secrets
- [ ] Delete IAM role + inline policy
- [ ] Delete proxy SG
- [ ] Remove proxy SG rule from Aurora SG
- [ ] Delete VPC peering
- [ ] Remove peering routes from all route tables

