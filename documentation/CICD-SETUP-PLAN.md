# CI/CD Pipeline Setup Plan — UAE (me-central-1)

**Status:** Paused — resume next week  
**Blocker:** Need GitHub CLI installed (requires IT admin approval)  
**Last updated:** February 12, 2026

---

## What We Know

### GitHub Org: `muvicinemas` (YOUR team's repos)
You have **admin access** (Settings tab visible in each repo).

| Repo | Default Branch | Other Branches | Vendor Equivalent (AlphaApps) |
|---|---|---|---|
| `muvicinemas/alpha-muvi-gateway-main` | `main` | `v20250930`, `v20251229` | `AlphaApps/muvi-gateway` |
| `muvicinemas/alpha-muvi-main-main` | `main` | — | `AlphaApps/muvi-main` |
| `muvicinemas/alpha-muvi-identity-main` | `main` | — | `AlphaApps/muvi-identity-service` |
| `muvicinemas/alpha-muvi-payment-main` | `main` | — | `AlphaApps/muvi-payment-service` |
| `muvicinemas/alpha-muvi-fb-main` | `main` | — | `AlphaApps/muvi-fb-service` |
| `muvicinemas/alpha-muvi-notification-main` | `main` | — | `AlphaApps/muvi-notification-service` |
| `muvicinemas/alpha-muvi-offer` | `master` | `v20251229`, `v20260114` | `AlphaApps/muvi-offer-service` |

**Note:** `alpha-muvi-offer` uses `master` not `main`.

### Vendor's repos (AlphaApps) — Frankfurt CodePipeline
- Vendor org: `AlphaApps`
- All pipelines trigger on `uat` branch push
- Also have: `AlphaApps/muvi-website`, `AlphaApps/Muvi-Dashboard` (CMS, S3 deploy)

### UAE ECR Repos (me-central-1)
- `muvi-gateway-uat`
- `muvi-main-uat`
- `muvi-identity-uat`
- `muvi-payment-uat`
- `muvi-notification-uat`
- `muvi-website-uat`
- **Missing:** F&B, Offer (need to create)

### UAE ECS Services (me-central-1, cluster: `Muvi-Cluster`)
- `muvi-gateway-service-mfnabtxa`
- `muvi-main-uat`
- `muvi-identity-uat`
- `muvi-payment-uat`
- `muvi-notification-uat`
- `muvi-website-uat`
- **Missing:** F&B, Offer (need to create)

### Git Credentials
- Windows Credential Manager has `git:https://github.com` stored
- Git fetch works (tested on gateway repo)
- No `git config` global user.name/email set

---

## Branching Strategy (To Decide With Team Lead)

Vendor model:
```
main (dev work) → uat (auto-deploy to UAT) → prod (auto-deploy to prod)
```

Your repos currently: Only `main`/`master`, no deployment branches.

**Decision needed:** Use `uat` branch model like vendor, or deploy from `main` directly?

---

## Implementation Plan

### Phase 1: Prerequisites (Next Week)
- [ ] Install GitHub CLI (`winget install GitHub.cli` — needs IT admin)
- [ ] Run `gh auth login` to authenticate
- [ ] Check org permissions: `gh api orgs/muvicinemas/memberships/rehan.tariq`
- [ ] Check if branch protection rules exist: `gh api repos/muvicinemas/alpha-muvi-gateway-main/branches/main/protection`
- [ ] Set `git config --global user.name` and `user.email`

### Phase 2: Extract Vendor Config from Frankfurt
- [ ] Pull CodeBuild project config (`Muvi-Build` in eu-central-1)
- [ ] Pull CodePipeline structure (all 9 pipelines)
- [ ] Pull IAM roles used by CodeBuild/CodePipeline
- [ ] Document buildspec.yml / build commands

### Phase 3: Create AWS Resources in UAE (me-central-1)
- [ ] S3 artifact bucket for CodePipeline
- [ ] IAM role for CodeBuild (ECR push, CloudWatch logs)
- [ ] IAM role for CodePipeline (S3, CodeBuild, ECS)
- [ ] CodeStar connection to `muvicinemas` GitHub org (**requires manual OAuth click in AWS Console**)

### Phase 4: Test with One Service (Gateway)
- [ ] Create CodeBuild project in me-central-1
- [ ] Create CodePipeline: Source (GitHub) → Build → Deploy (ECS)
- [ ] Create `uat` branch on gateway repo
- [ ] Push test commit → verify auto-deploy works
- **Estimated cost of 1 test: ~$0.02**

### Phase 5: Replicate for All Services
- [ ] Create pipelines for: main, identity, payment, notification, website
- [ ] Create ECR repos + ECS services for: F&B, offer (missing in UAE)
- [ ] Set up branch protection rules on all repos

---

## Cost Summary
| Component | Monthly Cost |
|---|---|
| CodePipeline (6 pipes) | ~$5 |
| CodeBuild (~240 mins) | ~$0.70 |
| S3 + CloudWatch | ~$0.52 |
| ECR storage | ~$0.50 |
| **Total** | **~$6-7/month** |

---

## Alternative: GitHub Actions (if team prefers)
- Cost: $0 (free tier covers it)
- Less AWS-native but simpler YAML setup
- Store AWS credentials as GitHub Secrets
- Same end result: push to branch → deploy to ECS
- **Decision: match vendor (CodePipeline) or use GitHub Actions?**
