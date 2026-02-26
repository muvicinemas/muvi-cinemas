# UAE Phase 3 Execution Log — Networking (ALBs, TGs, SGs)

**Date**: February 25, 2025  
**Region**: me-central-1 (UAE)  
**Account**: 739991759290  
**Operator**: rehan.tariq@muvicinemas.com  

---

## Summary

Phase 3 mirrors production networking from Account 2 (`eu-central-1`) to UAE Account 1 (`me-central-1`).

**Created**:
- 12 Security Groups with full ingress rules (3 ALB + 9 ECS)
- 9 Target Groups (3 HTTP1 + 6 GRPC) — all port 80, ip target type
- 3 Application Load Balancers with 8 total listeners
- 1 ACM Certificate (self-signed, for internal HTTPS listeners)
- Cleaned up 2 misconfigured TGs + 6 orphaned listener rules

---

## Security Groups

### ALB Security Groups

| SG ID | Name | Ingress |
|-------|------|---------|
| sg-0a9f27c9050348d22 | muvi-uat-alb-sg | TCP 80 from 0.0.0.0/0 |
| sg-0d52c3592bc9b4223 | muvi-uat-website-alb-sg | TCP 80,443 from 0.0.0.0/0 |
| sg-065895635e8474f0b | muvi-uat-internal-alb-sg | TCP 5002-5007 from 0.0.0.0/0 |

### ECS Security Groups

| SG ID | Name | Ingress Rules |
|-------|------|---------------|
| sg-0e23022843cd332c7 | muvi-uat-gateway-ecs-sg | TCP 3001 from ALB+IALB+Main+Identity+Notif; All from Redis |
| sg-0f2bc74f719236434 | muvi-uat-main-ecs-sg | TCP 5002 from GW+IALB+Identity; All TCP from Notif+Payment; All from Redis |
| sg-0c616792bfb778e95 | muvi-uat-identity-ecs-sg | TCP 5005 from IALB+Payment+Main+GW+FB; All from Redis |
| sg-0e246e3c825bf988a | muvi-uat-payment-ecs-sg | TCP 5004 from IALB; All TCP from GW+Identity+Main+Notif; All from Redis |
| sg-0b02bb81ef61f271f | muvi-uat-fb-ecs-sg | TCP 5006 from IALB; All TCP from Pay+GW+Notif+Identity+Main+self; All from Redis |
| sg-0af86aff9b93c11ed | muvi-uat-notification-ecs-sg | TCP 5003 from GW+Identity+Main+Payment+IALB; All from Redis |
| sg-0d25823c9afe2bdde | muvi-uat-offer-ecs-sg | TCP 5007 from IALB; All TCP from Pay+GW+Notif+Main+Identity+self; All from Redis |
| sg-07a05ebaf552a1a21 | muvi-uat-website-ecs-sg | TCP 80 from Website ALB SG |
| sg-09a1fbd5a66494984 | muvi-uat-ticket-ecs-sg | TCP 80 from ALB SG + IALB SG |

**Pre-existing**: sg-0731967bbd5ef6e51 (redis-uat-sg) — referenced by all backend ECS SGs

---

## Target Groups

| TG Name | Protocol Version | Port | Health Check Path | Timeout/Interval | Healthy/Unhealthy | Matcher |
|---------|-----------------|------|-------------------|------------------|-------------------|---------|
| muvi-uat-gateway-tg | HTTP1 | 80 | /heartbeat | 5s/30s | 5/2 | HTTP 204 |
| muvi-uat-main-grpc | GRPC | 80 | /healthCheck.HealthCheckService/HealthCheck | 30s/31s | 5/4 | gRPC 0 |
| muvi-uat-identity-tg | GRPC | 80 | /healthCheck.HealthCheckService/HealthCheck | 5s/60s | 5/2 | gRPC 0 |
| muvi-uat-payment-grpc | GRPC | 80 | /healthCheck.HealthCheckService/HealthCheck | 30s/31s | 5/4 | gRPC 0 |
| muvi-uat-fb-grpc-tg | GRPC | 80 | /healthCheck.HealthCheckService/HealthCheck | 5s/30s | 5/2 | gRPC 0 |
| muvi-uat-notification-grpc | GRPC | 80 | /healthCheck.HealthCheckService/HealthCheck | 5s/30s | 5/2 | gRPC 0 |
| muvi-uat-offer-grpc | GRPC | 80 | /healthCheck.HealthCheckService/HealthCheck | 30s/60s | 5/4 | gRPC 0 |
| muvi-uat-ticket-tg | HTTP1 | 80 | /healthCheck.HealthCheckService/HealthCheck | 5s/30s | 5/2 | HTTP 200 |
| muvi-uat-website-tg | HTTP1 | 80 | /api/healthcheck | 5s/30s | 5/2 | HTTP 200 |

All TGs: VPC `vpc-0ab936370488229bd`, target-type=ip, deregistration=300s

---

## Application Load Balancers

### 1. Muvi-UAT (Gateway ALB — pre-existing, updated)

| Property | Value |
|----------|-------|
| ARN | `arn:aws:elasticloadbalancing:me-central-1:739991759290:loadbalancer/app/Muvi-UAT/0c76139f79d179a6` |
| Scheme | internet-facing |
| DNS | `Muvi-UAT-1566457059.me-central-1.elb.amazonaws.com` |
| SG | sg-0a9f27c9050348d22 (muvi-uat-alb-sg) — **UPDATED** |
| Subnets | public-a, public-b |
| State | active |

**Listeners**:
| Port | Protocol | Target Group |
|------|----------|-------------|
| 80 | HTTP | muvi-uat-gateway-tg |

**Changes made**: Updated SG from old to muvi-uat-alb-sg, updated default action from old muvi-gateway-tg to muvi-uat-gateway-tg, deleted 6 orphaned listener rules.

### 2. Muvi-Internal-UAT (Microservices ALB — NEW)

| Property | Value |
|----------|-------|
| ARN | `arn:aws:elasticloadbalancing:me-central-1:739991759290:loadbalancer/app/Muvi-Internal-UAT/9f82cec058681f01` |
| Scheme | internal |
| DNS | `internal-Muvi-Internal-UAT-1593349430.me-central-1.elb.amazonaws.com` |
| SG | sg-065895635e8474f0b (muvi-uat-internal-alb-sg) |
| Subnets | private-a, private-b |
| State | active |

**Listeners**:
| Port | Protocol | Target Group |
|------|----------|-------------|
| 5002 | HTTPS | muvi-uat-main-grpc |
| 5003 | HTTPS | muvi-uat-notification-grpc |
| 5004 | HTTPS | muvi-uat-payment-grpc |
| 5005 | HTTPS | muvi-uat-identity-tg |
| 5006 | HTTPS | muvi-uat-fb-grpc-tg |
| 5007 | HTTPS | muvi-uat-offer-grpc |

**ACM Certificate**: `arn:aws:acm:me-central-1:739991759290:certificate/6f56edba-845d-4680-b058-d610d25b365c` (self-signed, CN=internal-muvi-uat.local, valid 1 year)

**Note**: Prod uses HTTPS with a real ACM certificate. UAT uses a self-signed cert because this is internal-only traffic and there's no domain associated with this ALB. GRPC target groups require HTTPS listeners.

### 3. Muvi-Website-UAT (Website ALB — NEW)

| Property | Value |
|----------|-------|
| ARN | `arn:aws:elasticloadbalancing:me-central-1:739991759290:loadbalancer/app/Muvi-Website-UAT/41ff5d472addea4c` |
| Scheme | internet-facing |
| DNS | `Muvi-Website-UAT-1368645793.me-central-1.elb.amazonaws.com` |
| SG | sg-0d52c3592bc9b4223 (muvi-uat-website-alb-sg) |
| Subnets | public-a, public-b |
| State | active |

**Listeners**:
| Port | Protocol | Target Group |
|------|----------|-------------|
| 80 | HTTP | muvi-uat-website-tg |

---

## Cleanup Performed

| Action | Resource | Reason |
|--------|----------|--------|
| Deleted TG | muvi-gateway-tg (port 3001) | Misconfigured — should be port 80 |
| Deleted TG | muvi-website-tg (port 3000) | Misconfigured — should be port 80 |
| Deleted Rule | Priority 5 on Muvi-UAT | Referenced old muvi-gateway-tg |
| Deleted Rule | Priority 6 on Muvi-UAT | Referenced old muvi-gateway-tg |
| Deleted Rule | Priority 7 on Muvi-UAT | Referenced old muvi-gateway-tg |
| Deleted Rule | Priority 20 on Muvi-UAT | Referenced old muvi-website-tg |
| Deleted Rule | Priority 25 on Muvi-UAT | Referenced old muvi-website-tg |
| Deleted Rule | Priority 26 on Muvi-UAT | Referenced old muvi-website-tg |

---

## Prod vs UAT Delta

| Aspect | Prod (eu-central-1) | UAT (me-central-1) | Reason |
|--------|--------------------|--------------------|--------|
| Internal ALB cert | Real ACM w/ domain | Self-signed cert | No domain in UAT |
| Internal ALB listeners | HTTPS | HTTPS | Same (required for GRPC TGs) |
| ALB access logs | Enabled (S3 bucket) | Not enabled | Not needed for UAT |
| Subnets | 3 AZs (1a/1b/1c) | 2 AZs (1a/1b) | UAE region has fewer AZs |
| TG names | muvi-[service]-tg | muvi-uat-[service]-tg | Avoid conflicts with pre-existing |

---

## Verification Status

All resources verified using `describe-*` calls after creation (Rule #5):

- [x] 12 Security Groups created and tagged
- [x] 3 ALB SGs — ingress rules verified
- [x] 9 ECS SGs — ingress rules verified (each individually)
- [x] 9 Target Groups — port 80, correct protocol versions, correct health checks
- [x] Muvi-UAT ALB — SG updated, listener updated to new TG
- [x] Muvi-Internal-UAT ALB — 6 HTTPS listeners verified
- [x] Muvi-Website-UAT ALB — 1 HTTP listener verified
- [x] Old TGs and rules deleted
- [x] All 3 ALBs in `active` state

---

## Post-Creation Comprehensive Audit (Prod vs UAE)

**Audit Date**: February 25, 2025  
**Purpose**: Verify every networking detail matches production exactly

### ALB Attributes Comparison

| Attribute | Prod | UAE | Match |
|-----------|------|-----|-------|
| idle_timeout | 60s | 60s | ✅ |
| http2 | true | true | ✅ |
| cross_zone | true | true | ✅ |
| deletion_protection | false | false | ✅ |
| desync_mitigation | defensive | defensive | ✅ |
| client_keepalive | 3600s | 3600s | ✅ |

*All 3 ALBs checked — identical attributes across UAE.*

### Target Group Attributes Comparison (All 9 TGs)

| Attribute | Prod | UAE | Match |
|-----------|------|-----|-------|
| deregistration_delay | 300s | 300s | ✅ |
| load_balancing_algorithm | round_robin | round_robin | ✅ |
| stickiness | false | false | ✅ |

### Health Check Settings — Side-by-Side (All 9 TGs)

| Service | Protocol | Port | Path | Interval | Timeout | Healthy | Unhealthy | Matcher | Proto Ver | Match |
|---------|----------|------|------|----------|---------|---------|-----------|---------|-----------|-------|
| Gateway | HTTP | traffic-port | /heartbeat | 30s | 5s | 5 | 2 | HTTP 204 | HTTP1 | ✅ |
| Main | HTTP | traffic-port | /healthCheck...HealthCheck | 31s | 30s | 5 | 4 | gRPC 0 | GRPC | ✅ |
| Identity | HTTP | traffic-port | /healthCheck...HealthCheck | 60s | 5s | 5 | 2 | gRPC 0 | GRPC | ✅ |
| Payment | HTTP | traffic-port | /healthCheck...HealthCheck | 31s | 30s | 5 | 4 | gRPC 0 | GRPC | ✅ |
| F&B | HTTP | traffic-port | /healthCheck...HealthCheck | 30s | 5s | 5 | 2 | gRPC 0 | GRPC | ✅ |
| Notification | HTTP | traffic-port | /healthCheck...HealthCheck | 30s | 5s | 5 | 2 | gRPC 0 | GRPC | ✅ |
| Offer | HTTP | traffic-port | /healthCheck...HealthCheck | 60s | 30s | 5 | 4 | gRPC 0 | GRPC | ✅ |
| Ticket | HTTP | traffic-port | /healthCheck...HealthCheck | 30s | 5s | 5 | 2 | HTTP 200 | HTTP1 | ✅ |
| Website | HTTP | traffic-port | /api/healthcheck | 30s | 5s | 5 | 2 | HTTP 200 | HTTP1 | ✅ |

**Result: 9/9 TGs — zero health check mismatches.**

### Security Group Egress Rules (All 12 SGs)

| SG | Egress Protocol | Match Prod |
|----|-----------------|------------|
| muvi-uat-alb-sg | -1 (all traffic) | ✅ |
| muvi-uat-website-alb-sg | -1 (all traffic) | ✅ |
| muvi-uat-internal-alb-sg | -1 (all traffic) | ✅ |
| muvi-uat-gateway-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-main-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-identity-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-payment-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-fb-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-notification-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-offer-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-website-ecs-sg | -1 (all traffic) | ✅ |
| muvi-uat-ticket-ecs-sg | -1 (all traffic) | ✅ |

**Result: 12/12 SGs — all egress = allow-all, matches prod.**

### ALB Listener Rules Comparison

**Gateway ALB**:
| | Prod (Muvi-Prod) | UAE (Muvi-UAT) |
|--|------------------|----------------|
| Listener | HTTP :80 | HTTP :80 |
| Rules | Priority 1: path "/" → gateway-tg (redundant), Default → gateway-tg | Default → muvi-uat-gateway-tg |
| **Verdict** | ✅ Functionally identical — prod's priority-1 `/` rule is a no-op |

**Internal ALB**:
| | Prod (Muvi-Microservices-Prod) | UAE (Muvi-Internal-UAT) |
|--|-------------------------------|-------------------------|
| Listeners | 6x HTTPS (5002-5007) | 6x HTTPS (5002-5007) |
| SSL Policy | ELBSecurityPolicy-2016-08 | ELBSecurityPolicy-2016-08 |
| Port 5002 | → muvi-main-grpc | → muvi-uat-main-grpc |
| Port 5003 | → muvi-notification-grpc | → muvi-uat-notification-grpc |
| Port 5004 | → muvi-payment-grpc | → muvi-uat-payment-grpc |
| Port 5005 | → muvi-identity-tg | → muvi-uat-identity-tg |
| Port 5006 | → muvi-fb-grpc-tg | → muvi-uat-fb-grpc-tg |
| Port 5007 | → muvi-offer-grpc | → muvi-uat-offer-grpc |
| Rules | Default forwarding only (no path/host rules) | Default forwarding only |
| **Verdict** | ✅ Exact match (port mappings, SSL policy, no complex rules) |

**Website ALB**:
| | Prod (Muvi-Website-ALB) | UAE (Muvi-Website-UAT) |
|--|------------------------|------------------------|
| Listener | HTTP :80 | HTTP :80 |
| Rules | Default → muvi-website-tg | Default → muvi-uat-website-tg |
| **Verdict** | ✅ Exact match |

### Ticket Target Group

Both `muvi-ticket-tg` (prod) and `muvi-uat-ticket-tg` (UAE) are **orphaned** — not attached to any ALB listener in either environment. `LoadBalancerArns: []` for both. This is matching behavior. If the ticket service needs to be activated, a new listener (e.g., port 5008) would need to be added to the Internal ALB in both environments.

### Known Intentional Differences

| Aspect | Prod | UAE | Justification |
|--------|------|-----|---------------|
| Internal ALB cert | Real ACM cert (domain-validated) | Self-signed cert (CN=internal-muvi-uat.local) | No domain registered for UAT; internal traffic only |
| Access logs | Enabled (S3) | Disabled | Not needed for UAT/load testing |
| AZs | 3 (1a/1b/1c) | 2 (1a/1b) | me-central-1 has fewer public AZs available |
| Gateway rule | path "/" at priority 1 (redundant) | No custom rules | Functionally identical; redundant rule omitted |

### Audit Conclusion

**Phase 3 networking is a complete, verified mirror of production.** Every measurable attribute — ALB configs, TG health checks, SG rules, listener ports, SSL policies, routing rules — matches prod exactly. The only differences are intentional (self-signed cert, no access logs, 2 vs 3 AZs) and documented above.
