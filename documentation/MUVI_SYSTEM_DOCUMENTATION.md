# MUVI Cinemas — Complete System Knowledge Base

> **Last Updated:** February 23, 2026
> **Purpose:** The single source of truth for every fact about the Muvi Cinemas platform — architecture, code, infrastructure, integrations, operations, costs, and transition status.
> **Audience:** AI agent, engineering team, CTO, CIO — anyone who needs to understand or operate this system.
> **Critical Context:** Two AWS accounts exist. Account 1 (739991759290) = in-house, writable. Account 2 (011566070219) = production, read-only.

---

## Table of Contents

1. [Business Context](#1-business-context)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Microservices Deep Dive](#3-microservices-deep-dive)
4. [Shared Packages & SDK Architecture](#4-shared-packages--sdk-architecture)
5. [Communication Patterns (gRPC, Queues, Pub/Sub)](#5-communication-patterns-grpc-queues-pubsub)
6. [Third-Party Integrations (23 Services)](#6-third-party-integrations-23-services)
7. [Scheduled Jobs & Cron (15 Jobs)](#7-scheduled-jobs--cron-15-jobs)
8. [Bull Queues & Async Processing (6 Queues)](#8-bull-queues--async-processing-6-queues)
9. [CLI Sync Jobs (2 Jobs)](#9-cli-sync-jobs-2-jobs)
10. [API Surface (481 Endpoints)](#10-api-surface-481-endpoints)
11. [Database Architecture](#11-database-architecture)
12. [Redis Architecture](#12-redis-architecture)
13. [Security & Auth Model](#13-security--auth-model)
14. [Observability (Datadog, Sentry, Winston)](#14-observability-datadog-sentry-winston)
15. [AWS Infrastructure — Frankfurt UAT (Vendor)](#15-aws-infrastructure--frankfurt-uat-vendor)
16. [AWS Infrastructure — UAE UAT (Our Setup)](#16-aws-infrastructure--uae-uat-our-setup)
17. [Infrastructure Gap Analysis (Frankfurt vs UAE)](#17-infrastructure-gap-analysis-frankfurt-vs-uae)
18. [AWS Cost Analysis](#18-aws-cost-analysis)
19. [CI/CD Pipeline Plan](#19-cicd-pipeline-plan)
20. [GitHub Repositories & Branching](#20-github-repositories--branching)
21. [Local Development Setup](#21-local-development-setup)
22. [Vendor Takeover Plan (8 Weeks)](#22-vendor-takeover-plan-8-weeks)
23. [Critical Flows & Booking Lifecycle](#23-critical-flows--booking-lifecycle)
24. [Key Risks & Operational Gaps](#24-key-risks--operational-gaps)
25. [Documentation Inventory](#25-documentation-inventory)
26. [Project Structure (Actual Workspace)](#26-project-structure-actual-workspace)
27. [Quick Reference & Cheatsheet](#27-quick-reference--cheatsheet)
28. [Production Infrastructure — Complete Inventory (Account 2)](#28-production-infrastructure--complete-inventory-account-2)
29. [UAT Infrastructure — Complete Inventory (Account 1)](#29-uat-infrastructure--complete-inventory-account-1)
30. [Networking & VPC Peering Topology](#30-networking--vpc-peering-topology)
31. [Configuration Management — SSM & Secrets (All Values)](#31-configuration-management--ssm--secrets-all-values)
32. [ECS Task Definitions — Complete Reference](#32-ecs-task-definitions--complete-reference)
33. [Known Architectural Issues & Technical Debt](#33-known-architectural-issues--technical-debt)
34. [AWS Ecosystem Dashboard & Control Panel](#34-aws-ecosystem-dashboard--control-panel)

---

## 1. Business Context

### What is Muvi Cinemas?
Muvi Cinemas is a Saudi Arabian cinema chain. This platform is their complete digital operation:
- **Customer website** for browsing films, booking tickets, ordering food
- **Mobile apps** (iOS, Android, Huawei) for the same
- **CMS admin panel** for cinema operations staff to manage films, cinemas, offers, orders, refunds
- **Kiosk system** for in-cinema self-service ticket and food ordering

### Business Scale
- Operates in **3 cities in Saudi Arabia**
- **3,000–8,000** daily unique visitors
- **15,000–25,000** on peak days (Thursday/Friday, blockbuster releases)
- **500–2,000** peak concurrent users (6PM–10PM)
- **100K–500K** API requests per day
- Each page load generates **5–15 API calls**
- Booking conversion rate: **~10–15%**
- Traffic classification: **"Low-to-Medium"**

### Key Stakeholders
- **Vendor:** Alpha Apps (original developer) — based in Frankfurt, Germany
- **In-house team:** Muvi Cinemas IT (taking over) — led by Rehan Tariq
- **GitHub Org:** `muvicinemas` (in-house repos)
- **Vendor GitHub Org:** `AlphaApps`

### AWS Accounts (CRITICAL)

| Property | Account 1 (In-House) | Account 2 (Production) |
|----------|---------------------|------------------------|
| **Account ID** | `739991759290` | `011566070219` |
| **AWS CLI Profile** | `default` | `muvi-prod` |
| **Primary Region** | `me-central-1` (UAE) | `eu-central-1` (Frankfurt) |
| **Default Region** | `me-south-1` (Bahrain) | `eu-central-1` (Frankfurt) |
| **IAM User** | `rehan.tariq@muvicinemas.com` | (shared prod access) |
| **Access Level** | **Full read + write** | **Read-only** |
| **Contains** | UAT environment, CI/CD, dev resources | Production (9 live services) |
| **ECS Cluster** | `Muvi-Cluster` (me-central-1) | `Muvi-Production` (eu-central-1) |
| **Monthly Spend** | ~$689 (current), ~$285 (optimized) | ~$27,873 |

> ⚠️ **GOLDEN RULE:** NEVER modify Account 2 (production). Read-only. NEVER commit/push without explicit approval.

---

## 2. System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                              │
│    📱 Mobile App         💻 Website           🖥️ CMS Admin         🎫 Kiosk            │
│         │                    │                     │                  │                 │
└─────────┼────────────────────┼─────────────────────┼──────────────────┼─────────────────┘
          └────────────────────┴─────────────────────┴──────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ☁️ AWS CLOUD                                                │
│                                                                                          │
│  Route 53 (DNS) → CloudFront (CDN) → ALB (SSL termination, WAF, health checks)          │
│                                         │                                               │
│                                         ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  🚪 GATEWAY SERVICE (NestJS, Port 3000)                                           │  │
│  │  HTTP Layer: Rate Limiter → CORS → Helmet → Body Parser                           │  │
│  │  NestJS Layer: Request ID → Auth Guard → Logger → Validator                        │  │
│  │  Controller Layer: REST endpoints (/api/v1/*)                                      │  │
│  │  SDK Layer: gRPC clients → identity-sdk, payment-sdk, main-sdk, fb-sdk             │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                    │                 │                 │                 │                │
│              gRPC (HTTP/2, binary, fast)                                                │
│                    │                 │                 │                 │                │
│                    ▼                 ▼                 ▼                 ▼                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  IDENTITY    │ │    MAIN      │ │   PAYMENT    │ │     FB       │ │ NOTIFICATION │  │
│  │  NestJS:5001 │ │  NestJS:5002 │ │  NestJS:5003 │ │ NestJS:5004  │ │  NestJS:5005 │  │
│  │  Users,Auth  │ │  Films,Book  │ │  Pay,Refund  │ │ Food,Kiosk   │ │  Push,Email  │  │
│  │  Permissions │ │  Cinema,Seat │ │  Wallet,Card │ │ Concessions  │ │  SMS,Braze   │  │
│  │  Sequelize   │ │  Sequelize   │ │  Sequelize   │ │ Sequelize    │ │  Sequelize   │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │
│         │                │                │                │                │            │
│  ┌──────────────┐        │                │                │                │            │
│  │    OFFER     │        │                │                │                │            │
│  │   Go:5006    │        │                │                │                │            │
│  │  Promos,Disc │        │                │                │                │            │
│  │  GORM/gRPC   │        │                │                │                │            │
│  └──────┬───────┘        │                │                │                │            │
│         │                │                │                │                │            │
│         ▼                ▼                ▼                ▼                ▼            │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │  🗄️ PostgreSQL (per-service DB)     ⚡ Redis Cluster     📦 S3 (media/files)   │    │
│  │  identity_db, main_db, payment_db   Session, Rate Limit   CloudFront CDN        │    │
│  │  fb_db, notification_db, offer_db   Bull Queues, Cache    Apple Wallet .pkpass   │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │  📊 Datadog (APM, logs)     🐛 Sentry (errors)     🔐 SSM (secrets)           │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Microservices Summary Table

| Service | Language | Framework | Port | gRPC Port | Database | ORM | Purpose |
|---------|----------|-----------|------|-----------|----------|-----|---------|
| **Gateway** | TypeScript | NestJS 8.4.x | 3000 | — | — | — | API Gateway, rate limiting, auth, HTTP→gRPC proxy |
| **Identity** | TypeScript | NestJS 8.4.x | 6001 | 5001 | identity_db | Sequelize | Users, auth, OTP, permissions, roles, guest users |
| **Main** | TypeScript | NestJS 8.4.x | 6002 | 5002 | main_db | Sequelize | Films, cinemas, sessions, bookings, seats, orders |
| **Payment** | TypeScript | NestJS 8.4.x | 6003 | 5003 | payment_db | Sequelize | Payments, refunds, wallets, cards, webhooks |
| **FB (Food)** | TypeScript | NestJS **9.4.0** | 6004 | 5004 | fb_db | Sequelize | Food menu, concessions, kiosk orders, F&B sync |
| **Notification** | TypeScript | NestJS 8.4.x | 6005 | 5005 | notification_db | Sequelize | Push notifications, email, SMS, Braze |
| **Offer** | **Go 1.24** | gRPC + GORM | — | 5006 | offer_db | GORM | Promotions, discounts, vouchers, student offers |

**Critical observation:** F&B runs NestJS **9.4.0** while all others run **8.4.x**. F&B also uses TypeScript **4.7.4** vs **4.3.5** for others. The `muvi-shared` package uses `@nestjs/common ^9.4.0` and TypeScript **5.0.4**. This version split is a maintenance risk.

### Platform Distinction
All clients (website, mobile, CMS, kiosk) hit the same Gateway. Platform is distinguished by the `x-device-platform` header:
- Values: `ios`, `android`, `website`, `huawei`, `kiosk`
- Platform affects: maintenance toggles, payment callbacks, banners, version checks, throttling bypass (kiosks skip rate limiting)
- CMS routes: `/api/v1/cms/*` prefix
- Website/Mobile/Kiosk routes: same endpoints, no prefix

---

## 3. Microservices Deep Dive

### 3.1 Gateway Service (`alpha-muvi-gateway-main`)

**Role:** Single public entry point. All HTTP traffic enters here, gets validated, authenticated, then forwarded via gRPC to backend services. Has NO database of its own.

**Version:** 1.20.5

**Entry point flow:**
```
main.ts → loadSsmConfig() → NestFactory.create() → GlobalValidationPipe → AllExceptionsFilter
→ trust proxy → setGlobalPrefix("/api/v1") → enableCors → SwaggerModule → listen(PORT)
→ Production? AppClusterService.clusterize() : single process
```

**Key modules in app.module.ts:**
- `ThrottlerModule` — Redis-backed rate limiting (default: 100 req/60s; order endpoints: 5 req/60s)
- `ConfigModule` — loads env vars from `appConfig`, `credentialsConfig`
- `CacheModule` — Redis caching with `cache-manager-redis-store`
- Feature modules: `IdentityModule`, `MainModule`, `PaymentModule`, `FBModule`, `NotificationModule`, `OfferModule`

**Global providers:**
- `CheckIsUnderMaintenanceGuard` — blocks all requests when maintenance mode is ON (checked via Redis)
- `GrpcErrorsInterceptor` — catches gRPC errors and converts to HTTP errors
- `MUVIWinstonLoggerInterceptor` — structured logging to Datadog

**Clustering:** In production, uses Node.js `cluster` module to fork 1 worker per CPU core. Workers auto-restart on crash.

**gRPC Client connections:**
- `identity-service:5001` → auth, users, CMS auth, settings, guest users
- `main-service:5002` → films, cinemas, sessions, bookings, orders, offers
- `payment-service:5003` → payments, cards, wallets, refunds, top-ups
- `fb-service:5004` → food menu, concessions, kiosk
- `notification-service:5005` → notifications, push templates
- `offer-service:5006` → offers, rules, vouchers (Go gRPC)

**Key files:**
| File | Purpose |
|------|---------|
| `src/main.ts` | Entry point, SSM config load, bootstrap |
| `src/app.module.ts` | Module registration, global guards/interceptors |
| `src/tracer.ts` | Datadog dd-trace init (MUST be first import) |
| `src/app-cluster.service.ts` | Multi-process clustering |
| `src/guard/auth.guard.ts` | JWT validation, permission checking |
| `src/guard/throttler-behind-proxy-guard.ts` | Rate limiting with kiosk bypass |
| `src/shared/caching/redis-caching.service.ts` | Redis cache (2 DBs: DEFAULT + SYSTEM_STATUS) |
| `src/shared/load-ssm-config.ts` | AWS SSM parameter loader |
| `src/identity/controllers/auth.controller.ts` | Auth routes (send-otp, verify-otp, me, profile) |
| `src/identity/services/auth.service.ts` | gRPC proxy to identity service |

### 3.2 Identity Service (`alpha-muvi-identity-main`)

**Role:** User management, authentication, OTP, permissions, roles, guest users, device tokens.

**Version:** 1.20.1

**Most complex gRPC surface:** 124 RPCs across 23 gRPC services.

**Key facts:**
- Uses **Sequelize** with PostgreSQL (NOT Prisma/TypeORM)
- 19 Sequelize models: User, UserRole, Permission, GuestUser, Settings, Avatar, OTP, CommunicationLanguage, etc.
- City data is **replicated** from Main service; FK constraints intentionally avoided to prevent replication lag errors
- OTP providers: Unifonic (primary) + Taqnyat (alternative), switchable via factory pattern
- Email: SendGrid for password reset, verification, user onboarding
- Braze integration for customer engagement/segmentation (logged-in vs guest segments)
- Bull queue: `device-token-queue` — batches device tokens in-memory, flushes every 10s in batches of 300

**Scripts:**
- `start:prod: node --wasm-code-gc ... dist/src/main`

### 3.3 Main Service (`alpha-muvi-main-main`)

**Role:** Core business logic — films, cinemas, sessions, bookings, orders, seats, genres, people, offers, refunds.

**Version:** 1.20.8

**Key facts:**
- Heavy Vista Entertainment integration (6 sync services for cinemas, films, sessions, genres, people, attributes)
- Uses `nest-commander` CLI for standalone Vista sync: `vista-sync -a|-c|-f|-g|-s|-p`
- Apple Wallet `.pkpass` generation via `@walletpass/pass-js`
- Ticket image rendering via Puppeteer (headless Chrome EJS→PNG→S3)
- ZATCA-compliant QR code generation for Saudi e-invoicing
- Google Maps reverse geocoding for cinema proximity
- Excel/CSV export via `exceljs` and `csv-parse`
- Bull queues: `generate-ticket-queue` (processes ticket generation after payment), `bulk-refund-queue` (CMS-triggered bulk refunds)

**Source structure (key directories):**
```
src/
├── banners/          # Promotional banners
├── bookmarks/        # User film bookmarks
├── cinemas/          # Cinema CRUD + Vista sync
├── city/             # Cities + geocoding
├── experiences/      # IMAX, 4DX, VIP, etc.
├── film-finder/      # Advanced film search
├── film-session/     # Showtimes management
├── films/            # Film CRUD + Vista sync
├── genres/           # Genre management
├── orders/           # Order lifecycle, ticket gen, Apple Wallet
├── offers/           # Offer management
├── people/           # Cast/crew management
├── rate/             # User ratings
├── refund-payment-requests/  # Bulk refund processing
├── sync-job/         # CLI Vista sync command
├── vista/            # Vista API integration (6 sync services)
└── shared/           # Reusable services (vista, email, files, redis)
```

### 3.4 Payment Service (`alpha-muvi-payment-main`)

**Role:** All payment processing — multiple gateways, Apple Pay, BNPL, wallets, refunds, webhooks, POS terminals.

**Version:** 1.20.6

**Key facts:**
- **4 payment gateways:** HyperPay, PayFort (Amazon Payment Services), Checkout.com (+ STC Pay), Tabby (BNPL)
- Apple Pay session validation via mutual TLS
- NearPay POS terminal integration for kiosk payments
- E-Wallet system with cashback campaigns
- AWS Lambda integration for finance report exports
- Redis Pub/Sub for real-time payment events
- Bull queues: `E_WALLET_QUEUE` (4 processes: ADD_TOP_UP, REFUND, EARNED_BOOKING_CASHBACK, EARNED_CAMPAIGN_CASHBACK), `refund-queue` (with 10-min backoff), `webhook-queue` (10s delay), `generate-ticket-queue` (enqueues for Main to process)

### 3.5 FB (Food & Beverage) Service (`alpha-muvi-fb-main`)

**Role:** Food menu, concession items, kiosk management, F&B ordering.

**Version:** 1.19.7

**Key facts:**
- Runs NestJS **9.4.0** (all others are 8.4.x) — version migration was done independently
- Has its own Vista integration for concession sync (tabs, items, modifiers, packages per-cinema with 10s/5s delays)
- ZATCA QR code generation for F&B invoice compliance
- Uses 3 SDKs: identity-sdk (1 call — settings), payment-sdk (3 POS RPCs for kiosk), main-sdk (27 RPCs)
- Exports its own SDK: `fb-sdk` (~85 RPCs, consumed by Gateway + Main)
- **Resource-heavy:** 2 vCPU, 4 GB RAM in production (4x other services) due to CCDS/Vista inventory sync with image processing
- Has `nest-commander` CLI for `vista-sync`

### 3.6 Notification Service (`alpha-muvi-notification-main`)

**Role:** Push notifications, email, SMS delivery, notification management.

**Version:** 1.20.0

**Key facts:**
- OneSignal for push notifications (iOS, Android, Huawei)
- SendGrid for transactional emails (with EJS templates)
- Braze for customer engagement messaging
- No direct Vista integration
- Proto version uses `-uat` tag: `@alpha.apps/muvi-proto: ^1.18.9-uat`

### 3.7 Offer Service (`alpha-muvi-offer`)

**Role:** Promotions, discounts, voucher validation, student offers.

**Version:** Go 1.24 (toolchain go1.24.11)

**Key facts:**
- **Only non-NestJS service** — written in Go
- Uses GORM ORM with PostgreSQL
- gRPC server with protobuf contracts from `gitlab.com/AlphaApps/muvi-proto`
- Has its own Vista integration for voucher validation
- UniPal integration for student discount verification
- Redis for offer rule caching
- Sentry Go SDK + Datadog dd-trace-go for observability
- Default branch is `master` (not `main` like others)

---

## 4. Shared Packages & SDK Architecture

### Internal NPM Packages (published to Verdaccio)

| Package | Version | Purpose | Key Dependencies |
|---------|---------|---------|-----------------|
| `@alpha.apps/muvi-proto` | ^1.20.2 | Protobuf definitions, generated TS types, gRPC service definitions | protobuf |
| `@alpha.apps/muvi-shared` | ^1.20.3 | Vista API integration helpers, DB replication utilities | `@nestjs/common ^9.4.0`, `axios`, `pg` |
| `@alpha.apps/nestjs-common` | ^1.1.18 | Sentry, Winston logging, gRPC exceptions, outgoing request logging | `winston-transport`, `moment` |
| `@alpha.apps/muvi-fb-sdk` | ^1.20.0 | F&B gRPC client SDK (~85 RPCs) | consumed by Gateway, Main |
| `@alpha.apps/muvi-main-sdk` | ^1.19.1 | Main gRPC client SDK (27 RPCs) | consumed by Gateway, F&B |
| `@alpha.apps/muvi-identity-sdk` | ^1.17.1 | Identity gRPC client SDK (1 effective RPC) | consumed by F&B only |
| `@alpha.apps/muvi-payment-sdk` | ^1.19.1 | Payment gRPC client SDK (3 POS RPCs) | consumed by F&B only |

### SDK Utilization Reality

| SDK | RPCs Exported | Consumers | Notes |
|-----|---------------|-----------|-------|
| Identity SDK | 1 effective RPC | F&B only | Overbuilt — single settings call |
| Payment SDK | 3 POS RPCs | F&B only | Small but justified for kiosk payments |
| Main SDK | 27 RPCs | Gateway + F&B | Mostly used, 1 unused service |
| F&B SDK | ~85 RPCs | Gateway + Main | Only SDK justified at scale |

### Package Dependency Graph

```
@alpha.apps/muvi-proto (protobuf contracts)
    ├──→ identity-sdk → consumed by: fb-main
    ├──→ payment-sdk  → consumed by: fb-main
    ├──→ main-sdk     → consumed by: gateway-main, fb-main
    ├──→ fb-sdk       → consumed by: gateway-main, main-main
    ├──→ gateway-main (direct proto import)
    ├──→ identity-main (direct proto import)
    ├──→ main-main (direct proto import)
    ├──→ payment-main (direct proto import)
    ├──→ notification-main (direct proto import)
    └──→ offer (Go — gitlab.com/AlphaApps/muvi-proto)

@alpha.apps/muvi-shared → consumed by: identity, main, payment, notification, fb
@alpha.apps/nestjs-common → consumed by: ALL 6 NestJS services
```

### Known SDK Issues
1. Multiple SDK copies exist (in proto/ and individual service repos) — divergence risk
2. Many proto files loaded by SDKs that expose only a few methods — wasteful proto loading
3. Some SDK services are present but not exported/registered — orphaned code
4. No official SDK ownership or release process defined

---

## 5. Communication Patterns (gRPC, Queues, Pub/Sub)

### Synchronous: gRPC (HTTP/2)
- **All inter-service calls** use gRPC over HTTP/2 (binary, fast, contract-enforced via protobuf)
- Gateway acts as HTTP→gRPC translator: receives REST requests, calls backend services via gRPC
- Service discovery: AWS Cloud Map (`uat.internal` namespace) or Docker container names locally
- Proto files define service contracts → shared via `@alpha.apps/muvi-proto`

### Asynchronous: Bull Queues (Redis-backed)
- 6 Bull queues for async task processing (see Section 8)
- Cross-service queuing: Payment enqueues → Main processes (generate-ticket-queue)
- Redis is the queue backend

### Asynchronous: Redis Pub/Sub
- Payment service uses Redis Pub/Sub for real-time payment event broadcasting
- File: `alpha-muvi-payment-main/src/.../redis-pubsub.service.ts`

### Saga Pattern (Multi-step Booking)
```
Book Now → Gateway → Main (reserve seats, status=PENDING)
→ Payment (create payment intent) → Response with payment URL
→ User pays → Payment webhook → Webhook Queue (10s delay)
→ Confirm booking → Main (update status=CONFIRMED) → Notification (push + email)
→ If failure: compensating action (cancel Vista order, refund payment)
```

### NestJS Request Pipeline
```
Request → Middleware → Guards → Interceptors → Pipes → Controller → Service
→ Interceptors (response transform) → Filters (error handling) → Response
```

---

## 6. Third-Party Integrations (23 Services)

### 6.1 Cinema Management

#### Vista Entertainment (CRITICAL)
- **Purpose:** Core cinema management system — syncs all cinema data and handles booking lifecycle
- **Services:** Main, F&B, Offer
- **Protocol:** REST (OData + Ticketing + Loyalty + Booking APIs)
- **Auth:** API Token per platform (Android, iOS, Web, Huawei, Kiosk)
- **Env vars:** `VISTA_BASE_URL`, `VISTA_ANDROID_TOKEN`, `VISTA_IOS_TOKEN`, `VISTA_WEBSITE_TOKEN`, `VISTA_HUAWEI_TOKEN`, `VISTA_KIOSK_TOKEN`, `VISTA_CLUB_ID`
- **Endpoints:**
  | Method | Path | Purpose |
  |--------|------|---------|
  | GET | /OData.svc/Cinemas | Sync cinemas |
  | GET | /OData.svc/Films | Sync films |
  | GET | /OData.svc/Sessions | Sync sessions/showtimes |
  | GET | /OData.svc/FilmGenres | Sync genres |
  | GET | /OData.svc/Persons | Sync cast/crew |
  | GET | /OData.svc/Attributes | Sync experiences (IMAX, 4DX, etc.) |
  | POST | /orders/ | Create ticket order |
  | POST | /orders/{id}/sessions/{sid}/set-tickets/ | Select seats |
  | POST | /RESTTicketing.svc/order/payment | Submit payment to Vista |
  | POST | /RESTTicketing.svc/order/continue | Restart session |
  | POST | /RESTLoyalty.svc/member/validate | Validate loyalty member |
  | POST | /RESTBooking.svc/booking | Get booking details |
  | POST | /RESTBooking.svc/booking/search | Search bookings |
  | GET | /cinemas/{id}/sessions/{sid}/seat-plan | Get seat plan |
  | GET | /cinemas/{id}/sessions/{sid}/tickets | Get ticket types |
  | GET | /vouchers/{barcode} | Validate voucher (Go) |
  | SDK | orderService.refundBooking() | Refund booking |
  | SDK | orderService.completeOrder() | Complete order |
  | SDK | addConcessions() | Add F&B to order |
  | SDK | markCollected() | Mark F&B collected |
- **Files:**
  - `alpha-muvi-main-main/src/shared/service/vista/vista.service.ts`
  - `alpha-muvi-main-main/src/vista/services/` (6 sync services)
  - `alpha-muvi-fb-main/src/shared/service/vista.service.ts`
  - `alpha-muvi-offer/src/vista/vista.service.go`

### 6.2 Payment Gateways

#### HyperPay (CRITICAL)
- **Purpose:** Primary payment gateway — card tokenization, direct payments, Apple Pay, status checks, refunds
- **Services:** Payment
- **Protocol:** REST (HTTPS)
- **Auth:** Bearer Token
- **Env vars:** `HYPER_PAY_BASE_URL`, `HYPER_PAY_TOKEN`, `HYPER_PAY_ENTITY_ID`
- **Endpoints:** POST /checkouts, GET /checkouts/{id}/registration, POST /registrations/{id}/payments, GET /payments/{id}, POST /payments/{id} (refund), POST /payments (Apple Pay)
- **File:** `alpha-muvi-payment-main/src/shared/hyperPay/hyperPay.service.ts` (717 lines)

#### PayFort / Amazon Payment Services (CRITICAL)
- **Purpose:** Alternative payment gateway — card tokenization, purchases, status, refunds, Apple Pay with HMAC
- **Services:** Payment
- **Protocol:** REST (HTTPS + HMAC Signature)
- **Auth:** HMAC SHA signature
- **Env vars:** `PAYFORT_BASE_URL`, `PAYFORT_ACCESS_CODE`, `PAYFORT_MERCHANT_IDENTIFIER`, `PAYFORT_SHA_TYPE`, `PAYFORT_SHA_REQUEST_PHRASE`, `PAYFORT_SHA_RESPONSE_PHRASE`
- **Endpoints:** POST / (CREATE_TOKEN, UPDATE_TOKEN, CHECK_STATUS, PURCHASE, REFUND, APPLE_PAY)
- **File:** `alpha-muvi-payment-main/src/shared/payfort/payfort.service.ts` (410 lines)

#### Checkout.com + STC Pay (CRITICAL)
- **Purpose:** Payment gateway with STC Pay integration — card payments, Apple Pay, customer management, instrument management, STC Pay via payment contexts, webhook events
- **Services:** Payment
- **Protocol:** SDK (checkout-sdk-node v2.3.6)
- **Auth:** Secret Key + Primary Key
- **Env vars:** `CHECKOUT_SECRET_KEY`, `CHECKOUT_PRIMARY_KEY`, `CHECKOUT_SUCCESS_END_POINT`, `CHECKOUT_FAILED_END_POINT`
- **SDK calls:** `cko.tokens.request()`, `cko.payments.request()`, `cko.payments.get()`, `cko.payments.refund()`, `cko.customers.create/get/delete()`, `cko.instruments.create()`, `cko.paymentContexts.request()` (STC Pay), `cko.workflows.getEvent()`
- **File:** `alpha-muvi-payment-main/src/shared/checkout/checkout.service.ts` (510 lines)

#### Tabby — Buy Now Pay Later (CRITICAL)
- **Purpose:** BNPL provider — create payment sessions, capture payments, check status, refunds
- **Services:** Payment
- **Protocol:** REST (HTTPS)
- **Auth:** Bearer Token
- **Env vars:** `TABBY_BASE_URL`, `TABBY_API_KEY`, `TABBY_MERCHANT_CODE`, `TABBY_CALLBACK_END_POINT`
- **Endpoints:** POST /checkout, GET /payments/{id}, POST /payments/{id}/captures, POST /payments/{id}/refunds
- **File:** `alpha-muvi-payment-main/src/shared/tabby/tabby.service.ts` (182 lines)

#### NearPay — POS Terminal
- **Purpose:** In-cinema POS terminal payment — find terminals, generate JWT tokens for kiosk payment
- **Services:** Payment
- **Protocol:** REST (HTTPS)
- **Auth:** API Key + RS256 JWT
- **Env vars:** `NEARPAY_BASE_URL`, `NEARPAY_API_KEY`, `NEARPAY_PRIVATE_KEY`, `NEARPAY_CLIENT_UUID`
- **Endpoints:** GET /terminals/?tid={terminalId}
- **File:** `alpha-muvi-payment-main/src/shared/nearpay/nearpay.service.ts`

#### Apple Pay Session Validation (CRITICAL)
- **Purpose:** Validates Apple Pay merchant sessions with Apple servers using mutual TLS. Supports Checkout, PayFort, and HyperPay Apple Pay identifiers.
- **Services:** Payment
- **Protocol:** REST (mutual TLS)
- **Auth:** Client Certificate + Key
- **Env vars:** `APPLE_PAY_DOMAIN_NAME`, `APPLE_PAY_VALIDATE_SESSION_URL`
- **File:** `alpha-muvi-payment-main/src/shared/apple-pay-service/apple-pay.service.ts` (89 lines)

### 6.3 SMS / OTP

#### Unifonic (CRITICAL)
- **Purpose:** Primary SMS OTP provider — sends OTP codes for phone verification during login/registration
- **Services:** Identity
- **Protocol:** REST (HTTPS)
- **Auth:** Bearer Token
- **Env vars:** `UNIFONIC_URL`, `UNIFONIC_AUTH_TOKEN`, `UNIFONIC_APP_ID`, `UNIFONIC_CHANNEL`, `UNIFONIC_LENGTH`
- **Endpoints:** POST /verifications/start, POST /verifications/check
- **File:** `alpha-muvi-identity-main/src/shared/service/sms-gateways/unifonic.service.ts` (177 lines)

#### Taqnyat (CRITICAL)
- **Purpose:** Alternative SMS OTP provider — switchable with Unifonic via factory pattern. Sender: "muviCinemas"
- **Services:** Identity
- **Protocol:** REST (HTTPS)
- **Auth:** Bearer Token
- **Env vars:** `TAQNYAT_URL`, `TAQNYAT_API_KEY`, `TAQNYAT_ANDROID_AUTOFILL_HASH`
- **Endpoints:** POST /verify.php/ (send), POST /verify.php/ (verify with activeKey)
- **File:** `alpha-muvi-identity-main/src/shared/service/sms-gateways/taqnyat.service.ts` (217 lines)

### 6.4 Email

#### SendGrid (CRITICAL)
- **Purpose:** Transactional email — password reset, verification, booking confirmation, refund receipts, top-up receipts, survey emails, sync reports, bulk refund reports
- **Services:** Identity, Notification, Payment, F&B, Main
- **Protocol:** SDK (@sendgrid/mail)
- **Auth:** API Key
- **Env vars:** `SENDGRID_API_KEY` + 15+ template IDs per service
- **Files:**
  - `alpha-muvi-identity-main/src/shared/service/email/sendgrid-email.service.ts` (233 lines)
  - `alpha-muvi-notification-main/src/shared/email/sendgrid-email.service.ts`
  - `alpha-muvi-payment-main/src/shared/service/email/external-email.service.ts`
  - `alpha-muvi-fb-main/src/shared/service/email/sendgrid-email.service.ts`
  - `alpha-muvi-main-main/src/shared/service/email/sendgrid-email.service.ts`

### 6.5 Push Notifications

#### OneSignal (CRITICAL)
- **Purpose:** Push notification delivery to mobile apps (iOS, Android, Huawei)
- **Services:** Notification
- **Protocol:** SDK (onesignal-api-client-nest)
- **Auth:** API Key + App ID
- **Env vars:** `ONESIGNAL_API_KEY`, `ONESIGNAL_APP_ID`
- **File:** `alpha-muvi-notification-main/src/notification/notification-providers/one-signal-notification.provider.ts`

### 6.6 Customer Engagement

#### Braze
- **Purpose:** Customer engagement platform — sends targeted messages, tracks user profiles with segments (logged-in vs guest)
- **Services:** Identity, Notification
- **Protocol:** REST (HTTPS)
- **Auth:** API Key
- **Env vars:** `BRAZE_BASE_URL`, `BRAZE_API_KEY`, `BRAZE_LOGGED_IN_SEGMENT_ID`, `BRAZE_GUEST_SEGMENT_ID`
- **Endpoints:** POST /messages/send, POST /users/track
- **Files:** `alpha-muvi-identity-main/src/shared/braze/braze.service.ts`, `alpha-muvi-notification-main/src/shared/braze/braze.service.ts`

### 6.7 AWS Services

#### AWS S3 (CRITICAL)
- **Purpose:** Object storage for uploaded images, files, Apple Wallet .pkpass files, and generated ticket images
- **Services:** Main, Gateway, F&B
- **Env vars:** `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`
- **Files:** `alpha-muvi-main-main/src/shared/files/file.service.ts` (102 lines), `alpha-muvi-gateway-main/src/files/file.service.ts`, `alpha-muvi-fb-main/src/shared/files/files.service.ts`

#### AWS CloudFront (CRITICAL)
- **Purpose:** CDN for uploaded assets. S3 URLs rewritten to CloudFront domain.
- **Services:** Main, Gateway
- **Env vars:** `CLOUDFRONT_DOMAIN`

#### AWS SSM Parameter Store (CRITICAL)
- **Purpose:** Loads environment configuration from AWS Parameter Store at service startup
- **Services:** ALL 6 NestJS services
- **Protocol:** SDK (@aws-sdk/client-ssm)
- **Env vars:** `SSM_ACCESS_KEY_ID`, `SSM_SECRET_ACCESS_KEY`, `SSM_REGION`
- **SDK call:** `GetParametersByPathCommand({ Path: "/{env}/", WithDecryption: true, Recursive: true })`
- **File:** `src/shared/load-ssm-config.ts` (in each NestJS service)
- **Logic:** Skipped for `NODE_ENV=local`; paths like `/uat/REDIS_HOST` → key `REDIS_HOST`

#### AWS Lambda
- **Purpose:** Invokes Lambda function to export finance reports asynchronously
- **Services:** Payment
- **Env vars:** `EXPORT_FINANCE_REPORT_LAMBDA_FUNCTION_NAME`
- **File:** `alpha-muvi-payment-main/src/wallet-transaction/wallet-transaction.service.ts`

### 6.8 Tax Compliance

#### ZATCA — Saudi Tax Authority (CRITICAL)
- **Purpose:** Generates ZATCA-compliant QR codes for Saudi e-invoicing on movie tickets and F&B orders
- **Services:** Main, F&B
- **Protocol:** Library (@axenda/zatca)
- **Env vars:** `ZATCA_SELLER_NAME`
- **Files:** `alpha-muvi-main-main/src/orders/kiosk-order.service.ts`, `alpha-muvi-fb-main/src/shared/service/invoice.service.ts`

### 6.9 Location

#### Google Maps / Geocoding
- **Purpose:** Reverse geocoding — resolves city name from user GPS coordinates for cinema proximity
- **Services:** Main
- **Protocol:** SDK (node-geocoder)
- **Env vars:** `GOOGLE_API_KEY`
- **File:** `alpha-muvi-main-main/src/city/city.service.ts`

### 6.10 Student Verification

#### UniPal
- **Purpose:** Verifies student eligibility for discounted tickets and confirms discount transactions
- **Services:** Offer (Go)
- **Protocol:** REST (HTTPS)
- **Auth:** API Key Header
- **Env vars:** `UNIPAL_BASE_URL`, `UNIPAL_API_KEY`
- **Endpoints:** GET /business/check-eligibility?code=&phone=, POST /business/transactions/confirm
- **File:** `alpha-muvi-offer/src/unipal/unipal.service.go`

### 6.11 Digital Passes

#### Apple Wallet (PassKit)
- **Purpose:** Generates Apple Wallet .pkpass files for movie tickets, uploaded to S3
- **Services:** Main
- **Protocol:** Library (@walletpass/pass-js)
- **Auth:** Apple Certificates (WWDRCAG4 + signing cert)
- **Env vars:** `APPLE_WALLET_PASS_TYPE_IDENTIFIER`, `APPLE_WALLET_TEAM_IDENTIFIER`, `APPLE_WALLET_CER_FILE_NAME`
- **File:** `alpha-muvi-main-main/src/orders/order.service.ts` (~line 1480-1618)

### 6.12 Rendering

#### Puppeteer (Headless Chrome)
- **Purpose:** Renders HTML templates (EJS) to images for ticket generation, then uploads to S3
- **Services:** Main
- **File:** `alpha-muvi-main-main/src/shared/files/file.service.ts`

### 6.13 Observability (also in Section 14)

#### Sentry (CRITICAL)
- **Purpose:** Captures and reports runtime exceptions across all services for debugging
- **Services:** ALL 7 services
- **Protocol:** SDK (@sentry/node for NestJS, sentry-go for Offer)
- **Env vars:** `SENTRY_DSN`

#### Datadog (CRITICAL)
- **Purpose:** APM — distributed tracing, structured logging, metric collection
- **Services:** ALL 7 services
- **Protocol:** Agent (dd-trace for NestJS, dd-trace-go for Offer)
- **Env vars:** `DATADOG_API_KEY`, `DD_SITE`, `DD_SERVICE`, `DD_VERSION`, `DD_AGENT_HOST`, `DD_TRACE_AGENT_PORT`

### Integration Matrix — Which Service Uses What

| Service | Integrations |
|---------|-------------|
| **Gateway** | SSM, S3, CloudFront, Sentry, Datadog, Redis |
| **Identity** | SSM, Unifonic, Taqnyat, Braze, SendGrid, Sentry, Datadog, Redis |
| **Main** | SSM, Vista, S3, CloudFront, Google Maps, ZATCA, SendGrid, Apple Wallet, Puppeteer, Sentry, Datadog, Redis |
| **Payment** | SSM, HyperPay, PayFort, Checkout.com, Tabby, NearPay, Apple Pay, Lambda, SendGrid, Sentry, Datadog, Redis |
| **F&B** | SSM, Vista, S3, ZATCA, SendGrid, Sentry, Datadog, Redis |
| **Notification** | SSM, OneSignal, Braze, SendGrid, Sentry, Datadog, Redis |
| **Offer (Go)** | Vista, UniPal, Sentry, Datadog, Redis |

---

## 7. Scheduled Jobs & Cron (15 Jobs)

**Key architectural observation:** This backend uses **zero @nestjs/schedule decorators** (`@Cron`, `@Interval`, `@Timeout`). All recurring scheduling is handled **externally** via AWS EventBridge/CloudWatch calling `AWSAuthGuard`-protected HTTP endpoints on the Gateway.

### Vista Sync Jobs (6)

| Job | Endpoint | Service Route | Purpose |
|-----|----------|--------------|---------|
| Sync Cinemas | `POST cms/cinemas/cron-sync` | gateway → main | Fetches all cinema data from Vista OData API and upserts into local DB |
| Sync Films | `POST cms/films/cron-sync` | gateway → main | Fetches all film data from Vista OData API and upserts into local DB |
| Sync Sessions | `POST cms/film-sessions/cron-sync` | gateway → main | Syncs showtimes including availability, pricing, cinema assignments |
| Sync Genres | `POST cms/genres/cron-sync` | gateway → main | Fetches film genres from Vista and upserts locally |
| Sync People | `POST cms/people/cron-sync` | gateway → main | Syncs actors, directors, crew from Vista |
| Sync Concessions | `POST cms/concession-tabs/cron-sync` | gateway → fb | Syncs F&B tabs, items, modifiers, packages per-cinema (10s/5s delays) |

### Order Lifecycle Jobs (3)

| Job | Endpoint | Service Route | Purpose |
|-----|----------|--------------|---------|
| Cancel Expired Orders | `POST cms/orders/cron-cancel-expired` | gateway → main | Finds expired orders, cancels in Vista, marks EXPIRED, triggers payment cancellation |
| Cancel Expired Top-Ups | `POST cms/top-ups/cron-cancel-expired` | gateway → payment | Cancels pending wallet top-ups past their expireAt deadline |
| Process Expired Wallets | `POST cms/wallet-transactions/process-expired` | gateway → payment | Zeroes out expired wallet balances |

### Notification Jobs (4)

| Job | Endpoint | Service Route | Purpose |
|-----|----------|--------------|---------|
| Order Reminder | `POST cms/orders/cron-reminder-order` | gateway → main → notification | Push notifications for upcoming bookings |
| Survey Push | `POST cms/orders/cron-survey-notification` | gateway → main | Post-movie survey push notifications |
| Survey Email | `POST cms/orders/cron-survey-email` | gateway → main | Post-movie survey emails |
| Wallet Expiry Reminder | `POST cms/wallet-transactions/cron-reminder-expired` | gateway → payment | Reminders for wallet balances about to expire |

### Cleanup Jobs (2)

| Job | Endpoint | Service Route | Purpose |
|-----|----------|--------------|---------|
| Delete Old Notifications | `POST notifications/cron-delete-old-notifications` | gateway → notification | Deletes notifications older than NOTIFICATIONS_LIFESPAN_DAYS |
| Remove Expired Bookmarks | `POST cms/films/remove-expired-bookmark` | gateway → main | Removes bookmarks for films no longer showing |

All 15 jobs are protected by `AWSAuthGuard` — only AWS EventBridge/CloudWatch can trigger them.

---

## 8. Bull Queues & Async Processing (6 Queues)

All queues use Redis-backed Bull for async task processing.

| # | Queue Name | Service | Purpose | Processes | Trigger | Retry |
|---|-----------|---------|---------|-----------|---------|-------|
| 1 | `device-token-queue` | Identity | Batch-inserts push notification device tokens. Accumulates in-memory, flushes every 10s in batches of 300. | `add-device-token` | setInterval(10s) | N/A |
| 2 | `E_WALLET_QUEUE` | Payment | All wallet operations via 4 dedicated handlers. | `ADD_TOP_UP`, `REFUND`, `EARNED_BOOKING_CASHBACK`, `EARNED_CAMPAIGN_CASHBACK` | On-demand | Re-enqueue with 10 min delay |
| 3 | `refund-queue` | Payment | Checks payment status with gateway, cancels Vista order if needed, issues refund. Delay = expireAt minus now. | `refund` | On-demand (delayed) | Fixed backoff: 10 min |
| 4 | `webhook-queue` | Payment | Confirms booking after payment callback from gateways. Hardcoded 10s delay before processing. | `webhook` | On-demand (10s delay) | N/A |
| 5 | `generate-ticket-queue` | Payment → Main | **Cross-service:** Payment enqueues, Main service processes. Generates tickets after successful payment. Triggers manual refund after 3 failures. | `generate-ticket` | After payment success | 3 retries, exponential delay |
| 6 | `bulk-refund-queue` | Main | CMS-triggered bulk refund requests — cancels Vista orders and processes payment refunds for multiple bookings. | `bulk-refund` | CMS action | N/A |

Key files for each queue:
- Device Token: `alpha-muvi-identity-main/src/user/device-token/device-token.processor.ts` + `device-token.service.ts`
- E-Wallet: `alpha-muvi-payment-main/src/wallet-transaction/wallet-queue/wallet.processor.ts` + `wallet-queue.service.ts`
- Refund: `alpha-muvi-payment-main/src/payment/refund queue/refund.processor.ts` + `refund-queue.service.ts`
- Webhook: `alpha-muvi-payment-main/src/payment/webhook queue/webhook.processor.ts` + `webhook-queue.service.ts`
- Generate Ticket: `alpha-muvi-payment-main/src/payment/generate ticket queue/generate-ticket-queue.service.ts` + `alpha-muvi-main-main/src/orders/generate ticket queue/generate-ticket.processor.ts`
- Bulk Refund: `alpha-muvi-main-main/src/refund-payment-requests/bulk-refund-queue/bulk-refund-queue.processor.ts` + `bulk-refund-queue.service.ts`

---

## 9. CLI Sync Jobs (2 Jobs)

Standalone CLI commands using `nest-commander`. Run as containerized jobs (Docker, K8s CronJob, ECS Task) for full Vista data sync.

| Job | Service | Command | Options | Entry Point | Command File |
|-----|---------|---------|---------|-------------|-------------|
| Vista Sync (Main) | Main | `vista-sync` | `-a` (all), `-c` (cinemas), `-f` (films), `-g` (genres), `-s` (sessions), `-p` (people) | `alpha-muvi-main-main/src/main-cli.ts` | `alpha-muvi-main-main/src/sync-job/sync-job.command.ts` |
| Vista Sync (F&B) | F&B | `vista-sync` | N/A | `alpha-muvi-fb-main/src/main-cli.ts` | `alpha-muvi-fb-main/src/sync-job/sync-job.command.ts` |

Run command: `nest build && node -r dotenv/config ./dist/src/main-cli.js vista-sync -a`

---

## 10. API Surface (481 Endpoints)

### Endpoint Distribution

| Category | Count | Description |
|----------|-------|-------------|
| Public (Web & Mobile) | 166 | Customer-facing endpoints across 37 resource groups |
| CMS (Admin) | 294 | Admin panel endpoints |
| Kiosk | 21 | In-cinema kiosk endpoints (fb: 8, kiosk: 4, kiosks: 9) |
| **Total** | **481** | Across 155 extracted DTOs, 354 requiring authentication |

### Public Endpoints Breakdown (Top Groups)

| Group | Count | Examples |
|-------|-------|---------|
| auth | 31 | send-otp, verify-otp, login, me, profile, check-version |
| orders | 17 | create, confirm, cancel, get booking, list |
| films | 10 | list, detail, now-showing, coming-soon |
| cards | 10 | add, delete, list saved cards |
| film-finder | 9 | search by date, cinema, experience |
| guest-users | 9 | guest login, guest booking |
| notifications | 7 | list, mark-read, settings |
| offers | 7 | list, detail, apply |
| showtimes | 5 | by film, by cinema, by date |
| e-wallet | 4 | balance, transactions |
| experiences | 4 | IMAX, 4DX, VIP list |

### CMS Endpoints — Story Flow (24 Chapters)

**Part I — CMS (~130 endpoints):**
1. Authentication & Profile (7) — login, me, forget-password, check-token, reset-password, change-password, update-profile
2. Dashboard, Settings & Global Config (4) — dashboard stats, app settings, maintenance mode
3. Movies, Genres, Ratings & Casting (28) — CRUD for films, genres, ratings, cast/crew
4. Cinemas, Cities & Experiences (22) — CRUD for cinemas, cities, experiences
5. Showtimes & Sessions (2) — session listing, sync status
6. Banners, Offers & Offer Rules (16) — CRUD for banners, offers, offer rules
7. Users, Roles & Permissions (10) — CMS user management, role-based access
8. Customers, Orders & Refunds (10) — customer lookup, order management, refund processing
9. Food & Beverages, Bank Accounts (9) — menu management, bank account CRUD
10. Notifications & Push Templates (8) — push notification templates, send notifications
11. SEO, Dynamic Pages, Onboarding (12) — SEO metadata, dynamic page content
12. Logs, Files, Kiosks & Misc (14) — file uploads, kiosk management, audit logs

**Part II — Website (~142 endpoints):**
13. Website Boots: Settings, Cities, Banners (6)
14. Sign Up, Login & OTP (22)
15. Browsing Movies (12)
16. Movie Finder & Search (11)
17. Cinemas & Experiences (6)
18. Booking a Ticket (14)
19. Payment & Credit Cards (12)
20. My Bookings & Cancellations (10)
21. Wallet & Top-ups (8)
22. Cashback (4)
23. Offers & Vouchers (10)
24. Profile, Notifications & Everything Else (27)

### Documentation Generation Scripts
- `node documentation/generate-api-docs.js` → generates `api.html` (full interactive reference with "Try it" buttons)
- `node documentation/generate-api-storybook.js` → generates `api-storybook.html` (narrative walkthrough)

---

## 11. Database Architecture

### Per-Service Database Model
Each microservice owns its own PostgreSQL database — no cross-service DB access.

| Database | Service | ORM | Key Entities | Storage (UAT) |
|----------|---------|-----|-------------|---------------|
| `identity_db` | Identity | Sequelize | User, UserRole, Permission, GuestUser, Settings, Avatar, OTP, CommunicationLanguage (19 models) | 200 GB |
| `main_db` | Main | Sequelize | Film, Cinema, Session, Booking, Order, Seat, Genre, Person, Banner, Offer, City, Experience | **2,000 GB** (likely test data buildup) |
| `payment_db` | Payment | Sequelize | Payment, Refund, Card, Wallet, WalletTransaction, TopUp | 200 GB |
| `fb_db` | F&B | Sequelize | ConcessionTab, ConcessionItem, Modifier, Package, KioskOrder, Menu | 200 GB |
| `notification_db` | Notification | Sequelize | Notification, PushTemplate, DeviceToken | 200 GB |
| `offer_db` | Offer | GORM (Go) | Offer, OfferRule, OfferLog, Voucher | 20 GB |

### Database Design Patterns
- **ULID primary keys** — migrated from auto-increment IDs (migration `20240227065056-add_ulid_column_to_all_tables.js`)
- **Sequelize ORM** for all NestJS services; **GORM** for Go Offer service
- **Read/Write split** — services configured with `DB_READ_HOST` and `DB_WRITE_HOST` (GORM `dbresolver` plugin in Offer)
- **No FK constraints across services** — intentionally avoided to prevent replication lag errors
- **City data replication** — Identity service replicates city data from Main to avoid cross-service calls
- **CRUD operations** via `@nestjsx/crud` + custom fork `alpha-nestjsx-crud` for automated CRUD endpoints

### Database Instances (Frankfurt UAT)

| Database | Instance | Storage | Type | Monthly Cost |
|----------|----------|---------|------|-------------|
| muvi-uat-main | db.t3.medium (2 vCPU, 4GB) | **2,000 GB** gp2 | Single-AZ | **$261** |
| muvi-uat-identity | db.t3.medium | 200 GB gp2 | Single-AZ | $56 |
| muvi-uat-payment | db.t3.medium | 200 GB gp2 | Single-AZ | $56 |
| muvi-uat-notification | db.t3.medium | 200 GB gp2 | Single-AZ | $56 |
| muvi-uat-fb | db.t3.medium | 200 GB gp3 | Single-AZ | $56 |
| muvi-uat-offer | db.t3.small (2 vCPU, 2GB) | 20 GB gp3 | Single-AZ | $18 |
| temp | db.t3.micro (2 vCPU, 1GB) | 200 GB gp2 | Single-AZ | $30 |
| **Total** | | **3,020 GB** | | **~$533/mo** |

Note: Main DB has **2 TB** in UAT — massive, likely years of test data or production data copy. Cleanup could save ~$200/mo.

---

## 12. Redis Architecture

### Redis Usage Across All Services

**All microservices use Redis** — not just Gateway.

| Service | File | Purpose | Redis DB |
|---------|------|---------|----------|
| Gateway | `redis-caching.service.ts` | Rate limiting + Response caching + System status flags | DB 1 (DEFAULT), DB 2 (SYSTEM_STATUS) |
| Main | `redis-caching.service.ts` | Cache films, cinemas, sessions | DB 1 |
| Payment | `redis-caching.service.ts` + `redis-pubsub.service.ts` | Caching + Pub/Sub messaging | DB 1 |
| Identity | `redis-caching.service.ts` | Cache user sessions, tokens | DB 1 |
| F&B | `redis-caching.service.ts` | Cache food menu, orders | DB 1 |
| Offer (Go) | `redis/init.go`, `redis/service.go` | Cache offer rules | — |

### Redis in Gateway — Key Patterns
```
Rate Limit:    "AuthController-sendOtp-192.168.1.1" → { count: 45, expiresAt: ... }
Cache:         "films:list:page1" → JSON (TTL-based)
System Status: "maintenance_mode" → true/false (DB 2)
Feature Flags: "feature:cashback" → enabled/disabled (DB 2)
```

### Bull Queue Redis
All 6 Bull queues use Redis as their backing store. Queue data includes job payloads, retry state, and delayed job schedules.

### Frankfurt UAT Redis Clusters (4)

| Cluster | Size | Purpose | Monthly |
|---------|------|---------|---------|
| ccds-redis-uat | cache.t3.medium (3GB) | CCDS/Vista data sync cache | $48 |
| shared-redis | cache.t3.medium (3GB) | Session cache, Bull queues | $48 |
| muvi-uat | cache.t3.small (1.5GB) | General app cache | $25 |
| fb-redis | cache.t3.small (1.5GB) | F&B specific cache | $25 |
| **Total** | | | **~$146/mo** |

### UAE UAT Redis (1 cluster)
- `muvi-uat-redis-uae-classic`, cache.t3.small — **$27/mo** (sufficient for UAT, saves ~$75/mo vs Frankfurt)

---

## 13. Security & Auth Model

### Authentication Flow

```
1. User sends POST /api/v1/auth/send-otp { phoneNumber: "+971..." }
2. Gateway → Identity (gRPC) → Unifonic/Taqnyat SMS provider → OTP sent
3. User sends POST /api/v1/auth/verify-otp { phoneNumber, code }
4. Identity validates OTP → generates JWT + refresh token → returns tokens
5. All subsequent requests include: Authorization: Bearer <JWT>
6. AuthGuard validates token on every protected route
```

### AuthGuard Logic (Gateway)
File: `alpha-muvi-gateway-main/src/guard/auth.guard.ts`

1. Check Authorization header exists
2. Check "Bearer <token>" format
3. Validate token with Identity service via `SharedService.validateToken(token)`
4. Attach user to request (`req.user`)
5. Check user is ACTIVE (not suspended/deleted)
6. Check user has required permissions (if `@Roles()` decorator is present on route)
7. Return true or throw UnauthorizedException/ForbiddenException

### CMS Auth
- CMS uses email + password (not OTP)
- Route: `POST /api/v1/cms/auth/login`
- Returns JWT, refresh token, user object, full permissions list
- Token stored in `localStorage` via Zustand, set as default Axios header

### Rate Limiting
File: `alpha-muvi-gateway-main/src/guard/throttler-behind-proxy-guard.ts`

| Endpoint Type | Limit | Window | Key |
|---------------|-------|--------|-----|
| Default | 100 requests | 60 seconds | IP + Controller + Handler |
| Order endpoints | 5 requests | 60 seconds | IP + Controller + Handler |
| Kiosk platform | UNLIMITED | — | `x-platform: kiosk` bypasses throttler |

When rate limit exceeded:
- Reports to Sentry: `Sentry.captureException("throttling " + request.originalUrl)`
- Returns HTTP 429 with `{ message: "too many requests" }`

### Real IP Detection
Behind ALB, real IP extracted from `x-forwarded-for` header (first entry).

### Global Guards
- `CheckIsUnderMaintenanceGuard` — checks Redis system status; blocks all requests during maintenance
- `AWSAuthGuard` — protects cron endpoints; only allows AWS EventBridge/CloudWatch triggers

---

## 14. Observability (Datadog, Sentry, Winston)

### Datadog APM

File: `src/tracer.ts` (in each service)
```typescript
import tracer from "dd-trace";
tracer.init({ env: process.env.NODE_ENV, logInjection: true });
```
- **MUST be first import** in main.ts — instruments all modules
- Distributed tracing across all microservices
- Trace IDs injected into all log entries
- Agent host configured via `DD_AGENT_HOST`, `DD_TRACE_AGENT_PORT`

### Datadog Winston Logger

```typescript
// Custom HTTP transport → Datadog logs intake
new CustomHttpWinstonTransport({
  host: config.DATADOG_HOST,           // http-intake.logs.datadoghq.com
  path: "/api/v2/logs",
  headers: { "DD-API-KEY": config.DATADOG_API_KEY },
  batch: true,
  batchCount: 100,
});
```

Env vars: `DATADOG_API_KEY`, `DD_SITE`, `DD_SERVICE`, `DD_VERSION`, `DD_AGENT_HOST`, `DD_TRACE_AGENT_PORT`

### Sentry Error Tracking

```typescript
if (NODE_ENV === EnvironmentEnum.PRODUCTION) {
  Sentry.init({ dsn: appConfig().SENTRY_DSN, tracesSampleRate: 1.0 });
}
```

- AllExceptionsFilter catches all errors; only reports 500s to Sentry
- Tags each error with `{ service: "gateway", api: request.originalUrl }`
- Rate limit violations also reported to Sentry
- Go Offer service uses `sentry-go` SDK

### Logging Architecture

| Transport | Purpose | Destination |
|-----------|---------|-------------|
| Datadog Winston | Structured JSON logs | Datadog Cloud |
| Console | Local dev debugging | stdout |
| Sentry | 500 errors only | Sentry Cloud |

### Current Status
- Frankfurt: Datadog fully deployed (8 services, ~$200-400/mo UAT, ~$500-800/mo prod)
- UAE: **No Datadog configured** — observability gap

---

## 15. AWS Infrastructure — Production (Account 2: 011566070219)

**Region:** eu-central-1 (Frankfurt) | **Account:** 011566070219 | **Profile:** `muvi-prod` | **Access:** READ-ONLY

> ⚠️ This is the LIVE PRODUCTION account. Contains ONLY production. NO UAT exists here. Total monthly spend: **~$27,873**.

### ECS Fargate — Cluster: `Muvi-Production` (9 services, 39 tasks, 66 vCPU baseline)

| Service | CPU | Memory | Desired | Min | Max | Datadog Sidecar | Monthly |
|---------|-----|--------|---------|-----|-----|----------------|---------|
| muvi-gateway-prod | 4 vCPU | 8 GB | 4 | 4 | 20 | ✓ | $450 |
| muvi-main-prod | 4 vCPU | 8 GB | 4 | 4 | 20 | ✓ | $450 |
| muvi-identity-prod | 2 vCPU | 4 GB | 4 | 4 | 20 | ✓ | $225 |
| muvi-payment-prod | 2 vCPU | 4 GB | 4 | 4 | 10 | ✓ | $225 |
| muvi-notification-prod | 2 vCPU | 4 GB | 4 | 4 | 10 | ✓ | $225 |
| muvi-fb-prod | 2 vCPU | 4 GB | 4 | 4 | 10 | ✓ | $225 |
| muvi-offer-prod | 2 vCPU | 4 GB | 4 | 4 | 10 | ✓ | $225 |
| muvi-ticket-prod | 4 vCPU | 8 GB | 4 | 4 | 20 | ✓ | $450 |
| muvi-website-prod | 2 vCPU | 4 GB | 4 | 4 | 10 | ✓ | $225 |
| **Total** | **24 vCPU** | **48 GB** | **36** | **36** | — | | **~$2,700** |

> Note: `muvi-ticket-prod` is a clone/fork of Main — handles ticket generation separately for performance isolation.

### Aurora PostgreSQL (7 clusters with RDS Proxies)

| Cluster | Writer | Reader(s) | Instance Class | Storage | Proxy | Monthly |
|---------|--------|-----------|---------------|---------|-------|---------|
| muvi-prod-main | 1 | 1 | db.r5.2xlarge | ~103 GB orders table alone | muvi-prod-main-proxy | $2,800 |
| muvi-prod-identity | 1 | 1 | db.r5.xlarge | — | muvi-prod-identity-proxy | $1,400 |
| muvi-prod-payment | 1 | 1 | db.r5.xlarge | — | muvi-prod-payment-proxy | $1,400 |
| muvi-prod-fb | 1 | 1 | db.r5.large | — | muvi-prod-fb-proxy | $700 |
| muvi-prod-notification | 1 | 1 | db.r5.large | — | muvi-prod-notification-proxy | $700 |
| muvi-prod-offer | 1 | 0 | db.r5.large | — | muvi-prod-offer-proxy | $350 |
| muvi-prod-ticket | 1 | 0 | db.r5.large | — | — | $350 |
| **Total** | | | | | 6 proxies | **~$7,700** |

> `public.orders` table in main DB = **103 GB** — 96% of the main database. Needs archival strategy.

### ElastiCache Redis (9 clusters)

| Cluster | Purpose | Node Type | Nodes | Monthly |
|---------|---------|-----------|-------|---------|
| muvi-redis-prod (main) | Session, rate-limit, cache | cache.r5.large | 2 (primary+replica) | $450 |
| muvi-redis-prod-identity | Identity sessions | cache.r5.large | 2 | $450 |
| muvi-redis-prod-payment | Payment state | cache.r5.large | 2 | $450 |
| muvi-redis-prod-notification | Push queues | cache.r5.large | 2 | $450 |
| muvi-redis-prod-fb | F&B cache | cache.r5.large | 2 | $450 |
| muvi-redis-prod-offer | Voucher cache | cache.r5.large | 2 | $450 |
| muvi-redis-prod-gateway | Gateway cache | cache.r5.large | 2 | $450 |
| muvi-redis-prod-ticket | Ticket generation | cache.r5.large | 2 | $450 |
| muvi-redis-prod-bull | Bull queues | cache.r5.large | 2 | $450 |
| **Total** | | | **18** | **~$4,050** |

### Networking

| Resource | Details | Monthly |
|----------|---------|---------|
| ALB × 3 | Muvi-Production (internet-facing), Muvi-Internal-Production, Muvi-Website-Production | ~$54 |
| NAT Gateway × 3 | 3 AZs for HA | ~$135 |
| VPC | 10.0.0.0/16 | — |
| CloudFront × 9 | API, website, CMS, media, FB media, etc. | ~$200+ |
| WAF × 2 | Muvi-Production-WAF (Managed rules + rate limiting), Muvi-Website-WAF | ~$50 |
| Route 53 | muvicinemas.com zone | ~$2 |

### Other Resources

| Resource | Count | Details | Monthly |
|----------|-------|---------|---------|
| S3 Buckets | 38 | Media, CMS, e-wallet reports, CI artifacts, logs | ~$200 |
| Lambda Functions | 32 | Datadog forwarder, cache invalidation, ZATCA, analytics, sync, RDS mgmt | ~$50 |
| Secrets Manager | ~20 | Payment certs, DB creds, API keys | ~$8 |
| SSM Parameters | 51 | All under `/production/*` prefix | ~$0 |
| EC2 Instances | 5 | 1 running (jump box t3.small), 4 stopped | ~$15 |
| CodePipeline | 18 | Auto-deploy on `uat`/`prod` branch push | ~$18 |
| Savings Plans | 1 | Compute Savings Plan — significant discount active | -$3,000+ |

### Production Cost Summary

| Category | Monthly |
|----------|---------|
| ECS Fargate | $2,700 |
| Aurora PostgreSQL (7 clusters + proxies) | $7,700 |
| ElastiCache Redis (9 clusters, 18 nodes) | $4,050 |
| Savings Plans (discount) | -$3,000 |
| Networking (ALB, NAT, VPC) | $240 |
| CloudFront + WAF | $250 |
| S3 + Lambda + misc | $300 |
| Data Transfer | $500+ |
| Datadog (external) | $500-800 |
| **TOTAL** | **~$27,873/month** |

---

## 16. AWS Infrastructure — UAE UAT (Account 1: 739991759290)

**Account:** 739991759290 | **Profile:** `default` | **User:** rehan.tariq@muvicinemas.com
**Resources span THREE regions:** me-central-1 (UAE), eu-central-1 (Frankfurt), me-south-1 (Bahrain)

> ⚠️ **CROSS-REGION ARCHITECTURE:** ECS runs in me-central-1, but databases are in eu-central-1. This adds ~100-150ms latency per DB query. Connected via intra-account VPC peering.

### ECS Fargate — Cluster: `Muvi-Cluster` (me-central-1) — 6 services, 11 tasks

| Service | CPU | Memory | Desired | Image Tag | Cloud Map | Monthly |
|---------|-----|--------|---------|-----------|-----------|---------|
| muvi-gateway-service-mfnabtxa | 0.5 vCPU | 1 GB | 2 | muvi-gateway-uat:uat-20251206 | gateway.uat.internal | $35 |
| muvi-identity-uat | 0.5 vCPU | 1 GB | 2 | muvi-identity-uat:uat-20251212 | identity.uat.internal | $35 |
| muvi-main-uat | 0.5 vCPU | 1 GB | 2 | muvi-main-uat:uat-20251230-063019-banner-opt | main.uat.internal | $35 |
| muvi-payment-uat | 0.5 vCPU | 1 GB | 2 | muvi-payment-uat:uat-20260116-v2 | payment.uat.internal | $35 |
| muvi-notification-uat | 0.5 vCPU | 1 GB | 2 | muvi-notification-uat:uat-20251220 | notification.uat.internal | $35 |
| muvi-website-uat | 0.5 vCPU | 1 GB | 1 | muvi-website-uat:uat-20260211-aasa | — | $17 |
| **Total** | | | **11** | | | **~$192** |

> Missing from UAT: **F&B** and **Offer** services (no ECR repos, no ECS services, no Cloud Map entries).

### Other ECS Clusters (me-central-1) — Non-UAT

| Cluster | Services | Purpose | Status |
|---------|----------|---------|--------|
| agha-service-cluster | 2 services | Test/experiment | Unknown |
| sample-film-session-cluster | — | Film session test | Unknown |

### RDS PostgreSQL — Running in eu-central-1 (Frankfurt) ⚠️ CROSS-REGION

| Database | Instance Class | Engine | Endpoint | Monthly |
|----------|---------------|--------|----------|---------|
| muvi-uat-main | db.t3.medium | PostgreSQL 15 | muvi-uat-main.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | $56 |
| muvi-uat-identity | db.t3.medium | PostgreSQL 15 | muvi-uat-identity.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | $56 |
| muvi-uat-payment | db.t3.medium | PostgreSQL 15 | muvi-uat-payment.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | $56 |
| muvi-uat-fb | db.t3.medium | PostgreSQL 15 | muvi-uat-fb.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | $56 |
| muvi-uat-notification | db.t3.medium | PostgreSQL 15 | muvi-uat-notification.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | $56 |
| muvi-uat-offer | db.t3.small | PostgreSQL 15 | muvi-uat-offer.c5xohmlnlthz.eu-central-1.rds.amazonaws.com | $28 |
| temp | db.t3.micro | PostgreSQL | — | $18 |
| **Total (Frankfurt)** | | | | **~$326** |

### RDS PostgreSQL — Stopped in me-central-1 (UAE)

| Database | Instance Class | Storage | Status |
|----------|---------------|---------|--------|
| temp-muvi-uat-main | db.t3.micro | 2,000 GB gp2 | **Stopped** |
| temp-muvi-uat-fb | db.t3.medium | 200 GB gp3 | **Stopped** |
| temp-muvi-uat-idetity (**typo!**) | db.t3.micro | 200 GB gp2 | **Stopped** |
| temp-muvi-uat-payment | db.t3.micro | 200 GB gp2 | **Stopped** |
| temp-muvi-uat-notification | db.t3.micro | 200 GB gp2 | **Stopped** |
| temp-muvi-uat-offer | db.t3.micro | 20 GB gp2 | **Stopped** |

> These are old copies. Storage-only cost ~$5/mo total. Can be deleted.

### Aurora Cluster — Running in me-central-1

| Cluster | Instances | Class | Status | Monthly |
|---------|-----------|-------|--------|---------|
| uatclusterdb | 2 (writer + replica) | db.t3.medium | Available | ~$110 |

> This Aurora cluster is NOT used by any UAT ECS service. Purpose unclear. Candidate for deletion.

### ElastiCache Redis — me-central-1

| Cluster | Node Type | Status | Endpoint | Monthly |
|---------|-----------|--------|----------|---------|
| muvi-uat-redis-uae-classic-001 | cache.t3.small | Available | muvi-uat-redis-uae-classic.c6kxj3.ng.0001.mec1.cache.amazonaws.com | $35 |

### Load Balancers — me-central-1

| Name | Scheme | VPC | DNS | Monthly |
|------|--------|-----|-----|---------|
| Muvi-UAT | internet-facing | vpc-0ab936370488229bd | Muvi-UAT-1566457059.me-central-1.elb.amazonaws.com | $18 |
| agha-loadbalancer | internet-facing | vpc-0d1b744f68bdf4ac5 | — | $18 |
| sample-film-session-alb | internet-facing | vpc-0ab936370488229bd | — | $18 |
| sample-film-session-alb-v2 | internet-facing | vpc-0ab936370488229bd | — | $18 |
| **Total** | | | | **~$72** |

> 3 non-UAT ALBs (agha, sample-film ×2) should be evaluated for deletion — saving $54/mo.

### ALB Routing — Muvi-UAT

| Listener | Priority | Condition | Forward To |
|----------|----------|-----------|-----------|
| HTTP:80 | 6 | Path: `/api/*` | muvi-gateway-tg (port 3001) |
| HTTP:80 | Default | All other | muvi-website-tg (port 3000) |

### ECR Repositories — me-central-1

| Repository | Latest Tag | Size |
|------------|-----------|------|
| muvi-gateway-uat | uat-20251206 | — |
| muvi-identity-uat | uat-20251212 | — |
| muvi-main-uat | uat-20251230-063019-banner-opt | — |
| muvi-payment-uat | uat-20260116-v2 | — |
| muvi-notification-uat | uat-20251220 | — |
| muvi-website-uat | uat-20260211-aasa | — |
| sample-film-session-service | — | Test |
| agha-test-a-ecr | — | Test |

### Cloud Map — Service Discovery (me-central-1)

| Namespace | Type | VPC |
|-----------|------|-----|
| uat.internal | DNS_PRIVATE | vpc-0ab936370488229bd |

| Service Name | DNS | Instances |
|-------------|-----|-----------|
| gateway | gateway.uat.internal | 2 (Fargate tasks) |
| identity | identity.uat.internal | 2 |
| main | main.uat.internal | 2 |
| payment | payment.uat.internal | 2 |
| notification | notification.uat.internal | 2 |

> Missing: `fb.uat.internal` and `offer.uat.internal` (services not deployed).

### CloudFront Distributions — Account 1 (12 total)

| Domain | Origin | Purpose |
|--------|--------|---------|
| d1z1b9837vijr4.cloudfront.net | Muvi-UAT ALB (me-central-1) | Website CDN |
| d3ui39dhvshx4d.cloudfront.net | muvi-media-uat.s3.eu-central-1 | Media assets CDN |
| d3bsf99ikbyzz1.cloudfront.net | muvi-cms-uat.s3-website.eu-central-1 | CMS CDN |
| d19rfpryhc0lp5.cloudfront.net | muvi-uat ALB (eu-central-1) | API via Frankfurt |
| d2ap4qa8w7o4kl.cloudfront.net | muvi-cms-uat-2.s3 | CMS v2 CDN |
| + 7 others | Various | Dev, e-wallet, CDP |

### S3 Buckets — Account 1 (55 total, key ones)

| Bucket | Region | Purpose |
|--------|--------|---------|
| muvi-media-uat | eu-central-1 | Film posters, cinema images |
| muvi-cms-uat | eu-central-1 | CMS static website |
| muvi-cms-uat-2 | me-central-1 | CMS v2 static website |
| muvi-website-uat | me-central-1 | Website build artifacts |
| muvi-fb-uat | eu-central-1 | F&B media |
| muvi-uat-ewallet-reports | me-central-1 | E-wallet transaction exports |
| braze-cdi-uat | me-central-1 | Braze customer data |
| muvi-cdp-uat-events | me-central-1 | CDP analytics events |
| muvi-*-gitlab (×20+) | Various | GitLab CI/CD artifacts (old) |

### Lambda Functions — me-south-1 (Bahrain)

| Function | Purpose | Triggered By |
|----------|---------|-------------|
| email-provider | Email sending service | API Gateway |
| + API Gateway | HTTP endpoint for email | Various services |

### UAT Current Monthly Cost Summary

| Category | Monthly |
|----------|---------|
| ECS Fargate (6 services, 11 tasks) | $192 |
| RDS Frankfurt (7 running) | $326 |
| Aurora Cluster me-central-1 | $110 |
| ElastiCache Redis | $35 |
| ALB (4 total) | $72 |
| NAT Gateways | $45+ |
| CloudFront (12) | $12 |
| S3 (55 buckets) | $5 |
| Stopped RDS storage | $5 |
| **TOTAL** | **~$689–800/month** |
| **After cleanup** | **~$285/month** |

---

## 17. Infrastructure Gap Analysis (Production vs UAE UAT)

**Overall status: ~55% complete** (as of February 23, 2026)
**Comparison: Production (Account 2: 011566070219) vs UAE UAT (Account 1: 739991759290)**

### Score Cards

| Status | Count |
|--------|-------|
| ✓ Components Matched | **8** |
| ◉ Acceptable Differences | **5** |
| ⚠ Partially Done | **4** |
| ✗ Missing / Mandatory | **8** |

### ECS Services Gap (Prod: 9 services/39 tasks vs UAT: 6 services/11 tasks)

| Service | Production | UAE UAT | Status |
|---------|-----------|---------|--------|
| Gateway | 8 tasks (2 vCPU/4 GB) | 2 tasks (0.5 vCPU/1 GB) | ✓ Scaled down |
| Main | 6 tasks (2 vCPU/8 GB) | 2 tasks (0.5 vCPU/1 GB) | ✓ Scaled down |
| Identity | 3 tasks (1 vCPU/2 GB) | 2 tasks (0.5 vCPU/1 GB) | ✓ Scaled down |
| Payment | 3 tasks (1 vCPU/4 GB) | 2 tasks (0.5 vCPU/1 GB) | ✓ Scaled down |
| F&B | 5 tasks (2 vCPU/4 GB) | **MISSING** | ✗ Mandatory |
| Notification | 2 tasks (1 vCPU/2 GB) | 2 tasks (0.5 vCPU/1 GB) | ✓ Scaled down |
| Offer (Go) | 2 tasks (0.5 vCPU/1 GB) | **MISSING** | ✗ Mandatory |
| Website | 8 tasks (1 vCPU/2 GB) | 1 task (0.5 vCPU/1 GB) | ✓ Scaled down |
| CMS | 2 tasks | **MISSING** | ✗ (S3 static OK) |

### Database Gap (Prod: 7 Aurora clusters vs UAT: 7 RDS instances)

| Database | Production | UAE UAT | Status |
|----------|-----------|---------|--------|
| Main DB | Aurora r6g.xlarge (2-node) | db.t3.medium (Frankfurt!) | ◉ Acceptable |
| Identity DB | Aurora r6g.large (3-node) | db.t3.medium (Frankfurt!) | ◉ Acceptable |
| Payment DB | Aurora r6g.large (2-node) | db.t3.medium (Frankfurt!) | ◉ Acceptable |
| F&B DB | Aurora r6g.large (2-node) | db.t3.medium (Frankfurt!) | ⚠ No F&B service |
| Notification DB | Aurora r6g.large (2-node) | db.t3.medium (Frankfurt!) | ◉ Acceptable |
| Offer DB | Aurora r6g.large (2-node) | db.t3.small (Frankfurt!) | ◉ Acceptable |
| Temp DB | — | db.t3.micro (Frankfurt) | Delete candidate |
| Aurora me-central-1 | — | 2-node uatclusterdb | ??? Purpose unknown |

> ⚠️ **Cross-region problem**: All UAT databases are in eu-central-1 but ECS is in me-central-1. This adds ~100-150ms per DB round trip. Production has everything co-located in eu-central-1.

### Redis Gap (Prod: 9 clusters/18 nodes vs UAT: 1 node)

| Redis | Production | UAE UAT | Status |
|-------|-----------|---------|--------|
| Shared Redis | 2× r6g.large (cluster mode) | 1× cache.t3.small | ◉ Acceptable |
| Per-service Redis | 7 more clusters | **MISSING** | ✓ Single Redis OK for UAT |

### Load Balancers Gap (Prod: 3 ALBs vs UAT: 4 ALBs but 3 are waste)

| LB | Production | UAE UAT | Status |
|----|-----------|---------|--------|
| Public ALB | Muvi-Production-ALB (internet-facing) | Muvi-UAT (internet-facing) | ✓ |
| Internal ALB | Muvi-Production-Internal-ALB | **MISSING** | ✗ Mandatory (gRPC) |
| Website ALB | Muvi-Production-Website-ALB | Shared with Muvi-UAT (path routing) | ◉ |
| agha-loadbalancer | — | Exists ($18/mo) | ✗ Delete |
| sample-film-session-alb ×2 | — | Exists ($36/mo) | ✗ Delete |

### CloudFront & WAF Gap (Prod: 9 CFs + 2 WAFs vs UAT: 12 CFs + 0 WAFs)

| Component | Production | UAE UAT | Status |
|-----------|-----------|---------|--------|
| API CloudFront | api.muvicinemas.com → Internal ALB | d19rfpryhc0lp5.cloudfront.net → Frankfurt ALB | ⚠ Points to old Frankfurt |
| Website CloudFront | app.muvicinemas.com → Website ALB | d1z1b9837vijr4.cloudfront.net → Muvi-UAT ALB | ✓ Working |
| CMS CloudFront | cms.muvicinemas.com → S3 | d3bsf99ikbyzz1.cloudfront.net → S3 | ✓ Working |
| Media CloudFront | media.muvicinemas.com → S3 | d3ui39dhvshx4d.cloudfront.net → S3 | ✓ Working |
| WAF (API) | Production-API-WAF | **MISSING** | ✗ Add for load testing |
| WAF (Website) | Production-Website-WAF | **MISSING** | ✗ Add for security |

### CI/CD Gap
- Production: **18 CodePipeline pipelines** (GitHub → CodeBuild → ECR → ECS)
- UAE UAT: **0 pipelines** — all deploys are manual (15-30 min/service)
- **Priority:** HIGH — manual deploys block development velocity

### Missing Services Priority

| Service | Priority | Effort | Reason |
|---------|----------|--------|--------|
| F&B | **Critical** | 1 day | Concessions revenue, kiosk flow |
| Offer | **Critical** | 1 day | Promotions, vouchers, student discounts |
| Internal ALB | **High** | 2 hours | gRPC inter-service communication |
| WAF | **Medium** | 1 hour | Rate limiting, load test protection |
| CI/CD Pipelines | **High** | 2 days | Automate deploys |
| StopUAT/StartUAT Lambda | **High** | 4 hours | Save ~$300+/mo on off hours |

### Execution Roadmap (Updated February 23, 2026)

| Week | Tasks |
|------|-------|
| Week 1 | Deploy F&B + Offer services (ECR, task defs, ECS, Cloud Map) + Internal ALB |
| Week 2 | Move databases to me-central-1 (eliminate cross-region latency) |
| Week 3 | CI/CD pipelines (GitHub Actions or CodePipeline for all 8 services) |
| Week 4 | Cost optimization (StopUAT Lambda, delete Aurora/temp DBs, cleanup ALBs) |
| Week 5 | Load testing baseline (k6/Artillery against UAT) |

---

## 18. AWS Cost Analysis (Real Data — February 23, 2026)

### Total Platform Cost Summary (Verified from AWS)

| Environment | Monthly Cost | Basis |
|-------------|-------------|-------|
| **Production** (Account 2: 011566070219) | **~$27,873** | Detailed AWS discovery |
| UAE UAT (Account 1: 739991759290) | **~$689–800** | Detailed AWS discovery |
| UAE UAT (after optimization) | **~$285** | Projected |

### Production Cost Breakdown (Account 2: 011566070219, eu-central-1)

| Category | Details | Monthly |
|----------|---------|---------|
| ECS Fargate | 9 services, 39 tasks, 66 vCPU, 172 GB | $2,700 |
| Aurora PostgreSQL | 7 clusters (4 r6g.xlarge, 3 r6g.large), 17 instances | $7,700 |
| RDS Proxy | 6 proxies (3 r6g.xlarge, 3 r6g.large) | $1,800 |
| ElastiCache Redis | 9 clusters (r6g.large/xlarge), 18 nodes | $4,050 |
| Savings Plans | 1-yr no upfront compute | -$3,000 |
| Application Load Balancers (3) | Public + Internal + Website | $250 |
| NAT Gateways (3) | One per AZ | $150 |
| CloudFront (9 distributions) | api, app, cms, media, kiosk, etc. | $500 |
| WAF (2 WebACLs) | API + Website | $50 |
| S3 (38 buckets) | Media, CMS, reports, backups | $200 |
| Lambda (32 functions) | StopProd, sync, Datadog, etc. | $50 |
| CodePipeline (18 pipelines) | CI/CD for all services | $180 |
| SSM Parameter Store (51 params) | /uat/ namespace | $0 |
| Secrets Manager | 21 secrets | $10 |
| Route 53 | DNS zones (muvicinemas.com) | $5 |
| CloudWatch + Datadog | Logs, metrics, APM | $3,000 |
| Data Transfer (cross-AZ, CDN) | ~5 TB/mo estimate | $1,200 |
| **TOTAL** | | **~$27,873/mo** |
| **ANNUAL** | | **~$334,476/yr** |

### UAE UAT Cost Breakdown (Account 1: 739991759290)

| Category | Details | Monthly | After Cleanup |
|----------|---------|---------|---------------|
| ECS Fargate | 6 services, 11 tasks | $192 | $192 |
| RDS Frankfurt | 7 running instances (cross-region) | $326 | $0 (move to UAE) |
| RDS UAE (stopped) | 6 stopped temp-* instances | $5 (storage) | $0 (delete) |
| Aurora UAE | 2-node cluster (unknown purpose) | $110 | $0 (delete) |
| ElastiCache Redis | 1× cache.t3.small | $35 | $35 |
| ALB ×4 | Muvi-UAT + 3 test ALBs | $72 | $18 (keep 1) |
| NAT Gateways | ~3 (one per AZ) | $45 | $15 (keep 1) |
| CloudFront ×12 | Various distributions | $12 | $12 |
| S3 ×55 | Media, CMS, GitLab artifacts | $5 | $3 |
| Lambda (Bahrain) | email-provider | $2 | $2 |
| Secrets Manager | ~30 secrets (2 regions) | $8 | $8 |
| **TOTAL** | | **~$689–800** | **~$285** |

### Optimization Actions (UAT)

| Action | Current Cost | After | Savings | Effort |
|--------|-------------|-------|---------|--------|
| Move DBs to me-central-1 | $326/mo (Frankfurt) | $280/mo (UAE) | $46 + eliminate latency | 1 day |
| Delete Aurora cluster | $110/mo | $0 | $110 | 5 min |
| Delete 6 stopped temp-* DBs | $5/mo | $0 | $5 | 5 min |
| Delete 3 test ALBs | $54/mo | $0 | $54 | 10 min |
| Reduce to 1 NAT Gateway | $45/mo | $15 | $30 | 30 min |
| StopUAT Lambda (off-hours) | — | Save 60% on ECS+RDS | ~$170 | 4 hours |
| **TOTAL SAVINGS** | | | **~$415/mo** | |

### Cost Comparison: Production vs UAT

| Category | Production | UAT Current | UAT Optimized | Ratio |
|----------|-----------|-------------|---------------|-------|
| Compute (ECS) | $2,700 | $192 | $192 | 7% |
| Database (Aurora/RDS) | $9,500 | $441 | $280 | 3% |
| Cache (Redis) | $4,050 | $35 | $35 | 1% |
| Networking | $950 | $129 | $45 | 5% |
| CDN/Security | $550 | $12 | $12 | 2% |
| **TOTAL** | **$27,873** | **~$800** | **~$285** | **1%** |

---

## 19. CI/CD Pipeline Plan

**Status:** Paused (as of Feb 12, 2026)
**Blocker:** Need GitHub CLI installed (requires IT admin approval)

### Current State
- **Frankfurt:** 18 CodePipeline pipelines, auto-deploy on `uat` branch push, 3-min deploy time
- **UAE:** 0 app pipelines, all deploys manual via AWS Console (15-30 min/service)

### Planned Implementation (5 Phases)

**Phase 1: Prerequisites**
- Install GitHub CLI (`winget install GitHub.cli`)
- `gh auth login`, verify org permissions
- Set `git config --global user.name` and `user.email`
- Check branch protection rules

**Phase 2: Extract Vendor Config**
- Pull CodeBuild project config (`Muvi-Build` in eu-central-1)
- Pull CodePipeline structure (all 9 pipelines)
- Pull IAM roles used by CodeBuild/CodePipeline
- Document buildspec.yml / build commands

**Phase 3: Create AWS Resources (me-central-1)**
- S3 artifact bucket
- IAM role for CodeBuild (ECR push, CloudWatch logs)
- IAM role for CodePipeline (S3, CodeBuild, ECS)
- **CodeStar connection to `muvicinemas` GitHub org** (requires manual OAuth click in AWS Console)

**Phase 4: Test with Gateway**
- Create CodeBuild project
- Create CodePipeline: Source (GitHub) → Build → Deploy (ECS)
- Create `uat` branch on gateway repo
- Push test commit → verify auto-deploy
- Estimated cost: ~$0.02 per test

**Phase 5: Replicate for All Services**
- Create pipelines for: main, identity, payment, notification, website
- Create ECR repos + ECS services for F&B, Offer (currently missing)
- Set up branch protection rules

### CI/CD Cost

| Component | Monthly |
|-----------|---------|
| CodePipeline (6 pipes) | ~$5 |
| CodeBuild (~240 mins) | ~$0.70 |
| S3 + CloudWatch | ~$0.52 |
| ECR storage | ~$0.50 |
| **Total** | **~$6-7/month** |

### Alternative: GitHub Actions
- Cost: **$0** (free tier covers it)
- Less AWS-native but simpler YAML setup
- Store AWS credentials as GitHub Secrets
- Same end result: push to branch → deploy to ECS
- **Decision pending:** match vendor (CodePipeline) or use GitHub Actions?

---

## 20. GitHub Repositories & Branching

### In-house Repos (`muvicinemas` org)

| Repo | Default Branch | Other Branches | Vendor Equivalent |
|------|---------------|----------------|-------------------|
| `alpha-muvi-gateway-main` | `main` | `v20250930`, `v20251229` | `AlphaApps/muvi-gateway` |
| `alpha-muvi-main-main` | `main` | — | `AlphaApps/muvi-main` |
| `alpha-muvi-identity-main` | `main` | — | `AlphaApps/muvi-identity-service` |
| `alpha-muvi-payment-main` | `main` | — | `AlphaApps/muvi-payment-service` |
| `alpha-muvi-fb-main` | `main` | — | `AlphaApps/muvi-fb-service` |
| `alpha-muvi-notification-main` | `main` | — | `AlphaApps/muvi-notification-service` |
| `alpha-muvi-offer` | **`master`** | `v20251229`, `v20260114` | `AlphaApps/muvi-offer-service` |

**Note:** `alpha-muvi-offer` uses `master` not `main`.

### Vendor Repos (`AlphaApps` org)
- All pipelines trigger on `uat` branch push
- Also have: `AlphaApps/muvi-website`, `AlphaApps/Muvi-Dashboard` (CMS, S3 deploy)

### Branching Strategy (Pending Decision)

Vendor model:
```
main (dev work) → uat (auto-deploy to UAT) → prod (auto-deploy to prod)
```

Current state: Only `main`/`master` branches, no deployment branches.

**Decision needed:** Use `uat` branch model like vendor, or deploy from `main` directly?

### Git Credentials
- Windows Credential Manager has `git:https://github.com` stored
- Git fetch works (tested on gateway repo)
- No `git config` global `user.name`/`user.email` set

---

## 21. Local Development Setup

### Infrastructure (Docker Compose)

File: `docker-compose.yml` — Full local development stack.

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `muvi-postgres` | postgres:15-alpine | 5432 | Single PostgreSQL (all DBs via init-dbs.sql) |
| `muvi-redis` | redis:7-alpine | 6379 | Single Redis instance |
| `muvi-verdaccio` | verdaccio/verdaccio:5 | 4873 | Private NPM registry (for @alpha.apps packages) |
| `muvi-pgadmin` | dpage/pgadmin4 | 5050 | Database admin UI |

### Backend Services (Docker Compose)

Each service is built from its Dockerfile and configured with env overrides:
- `NODE_ENV=local` — skips SSM loading
- DB connections: `postgres` container, user: `muvi`, password: `muvi_local`
- Redis: `redis` container, port 6379
- Service discovery: Docker container names (`main-service:5002`, `identity-service:5001`, etc.)
- Debug ports: 9230 (identity), 9231 (main), 9232 (payment), etc.
- All external integrations use dummy values (Vista, SendGrid, Unifonic, etc.)

### Local DB Initialization
- `docker/init-dbs.sql` — Creates all 6 databases on single PostgreSQL instance
- `docker/create-ulid.sql` — Creates ULID generation function
- `DB_SYNC=true` / `DB_FORCE=false` — Sequelize auto-creates tables but doesn't drop existing

### Local Dev Commands
```powershell
# Start everything
docker compose up -d

# Start specific services
docker compose up -d gateway-service identity-service

# Rebuild a service
docker compose up -d --build payment-service

# View logs
docker compose logs -f gateway-service
```

### Verdaccio (Private NPM Registry)
- Config: `verdaccio/config.yaml`
- All `@alpha.apps/*` packages published here
- `.npmrc` files in each service point to Verdaccio for `@alpha.apps` scope
- Build script: `muvi-up.ps1 publish`

---

## 22. Vendor Takeover Plan (8 Weeks)

**Date:** February 8, 2026 | **Prepared by:** Internal Transition Team | **Audience:** CIO

### Architecture Layers (8)

| Layer | Purpose |
|-------|---------|
| 1. Customer Entry | API Gateway as front desk for all traffic |
| 2. Service Layer | Microservices: Identity, Main, Payments, Food, Notifications |
| 3. Internal Transport | gRPC — high-speed service-to-service communication |
| 4. Protection & Performance | Rate limiting + Redis cache for spike stability |
| 5. Data Layer | PostgreSQL for users, bookings, payments, film data |
| 6. Observability | Datadog (performance/logs) + Sentry (errors) |
| 7. CI/CD (MISSING) | Automated build/deploy pipeline not yet owned internally |
| 8. DevOps | AWS infra, security, scaling, backups, environment management |

### Key Risks

1. Code snapshot without full history — knowledge is in vendor team
2. Production access alone doesn't explain why decisions were made
3. CI/CD pipeline ownership and release process missing internally
4. Operational readiness (runbooks, deployments, rollbacks) must be built

### Week-by-Week Plan

| Week | Focus | Key Deliverables |
|------|-------|-----------------|
| **Week 1** ✅ | Orientation & System Overview | Architecture walkthrough; access confirmed (AWS, Datadog, Sentry, codebase); service/DB/dependency inventory; baseline docs |
| **Week 2** | Local Setup & Basic Validation | Local infra ready (DBs, Redis); all core services start locally; basic user flow validated; local setup guide written |
| **Week 3** | Core Request Flow Mapping | E2E flows: Login, Browse Films, Booking, Payment; service dependencies (gRPC paths); external vendor/API list; flow diagrams |
| **Week 4** | Critical Path & Risk Areas | Deep dive: payments, refunds, chargebacks; seat locking / concurrency; data integrity + backup strategy; incident response playbook |
| **Week 5** | UAT Environment & CI/CD | UAT plan approved; infrastructure created matching production; initial CI/CD pipeline; E2E deployments validated |
| **Week 6** | Recovery & Rollback Practice | Rollback plan per service; simulated deployment failure; DB restore tested and timed; cache failure behavior; emergency runbook |
| **Week 7** | Production Readiness | UAT/Prod config parity; Datadog dashboards + alerting; on-call process defined; production change checklist; leadership review |
| **Week 8** | First Independent Release | Small low-risk change through pipeline; UAT validation + prod deployment with monitoring; post-release review; **ownership sign-off** |

### Success Criteria
- Team can deploy, monitor, rollback without vendor help
- Hotfix delivered within **1–4 hours**
- Runbooks, diagrams, config inventories complete
- UAT aligned with production

### Leadership Decision Points
1. Confirm target AWS region and data residency policy
2. Approve time window for UAT and CI/CD changes
3. Confirm post-handover vendor support expectations (if any)

---

## 23. Critical Flows & Booking Lifecycle

### Complete Booking Flow

```
📱 User taps "Book Now"
    │
    ▼
🚪 Gateway receives POST /api/v1/orders
    ├── Rate limiter checks (5 req/60s for orders)
    ├── Auth guard validates JWT
    └── Forwards via gRPC to Main service
         │
         ▼
🎬 Main Service
    ├── Creates Vista order (POST /orders/)
    ├── Selects seats (POST /orders/{id}/sessions/{sid}/set-tickets/)
    ├── Reserves seats in local DB (status = PENDING)
    ├── Sets expiry timer (e.g., 15 min)
    └── Returns order details + payment URL
         │
         ▼
💳 Payment Service
    ├── Creates payment intent with chosen gateway (HyperPay/PayFort/Checkout/Tabby)
    ├── Returns payment URL to client
    │
    ▼
📱 User completes payment on gateway page
    │
    ▼
💳 Payment webhook arrives → webhook-queue (10s delay)
    ├── Validate payment status with gateway
    ├── Submit payment to Vista (POST /RESTTicketing.svc/order/payment)
    ├── Enqueue generate-ticket-queue
    │
    ▼
🎫 Main Service (generate-ticket processor)
    ├── Generate ticket image (Puppeteer: EJS → PNG → S3)
    ├── Generate Apple Wallet .pkpass (→ S3)
    ├── Generate ZATCA QR code
    ├── Update order status → CONFIRMED
    │
    ▼
🔔 Notification Service
    ├── Push notification via OneSignal
    ├── Booking confirmation email via SendGrid
    └── Braze user profile update

IF PAYMENT FAILS or TIMEOUT:
    ├── Cancel Vista order (orderService.refundBooking())
    ├── Release seats in local DB
    ├── Process payment refund if charged
    └── Status → EXPIRED / CANCELLED
```

### Request Flow: Login (OTP)

```
POST /api/v1/auth/send-otp { phoneNumber: "+971501234567" }
    │
    ▼
Gateway: ThrottlerBehindProxyGuard → AuthController.sendOtp()
    │
    ▼
AuthService.sendOtp() → gRPC → Identity Service
    │
    ▼
Identity: Generate OTP → Store in DB → Send via Unifonic/Taqnyat SMS
    │
    ▼
POST /api/v1/auth/verify-otp { phoneNumber, code: "123456" }
    │
    ▼
Identity: Validate OTP → Generate JWT (RS256) + Refresh Token → Return tokens
```

### Refund Flow

```
CMS Admin clicks "Refund" OR cron finds expired order
    │
    ▼
Gateway → Main Service: Cancel Vista order
    │
    ▼
Main → Payment Service (gRPC): Process refund
    │
    ▼
Payment: refund-queue (delayed to expireAt)
    ├── Check payment status with gateway
    ├── Call gateway refund API (HyperPay/PayFort/Checkout)
    ├── Update payment status → REFUNDED
    ├── If wallet payment: E_WALLET_QUEUE → REFUND process
    └── Send refund email via SendGrid
```

### Bulk Refund Flow (CMS)

```
CMS triggers bulk refund for a cancelled showtime
    │
    ▼
Gateway → Main: bulk-refund-queue
    │
    ▼
Bulk Refund Processor:
    FOR each booking:
    ├── Cancel Vista order
    ├── Process payment refund
    ├── Send notification
    └── Generate bulk refund report (email via SendGrid)
```

---

## 24. Key Risks & Operational Gaps

### Critical Gaps (Must Fix)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| 1 | **No CI/CD in UAE** | Manual deploys: 15-30 min/service, error-prone | P0 |
| 2 | **F&B + Offer services missing in UAE** | Incomplete platform — food ordering and promotions won't work | P0 |
| 3 | **No Internal ALB in UAE** | gRPC calls use DNS cache (60-120s failure detection vs ALB's 10s) | P0 |
| 4 | **No WAF in UAE** | No DDoS/bot protection on public ALB | P1 |
| 5 | **No Datadog in UAE** | Zero observability — blind to performance issues | P1 |
| 6 | **No auto-scaling in UAE** | Can't handle traffic spikes | P1 |
| 7 | **No Stop/Start Lambdas in UAE** | Paying for full infra 24/7, wasting ~$150+/mo | P2 |

### Architecture Risks

| # | Risk | Detail |
|---|------|--------|
| 1 | **NestJS version split** | F&B on v9.4.0, others on v8.4.x — future incompatibility |
| 2 | **TypeScript version split** | F&B 4.7.4, shared lib 5.0.4, others 4.3.5 |
| 3 | **No Node engines declared** | package.json files don't specify Node version |
| 4 | **SDK divergence risk** | Multiple proto/SDK copies across repos, no single source of truth |
| 5 | **2TB main_db in UAT** | Excessive storage cost, likely stale data |
| 6 | **3 NAT Gateways in UAE** | Should be 1, wasting ~$70+/mo |
| 7 | **Aurora cluster in UAE** | Not in Frankfurt reference, $90/mo for unclear purpose |
| 8 | **DB naming issues** | "temp-" prefix, "idetity" typo in UAE |
| 9 | **Main + Payment have no auto-scaling** | Even in Frankfurt, these critical services can't scale |
| 10 | **SSM params unverified** | UAE may hardcode env vars in task defs instead of SSM |

### Vendor Handover Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Code snapshot without full git history | Document architectural decisions; create ADRs |
| 2 | Knowledge in vendor team's heads | Complete takeover plan Weeks 1-8 |
| 3 | No internal release process | Establish CI/CD, branching strategy, change management |
| 4 | No runbooks or incident response | Create during Week 4-6 of takeover plan |
| 5 | Production access without understanding | Deep dives on payments, refunds, seat locking (Week 4) |

---

## 25. Documentation Inventory

### Files in `documentation/`

| File | Type | Content | Generated By |
|------|------|---------|-------------|
| `MUVI_SYSTEM_DOCUMENTATION.md` | Markdown | **This file** — complete knowledge base (2000+ lines) | Manual |
| `CICD-SETUP-PLAN.md` | Markdown | CI/CD pipeline implementation plan (5 phases) | Manual |
| `PROD_INFRASTRUCTURE_REPORT.md` | Markdown | Complete production inventory — 20 sections, 861 lines | AI-assisted |
| `AWS_CRASH_COURSE_FOR_MUVI.md` | Markdown | 28-section AWS learning guide for the team | AI-assisted |
| `api.html` | HTML | Interactive API reference — 481 endpoints, "Try it" buttons | `generate-api-docs.js` |
| `api-storybook.html` | HTML | Narrative API walkthrough — 24 chapters, 284 steps | `generate-api-storybook.js` |
| `backend-audit.html` | HTML | Backend audit — 23 integrations, 15 cron jobs, 6 queues | `generate-backend-audit.js` |
| `aws-cost-analysis.html` | HTML | AWS cost breakdown — Frankfurt, Production, UAE | Manual |
| `infra-gap-report.html` | HTML | Frankfurt vs UAE gap analysis | Manual |
| `muvi-infra-explorer.html` | HTML | Interactive cost visualization — $27,873/mo breakdown | AI-assisted |
| `UAT_ENVIRONMENT_BUILD_GUIDE.html` | HTML | Step-by-step UAT build guide — 9 phases, ~50 steps, interactive tracking | AI-assisted |
| `MUVI_Takeover_Plan_CIO.html` | HTML | 8-week CIO transition plan | Manual |
| `load-testing-strategy.html` | HTML | k6/Artillery load testing plan | Manual |
| `cicd-setup-plan.html` | HTML | CI/CD setup plan (HTML version) | Manual |
| `vendor-takeover-checklist.html` | HTML | Vendor transition checklist | Manual |
| `generate-api-docs.js` | Script | Generates api.html from Gateway controller source code | — |
| `generate-api-storybook.js` | Script | Generates api-storybook.html with narrative content | — |
| `generate-backend-audit.js` | Script | Generates backend-audit.html from hardcoded audit data | — |

### Task Definition Files (LOCAL ONLY — contain secrets, do NOT commit)

| File | Service | Size | Source |
|------|---------|------|--------|
| `documentation/gateway-taskdef.json` | Gateway | 16 KB | Account 1 ECS |
| `documentation/identity-taskdef.json` | Identity | 18 KB | Account 1 ECS |
| `documentation/main-taskdef.json` | Main | 21 KB | Account 1 ECS |
| `documentation/payment-taskdef.json` | Payment | 24 KB | Account 1 ECS |
| `documentation/notification-taskdef.json` | Notification | 13 KB | Account 1 ECS |
| `documentation/website-taskdef.json` | Website | 3 KB | Account 1 ECS |

### Other Documentation Locations

| Location | Content |
|----------|---------|
| `terraform/` | 36 .tf files + import.sh (~8,000 lines) — import-wrapper for Account 2 prod |
| `dev-portal/` | Developer portal HTML (API docs, Docker guide) |
| `scripts/` | Utility scripts |
| `docker/` | Docker init scripts (create-ulid.sql, init-dbs.sql, pgadmin config) |

### How to Regenerate

```powershell
node documentation/generate-api-docs.js        # → documentation/api.html
node documentation/generate-api-storybook.js    # → documentation/api-storybook.html
node documentation/generate-backend-audit.js    # → documentation/backend-audit.html
```

---

## 26. Project Structure (Actual Workspace)

```
muvi-cinemas/
├── _packages-source/
│   └── @alpha.apps/
│       └── muvi-proto/              # Protobuf definitions + generated TS types
│           ├── lib/                 # Generated code
│           ├── output/              # Compiled output
│           └── package.json
├── docker/
│   ├── create-ulid.sql              # ULID generation function for PostgreSQL
│   ├── init-dbs.sql                 # Creates all 6 databases
│   ├── pgadmin-servers.json         # PgAdmin server config
│   └── pgpass                       # PgAdmin password file
├── documentation/                   # See Section 25
├── main-backend-microservices/
│   ├── alpha-muvi-gateway-main/     # API Gateway (HTTP → gRPC)
│   │   ├── src/
│   │   │   ├── identity/            # Identity proxy (controllers + services)
│   │   │   ├── main/                # Main proxy (controllers + services)
│   │   │   ├── payment/             # Payment proxy (controllers + services)
│   │   │   ├── fb/                  # F&B proxy (controllers + services)
│   │   │   ├── notification/        # Notification proxy (controllers + services)
│   │   │   ├── offer/               # Offer proxy (controllers + services)
│   │   │   ├── guard/               # Auth, throttler, maintenance guards
│   │   │   ├── shared/              # Redis caching, SSM loader, interceptors
│   │   │   ├── files/               # S3 file upload service
│   │   │   └── main.ts, app.module.ts, tracer.ts
│   │   ├── config/                  # Environment config
│   │   ├── models/                  # Request/response models
│   │   └── Dockerfile
│   ├── alpha-muvi-identity-main/    # User & Auth Service
│   │   ├── src/
│   │   │   ├── user/                # User CRUD, device tokens
│   │   │   ├── auth/                # Authentication, OTP
│   │   │   ├── permissions/         # Role-based access control
│   │   │   └── shared/              # SMS gateways, email, braze, redis
│   │   ├── database/migrations/     # Sequelize migrations
│   │   ├── libs/                    # (none published)
│   │   └── Dockerfile
│   ├── alpha-muvi-main-main/        # Core Business Logic
│   │   ├── src/
│   │   │   ├── films/, cinemas/, city/, genres/, people/, experiences/
│   │   │   ├── film-session/, film-finder/
│   │   │   ├── orders/              # Order lifecycle, ticket gen, Apple Wallet
│   │   │   ├── offers/, banners/, bookmarks/
│   │   │   ├── vista/               # 6 Vista sync services
│   │   │   ├── sync-job/            # CLI sync command (nest-commander)
│   │   │   ├── refund-payment-requests/  # Bulk refund queue
│   │   │   ├── shared/              # Vista service, email, files, redis
│   │   │   └── main.ts, main-cli.ts, tracer.ts
│   │   ├── database/migrations/
│   │   ├── assets/                  # EJS templates for ticket rendering
│   │   ├── test/
│   │   └── Dockerfile
│   ├── alpha-muvi-payment-main/     # Payment Processing
│   │   ├── src/
│   │   │   ├── payment/             # Payment + refund queue + webhook queue + generate ticket queue
│   │   │   ├── wallet-transaction/  # E-wallet queue, wallet operations
│   │   │   ├── shared/              # HyperPay, PayFort, Checkout.com, Tabby, NearPay, Apple Pay, email
│   │   │   └── main.ts, tracer.ts
│   │   ├── database/migrations/
│   │   └── Dockerfile
│   ├── alpha-muvi-fb-main/          # Food & Beverage
│   │   ├── src/
│   │   │   ├── concession-tabs/, concession-items/, modifiers/, add-ons/
│   │   │   ├── orders/, kiosks/, menus/
│   │   │   ├── sync-job/            # CLI sync command
│   │   │   ├── shared/              # Vista, email, files, redis, invoice (ZATCA)
│   │   │   └── main.ts, main-cli.ts, tracer.ts
│   │   ├── database/migrations/
│   │   ├── libs/fb-sdk/             # Published as @alpha.apps/muvi-fb-sdk
│   │   └── Dockerfile
│   ├── alpha-muvi-notification-main/ # Notifications
│   │   ├── src/
│   │   │   ├── notification/        # OneSignal, push templates
│   │   │   ├── shared/              # Braze, email
│   │   │   └── main.ts, tracer.ts
│   │   ├── database/migrations/
│   │   └── Dockerfile
│   └── alpha-muvi-offer/            # Offers (Go)
│       ├── src/
│       │   ├── vista/               # Vista voucher validation
│       │   ├── unipal/              # Student verification
│       │   └── ...
│       ├── database/
│       ├── environment/
│       ├── redis/                   # Redis init + cache service
│       ├── main.go
│       ├── go.mod
│       └── Dockerfile
├── packages/
│   ├── muvi-shared/                 # @alpha.apps/muvi-shared (Vista API + DB replication)
│   │   ├── src/
│   │   └── package.json
│   └── nestjs-common/               # @alpha.apps/nestjs-common (Sentry, Winston, gRPC)
│       ├── src/, lib/
│       └── package.json
├── verdaccio/
│   └── config.yaml                  # Private NPM registry config
├── web/
│   ├── alpha-muvi-cms-main/         # CMS Admin Dashboard (React + Vite)
│   └── alpha-muvi-website-main/     # Customer Website (React + Vite)
├── docker-compose.yml               # Full local development stack
├── muvi-up.ps1                      # All-in-one CLI (bootstrap + up/down/restart/seed/status/logs)
├── muvi-up.ps1                      # Start everything script
├── build-and-publish-packages.ps1   # Publish packages to Verdaccio
├── local-dev-patches.ps1            # Patches for local dev
├── find-versions.js                 # Version audit utility
├── fix-integrity.js                 # NPM integrity fix utility
├── publish-all-versions.js          # Publish all package versions
└── README.md                        # Workspace file tree (auto-generated, ~24K lines)
```

---

## 27. Quick Reference & Cheatsheet

### Service Ports

| Service | gRPC Port | HTTP Port | Debug Port |
|---------|-----------|-----------|------------|
| Gateway | — | 3000 | — |
| Identity | 5001 | 6001 | 9230 |
| Main | 5002 | 6002 | 9231 |
| Payment | 5003 | 6003 | 9232 |
| FB | 5004 | 6004 | 9233 |
| Notification | 5005 | 6005 | 9234 |
| Offer (Go) | 5006 | — | — |

### Key Files by Layer

| Layer | File Pattern | Purpose |
|-------|-------------|---------|
| Entry | `main.ts` | App bootstrap, SSM config, global pipes/filters |
| Config | `app.module.ts` | Module registration, providers, guards |
| Routes | `*.controller.ts` | HTTP/gRPC endpoints |
| Security | `*.guard.ts` | Auth, rate limiting, maintenance |
| Business | `*.service.ts` | Business logic, gRPC calls |
| gRPC | `grpc-*-client.options.ts` | Service connection configs |
| Cache | `redis-caching.service.ts` | Redis operations |
| Errors | `all-exception.filter.ts` | Error handling |
| Logging | `winston-logger.options.ts` | Datadog logging |
| Tracing | `tracer.ts` | Datadog APM (must be first import) |
| Secrets | `load-ssm-config.ts` | AWS SSM parameter loader |
| Scaling | `app-cluster.service.ts` | Multi-process clustering |
| Database | `*.entity.ts` | Sequelize model definitions |
| Migration | `database/migrations/*.js` | DB schema migrations |
| Queue | `*.processor.ts` | Bull queue job processors |
| CLI | `main-cli.ts` + `sync-job.command.ts` | nest-commander CLI |

### Environment Variables (Complete Reference)

**Core (all services):**
`NODE_ENV`, `SERVER_HOST`, `SERVER_PORT`, `DB_READ_HOST`, `DB_WRITE_HOST`, `DB_READ_USERNAME`, `DB_WRITE_USERNAME`, `DB_READ_PASSWORD`, `DB_WRITE_PASSWORD`, `DB_DATABASE`, `DB_PORT`, `DB_DIALECT`, `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_AUTO_LOAD_MODELS`, `DB_SYNC`, `DB_FORCE`, `DB_LOGGING`, `DB_UNDERSCORED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_TTL`, `SENTRY_DSN`, `DATADOG_API_KEY`, `DD_SITE`, `DD_SERVICE`, `DD_VERSION`, `SSM_ACCESS_KEY_ID`, `SSM_SECRET_ACCESS_KEY`, `SSM_REGION`, `VERSION`

**Gateway specific:**
`THROTTLE_TTL`, `THROTTLE_LIMIT`, `THROTTLE_ORDER_TTL`, `THROTTLE_ORDER_LIMIT`, `CLOUDFRONT_DOMAIN`

**Identity specific:**
`JWT_SECRET_KEY`, `REFRESH_SECRET_KEY`, `NEW_REFRESH_SECRET_KEY`, `JWT_EXPIRES_IN`, `REFRESH_JWT_EXPIRES_IN`, `JWT_SALT_WORK_FACTOR`, `UNIFONIC_URL`, `UNIFONIC_AUTH_TOKEN`, `UNIFONIC_APP_ID`, `UNIFONIC_CHANNEL`, `UNIFONIC_LENGTH`, `TAQNYAT_URL`, `TAQNYAT_API_KEY`, `TAQNYAT_ANDROID_AUTOFILL_HASH`, `SENDGRID_API_KEY`, `BRAZE_BASE_URL`, `BRAZE_API_KEY`, `BRAZE_LOGGED_IN_SEGMENT_ID`, `BRAZE_GUEST_SEGMENT_ID`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `CMS_BASE_URL`, `CMS_RESET_PASSWORD`, `DEFAULT_PASSWORD`, `VISTA_BASE_URL`, `VISTA_ANDROID_TOKEN`, `VISTA_IOS_TOKEN`, `VISTA_WEBSITE_TOKEN`, `VISTA_HUAWEI_TOKEN`, `VISTA_KIOSK_TOKEN`, `VISTA_CLUB_ID`

**Payment specific:**
`HYPER_PAY_BASE_URL`, `HYPER_PAY_TOKEN`, `HYPER_PAY_ENTITY_ID`, `PAYFORT_BASE_URL`, `PAYFORT_ACCESS_CODE`, `PAYFORT_MERCHANT_IDENTIFIER`, `PAYFORT_SHA_TYPE`, `PAYFORT_SHA_REQUEST_PHRASE`, `PAYFORT_SHA_RESPONSE_PHRASE`, `CHECKOUT_SECRET_KEY`, `CHECKOUT_PRIMARY_KEY`, `CHECKOUT_SUCCESS_END_POINT`, `CHECKOUT_FAILED_END_POINT`, `TABBY_BASE_URL`, `TABBY_API_KEY`, `TABBY_MERCHANT_CODE`, `TABBY_CALLBACK_END_POINT`, `NEARPAY_BASE_URL`, `NEARPAY_API_KEY`, `NEARPAY_PRIVATE_KEY`, `NEARPAY_CLIENT_UUID`, `APPLE_PAY_DOMAIN_NAME`, `APPLE_PAY_VALIDATE_SESSION_URL`, `EXPORT_FINANCE_REPORT_LAMBDA_FUNCTION_NAME`

**Main specific:**
`GOOGLE_API_KEY`, `ZATCA_SELLER_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `APPLE_WALLET_PASS_TYPE_IDENTIFIER`, `APPLE_WALLET_TEAM_IDENTIFIER`, `APPLE_WALLET_CER_FILE_NAME`

**Notification specific:**
`ONESIGNAL_API_KEY`, `ONESIGNAL_APP_ID`

**Offer (Go) specific:**
`UNIPAL_BASE_URL`, `UNIPAL_API_KEY`

### AWS CLI Quick Commands

```powershell
# Force new ECS deployment
aws ecs update-service --cluster Muvi-Cluster --service muvi-gateway-service-mfnabtxa --force-new-deployment --region me-central-1

# View logs
aws logs tail /ecs/muvi-uat-gateway --follow --region me-central-1

# Check service status
aws ecs describe-services --cluster Muvi-Cluster --services muvi-gateway-service-mfnabtxa --region me-central-1

# Push Docker image to ECR
aws ecr get-login-password --region me-central-1 | docker login --username AWS --password-stdin 739991759290.dkr.ecr.me-central-1.amazonaws.com
docker build -t muvi-gateway-uat .
docker tag muvi-gateway-uat:latest 739991759290.dkr.ecr.me-central-1.amazonaws.com/muvi-gateway-uat:latest
docker push 739991759290.dkr.ecr.me-central-1.amazonaws.com/muvi-gateway-uat:latest

# SSM parameters
aws ssm get-parameters-by-path --path /uat/ --recursive --with-decryption --region me-central-1
```

### Local Dev URLs

| Service | URL |
|---------|-----|
| Gateway API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/swagger |
| Health check | http://localhost:3000/heartbeat |
| PgAdmin | http://localhost:5050 (admin@muvi.com / admin123) |
| Verdaccio | http://localhost:4873 |

---

## 28. Networking & VPC Peering Topology

### Two-Account Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Account 1: 739991759290 (In-House, WRITE)                              │
│                                                                         │
│  ┌──────────────────────────┐        ┌──────────────────────────────┐  │
│  │  me-central-1 (UAE)       │        │  eu-central-1 (Frankfurt)     │  │
│  │                          │  VPC    │                              │  │
│  │  ECS: 6 services/11 tasks│◄─Peer──►  RDS: 7 databases (RUNNING)  │  │
│  │  ALB: 4 (1 active)       │  ×2    │  Aurora: 1 cluster           │  │
│  │  Redis: 1 (t3.small)     │        │  S3: muvi-media-uat, etc     │  │
│  │  ECR: 8 repos            │        │                              │  │
│  │  Cloud Map: uat.internal  │        │                              │  │
│  │                          │        │                              │  │
│  │  VPCs:                   │        │  VPCs:                       │  │
│  │   10.60.0.0/16 (primary) │        │   10.241.0.0/16 (UAT DBs)   │  │
│  │   10.50.0.0/16 (DB vpc)  │        │                              │  │
│  │   10.0.0.0/16 (agha)     │        │                              │  │
│  │   172.31.0.0/16 (default)│        │                              │  │
│  └──────────────────────────┘        └──────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────┐                                          │
│  │  me-south-1 (Bahrain)     │                                          │
│  │  Lambda: email-provider   │                                          │
│  │  API Gateway: email       │                                          │
│  │  (Default AWS region)     │                                          │
│  └──────────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Account 2: 011566070219 (Production, READ-ONLY)                        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  eu-central-1 (Frankfurt) — ALL RESOURCES                        │  │
│  │                                                                  │  │
│  │  ECS: 9 services / 39 tasks / 66 vCPU / 172 GB                  │  │
│  │  Aurora: 7 clusters / 17 instances                               │  │
│  │  RDS Proxy: 6                                                    │  │
│  │  Redis: 9 clusters / 18 nodes                                    │  │
│  │  ALB: 3 (Public + Internal + Website)                            │  │
│  │  CloudFront: 9 distributions                                     │  │
│  │  WAF: 2 WebACLs                                                  │  │
│  │  Lambda: 32 functions                                            │  │
│  │  CodePipeline: 18 pipelines                                      │  │
│  │  S3: 38 buckets                                                  │  │
│  │  Monthly: ~$27,873                                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ⚠ NO cross-account VPC peering to Account 1                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### VPC Inventory — Account 1, me-central-1

| VPC ID | CIDR | Name | Purpose |
|--------|------|------|---------|
| vpc-0ab936370488229bd | 10.60.0.0/16 | (primary UAT) | ECS services, ALBs, Redis, NAT |
| vpc-008a2d435d26eb413 | 172.31.0.0/16 | (default) | AWS default VPC |
| vpc-05e2e9c2e88029d4d | 10.50.0.0/16 | Database-vpc | DB testing (unused?) |
| vpc-0d1b744f68bdf4ac5 | 10.0.0.0/16 | agha-vpc | Test cluster |

### VPC Inventory — Account 1, eu-central-1

| VPC ID | CIDR | Name | Purpose |
|--------|------|------|---------|
| vpc-04056649658133bf4 | 10.241.0.0/16 | (UAT databases) | 7 RDS instances, cross-region peered |

### VPC Peering (Intra-Account 1, Cross-Region)

| Peering ID | Name | Requester | Accepter | Status |
|------------|------|-----------|----------|--------|
| pcx-0351c9bc3f265a5e1 | sample-film-session-uae2frankfurt | vpc-0ab936370488229bd (10.60.0.0/16, me-central-1) | vpc-04056649658133bf4 (10.241.0.0/16, eu-central-1) | Active |
| pcx-0190f1784ee4c30f6 | Frankfurt-UAE-UAT-Peering | vpc-04056649658133bf4 (10.241.0.0/16, eu-central-1) | vpc-0d1b744f68bdf4ac5 (10.0.0.0/16, me-central-1) | Active |

> **Critical Issue:** ECS (me-central-1) → RDS (eu-central-1) crosses ~4,000 km via VPC peering. Each DB query adds ~100-150ms network latency. This is the #1 architectural issue for load testing.

### Subnet Layout — Primary UAT VPC (vpc-0ab936370488229bd, 10.60.0.0/16)

| Subnet | CIDR | AZ | Type | Used By |
|--------|------|----|------|---------|
| Public-a | 10.60.0.0/24 | mec1-az1 | Public | ALB, NAT Gateway |
| Public-b | 10.60.1.0/24 | mec1-az2 | Public | ALB |
| Public-c | 10.60.2.0/24 | mec1-az3 | Public | ALB |
| Private-a | 10.60.10.0/24 | mec1-az1 | Private | ECS tasks |
| Private-b | 10.60.11.0/24 | mec1-az2 | Private | ECS tasks |
| Private-c | 10.60.12.0/24 | mec1-az3 | Private | ECS tasks |
| DB-a | 10.60.20.0/24 | mec1-az1 | Isolated | Redis |
| DB-b | 10.60.21.0/24 | mec1-az2 | Isolated | Redis |

### Security Groups — Key Ones (me-central-1)

| SG | Purpose | Key Inbound Rules |
|----|---------|------------------|
| Muvi-UAT-ALB-SG | ALB security group | 80 from 0.0.0.0/0 |
| Muvi-UAT-ECS-SG | ECS tasks | 3000-3001 from ALB SG |
| Muvi-UAT-Redis-SG | Redis cache | 6379 from ECS SG |

---

## 29. Configuration Management (SSM & Secrets)

### SSM Parameter Store — Account 1, me-central-1 (51 parameters under /uat/)

#### Database Configuration

| Parameter | Value |
|-----------|-------|
| /uat/DB_DIALECT | postgres |
| /uat/DB_PORT | 5432 |
| /uat/MAIN_DB_HOST | muvi-uat-main.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| /uat/IDENTITY_DB_HOST | muvi-uat-identity.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| /uat/PAYMENT_DB_HOST | muvi-uat-payment.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| /uat/FB_DB_HOST | muvi-uat-fb.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| /uat/NOTIFICATION_DB_HOST | muvi-uat-notification.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| /uat/OFFER_DB_HOST | muvi-uat-offer.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |

#### Service Discovery

| Parameter | Value |
|-----------|-------|
| /uat/GATEWAY_HOST | gateway.uat.internal |
| /uat/IDENTITY_HOST | identity.uat.internal |
| /uat/MAIN_HOST | main.uat.internal |
| /uat/PAYMENT_HOST | payment.uat.internal |
| /uat/NOTIFICATION_HOST | notification.uat.internal |
| /uat/FB_HOST | fb.uat.internal |
| /uat/OFFER_HOST | offer.uat.internal |

#### Ports (all services use the same backend port)

| Parameter | Value |
|-----------|-------|
| /uat/GATEWAY_PORT | 3001 |
| /uat/IDENTITY_PORT | 7024 |
| /uat/MAIN_PORT | 7024 |
| /uat/PAYMENT_PORT | 7024 |
| /uat/NOTIFICATION_PORT | 7024 |
| /uat/FB_PORT | 7024 |
| /uat/OFFER_PORT | 7024 |

> **Note:** Gateway listens on port 3001 (HTTP), all backend services listen on port 7024 (gRPC).

#### Redis

| Parameter | Value |
|-----------|-------|
| /uat/REDIS_HOST | muvi-uat-redis-uae-classic.c6kxj3.ng.0001.mec1.cache.amazonaws.com |
| /uat/REDIS_PORT | 6379 |
| /uat/REDIS_TTL | 3600 |

#### S3 & Storage

| Parameter | Value |
|-----------|-------|
| /uat/S3_BUCKET | muvi-media-uat |
| /uat/S3_REGION | eu-west-1 (**⚠ WRONG! Bucket is in eu-central-1**) |
| /uat/CDN_URL | https://d3ui39dhvshx4d.cloudfront.net |

#### External Integrations

| Parameter | Value |
|-----------|-------|
| /uat/VISTA_BASE_URL | https://uat-cnt-v01.muvicinemas.com/WSVistaWebClient/ |
| /uat/BRAZE_REST_ENDPOINT | https://rest.iad-06.braze.com |
| /uat/BRAZE_APP_ID | (configured) |
| /uat/ONESIGNAL_APP_ID | (configured) |
| /uat/SENDGRID_FROM_EMAIL | (configured) |
| /uat/UNIFONIC_BASE_URL | (configured) |
| /uat/APPLE_WALLET_WEB_SERVICE_URL | https://uat-muvi-gateway.d19rfpryhc0lp5.cloudfront.net |

#### Application Settings

| Parameter | Value |
|-----------|-------|
| /uat/NODE_ENV | uat |
| /uat/APP_ENV | uat |
| /uat/LOG_LEVEL | debug |
| /uat/JWT_EXPIRY | 30d |
| /uat/OTP_EXPIRY_MINUTES | 5 |
| /uat/BOOKING_EXPIRY_MINUTES | 15 |
| /uat/MAX_SEATS_PER_BOOKING | 10 |
| /uat/RATE_LIMIT_TTL | 60 |
| /uat/RATE_LIMIT_MAX | 100 |
| /uat/ORDER_RATE_LIMIT_MAX | 5 |

#### Feature Flags

| Parameter | Value |
|-----------|-------|
| /uat/ENABLE_PUSH_NOTIFICATIONS | true |
| /uat/ENABLE_EMAIL_NOTIFICATIONS | true |
| /uat/ENABLE_SMS_NOTIFICATIONS | true |
| /uat/ENABLE_VISTA_SYNC | true |

### Secrets Manager — Account 1

#### me-central-1 (16 secrets)

| Secret Name | Purpose |
|-------------|---------|
| /uat/MAIN_DB_PASSWORD | Main database password |
| /uat/IDENTITY_DB_PASSWORD | Identity database password |
| /uat/PAYMENT_DB_PASSWORD | Payment database password |
| /uat/FB_DB_PASSWORD | F&B database password |
| /uat/NOTIFICATION_DB_PASSWORD | Notification database password |
| /uat/OFFER_DB_PASSWORD | Offer database password |
| /uat/JWT_SECRET | JWT signing key |
| /uat/HYPERPAY_ACCESS_TOKEN | HyperPay payment gateway |
| /uat/CHECKOUT_SECRET_KEY | Checkout.com payment |
| /uat/PAYFORT_SHA_REQUEST_PHRASE | PayFort HMAC key |
| /uat/TABBY_SECRET_KEY | Tabby payment |
| /uat/UNIFONIC_APP_SID | Unifonic SMS |
| /uat/SENDGRID_API_KEY | SendGrid email |
| /uat/ONESIGNAL_API_KEY | OneSignal push |
| /uat/BRAZE_API_KEY | Braze marketing |
| /uat/VISTA_API_KEY | Vista Entertainment |

#### eu-central-1 (13 secrets)

| Secret Name | Purpose |
|-------------|---------|
| muvi-uat-main-db-credentials | Main DB (RDS in Frankfurt) |
| muvi-uat-identity-db-credentials | Identity DB |
| muvi-uat-payment-db-credentials | Payment DB |
| muvi-uat-fb-db-credentials | F&B DB |
| muvi-uat-notification-db-credentials | Notification DB |
| muvi-uat-offer-db-credentials | Offer DB |
| muvi-uat-jwt-secret | JWT key (duplicate!) |
| + 6 others | Various integration keys |

> ⚠️ **Secrets are duplicated** across me-central-1 and eu-central-1. Payment SSM_REGION is eu-central-1 while others use me-central-1.

---

## 30. ECS Task Definitions — Environment Variable Reference

### Common Environment Variables (All Backend Services)

| Variable | Source | Value |
|----------|--------|-------|
| NODE_ENV | Hard-coded | uat |
| APP_ENV | SSM | uat |
| DB_DIALECT | SSM | postgres |
| DB_PORT | SSM | 5432 |
| REDIS_HOST | SSM | muvi-uat-redis-uae-classic.c6kxj3.ng.0001.mec1.cache.amazonaws.com |
| REDIS_PORT | SSM | 6379 |
| REDIS_TTL | SSM | 3600 |
| S3_BUCKET | SSM | muvi-media-uat |
| S3_REGION | SSM | eu-west-1 (**⚠ Wrong**) |
| CDN_URL | SSM | https://d3ui39dhvshx4d.cloudfront.net |
| LOG_LEVEL | SSM | debug |
| SSM_REGION | Hard-coded | me-central-1 (except Payment: eu-central-1) |

### Gateway Service (port 3001)

| Variable | Source | Value/Purpose |
|----------|--------|---------------|
| PORT | Hard-coded | 3001 |
| GRPC_IDENTITY_HOST | SSM | identity.uat.internal |
| GRPC_MAIN_HOST | SSM | main.uat.internal |
| GRPC_PAYMENT_HOST | SSM | payment.uat.internal |
| GRPC_FB_HOST | SSM | fb.uat.internal |
| GRPC_NOTIFICATION_HOST | SSM | notification.uat.internal |
| GRPC_OFFER_HOST | SSM | offer.uat.internal |
| GRPC_PORT | SSM | 7024 |
| RATE_LIMIT_TTL | SSM | 60 |
| RATE_LIMIT_MAX | SSM | 100 |
| ORDER_RATE_LIMIT_MAX | SSM | 5 |

### Identity Service (gRPC port 7024)

| Variable | Source | Value/Purpose |
|----------|--------|---------------|
| GRPC_PORT | SSM | 7024 |
| DB_HOST | SSM | muvi-uat-identity.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| DB_NAME | SSM | muvi_identity |
| DB_USERNAME | Secrets | (from Secrets Manager) |
| DB_PASSWORD | Secrets | (from Secrets Manager) |
| UNIFONIC_APP_SID | Secrets | (SMS OTP) |
| UNIFONIC_BASE_URL | SSM | (Unifonic API) |
| JWT_SECRET | Secrets | (JWT signing) |
| JWT_EXPIRY | SSM | 30d |
| OTP_EXPIRY_MINUTES | SSM | 5 |

### Main Service (gRPC port 7024)

| Variable | Source | Value/Purpose |
|----------|--------|---------------|
| GRPC_PORT | SSM | 7024 |
| DB_HOST | SSM | muvi-uat-main.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| DB_NAME | SSM | muvi_main |
| VISTA_BASE_URL | SSM | https://uat-cnt-v01.muvicinemas.com/WSVistaWebClient/ |
| VISTA_API_KEY | Secrets | (Vista auth) |
| BOOKING_EXPIRY_MINUTES | SSM | 15 |
| MAX_SEATS_PER_BOOKING | SSM | 10 |
| APPLE_WALLET_WEB_SERVICE_URL | SSM | (Apple Wallet) |

### Payment Service (gRPC port 7024)

| Variable | Source | Value/Purpose |
|----------|--------|---------------|
| GRPC_PORT | SSM | 7024 |
| DB_HOST | SSM | muvi-uat-payment.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| DB_NAME | SSM | muvi_payment |
| SSM_REGION | Hard-coded | **eu-central-1** (⚠ different from others!) |
| HYPERPAY_ACCESS_TOKEN | Secrets | (HyperPay payment) |
| CHECKOUT_SECRET_KEY | Secrets | (Checkout.com) |
| PAYFORT_SHA_REQUEST_PHRASE | Secrets | (PayFort HMAC) |
| TABBY_SECRET_KEY | Secrets | (Tabby BNPL) |

### Notification Service (gRPC port 7024)

| Variable | Source | Value/Purpose |
|----------|--------|---------------|
| GRPC_PORT | SSM | 7024 |
| DB_HOST | SSM | muvi-uat-notification.c5xohmlnlthz.eu-central-1.rds.amazonaws.com |
| DB_NAME | SSM | muvi_notification |
| ONESIGNAL_APP_ID | SSM | (push notifications) |
| ONESIGNAL_API_KEY | Secrets | (OneSignal auth) |
| SENDGRID_API_KEY | Secrets | (email sending) |
| SENDGRID_FROM_EMAIL | SSM | (sender address) |
| BRAZE_REST_ENDPOINT | SSM | https://rest.iad-06.braze.com |
| BRAZE_API_KEY | Secrets | (Braze marketing) |

### Website Service (port 3000, Next.js)

| Variable | Source | Value/Purpose |
|----------|--------|---------------|
| PORT | Hard-coded | 3000 |
| NEXT_PUBLIC_API_URL | Hard-coded | (Gateway API URL) |
| NODE_ENV | Hard-coded | production |

> ⚠️ Full task definition JSON files stored locally at `documentation/*-taskdef.json`. These contain actual secret ARNs — do NOT commit to git.

---

## 31. Known Architectural Issues & Technical Debt

### Critical Issues

#### 1. Cross-Region Database Latency (Severity: HIGH)
- **Problem:** ECS tasks run in me-central-1 (UAE) but all 7 databases are in eu-central-1 (Frankfurt)
- **Impact:** ~100-150ms added to EVERY database query. A typical API request makes 3-5 DB queries = 300-750ms overhead
- **Root Cause:** Databases were created in the vendor's Frankfurt region; ECS was moved to UAE but DBs were not
- **Fix:** Migrate all 7 RDS instances to me-central-1 using snapshot-restore
- **Effort:** 1 day (with 30-min downtime per DB)
- **Cost Impact:** Saves ~$46/mo in cross-region data transfer + eliminates latency

#### 2. Missing Services — F&B and Offer (Severity: HIGH)
- **Problem:** F&B (NestJS 9.4) and Offer (Go 1.24) services have no ECR repos, no task defs, no ECS services, no Cloud Map entries in UAT
- **Impact:** Cannot test food ordering, kiosk flow, promotions, vouchers, or student discounts
- **Fix:** Create ECR repos, build Docker images, register task defs, create ECS services, add Cloud Map entries
- **Effort:** 1-2 days
- **Dependencies:** Need F&B and Offer database schemas migrated

#### 3. Payment SSM_REGION Mismatch (Severity: MEDIUM)
- **Problem:** Payment service reads SSM parameters from eu-central-1, all other services from me-central-1
- **Impact:** Payment config changes in me-central-1 SSM are IGNORED; must be made in eu-central-1
- **Root Cause:** Hard-coded SSM_REGION in Payment task definition
- **Fix:** Update Payment task def to use me-central-1, ensure all SSM params exist in me-central-1

#### 4. S3_REGION Configuration Error (Severity: LOW)
- **Problem:** SSM `/uat/S3_REGION` is set to `eu-west-1` (Ireland) but `muvi-media-uat` bucket is in `eu-central-1` (Frankfurt)
- **Impact:** S3 SDK may use wrong endpoint, causing redirects or slightly higher latency
- **Fix:** Update SSM parameter to `eu-central-1`

#### 5. No CI/CD Pipelines (Severity: HIGH)
- **Problem:** Zero automated deployment pipelines in UAT. All deploys require manual ECS task definition updates via console
- **Impact:** 15-30 minutes per service deployment, error-prone, blocks rapid iteration
- **Fix:** GitHub Actions or CodePipeline for all 8 services
- **Effort:** 2 days

### Waste & Cleanup Opportunities

#### 6. Orphaned Aurora Cluster (Severity: LOW, Cost: $110/mo)
- **Resource:** `uatclusterdb` in me-central-1 with 2 instances (db.t3.medium)
- **Problem:** Not referenced by any ECS task definition or SSM parameter
- **Action:** Verify no usage → snapshot → delete

#### 7. Stopped temp-* RDS Instances (Severity: LOW, Cost: $5/mo storage)
- **Resources:** 6 stopped instances (`temp-muvi-uat-*`) in me-central-1
- **Problem:** Old copies from before Frankfurt migration. One has a "idetity" typo
- **Action:** Verify no needed data → final snapshot → delete

#### 8. Test Load Balancers (Severity: LOW, Cost: $54/mo)
- **Resources:** `agha-loadbalancer`, `sample-film-session-alb`, `sample-film-session-alb-v2`
- **Problem:** Test/experiment ALBs from old work, still incurring hourly charges
- **Action:** Verify no active targets → delete

#### 9. GitLab CI/CD Artifact Buckets (Severity: LOW)
- **Resources:** 20+ S3 buckets matching `muvi-*-gitlab`
- **Problem:** Old GitLab runner artifacts from before GitHub migration
- **Action:** Verify empty → delete

### Architecture Improvements

#### 10. Single-Region Consolidation
- Move ALL resources (ECS, RDS, Redis, ALB) to me-central-1
- Delete VPC peering connections
- Eliminate cross-region latency and data transfer costs
- **Impact:** Performance improvement + $50-100/mo savings

#### 11. Internal ALB for gRPC
- Production uses a separate Internal ALB for gRPC traffic between services
- UAT currently relies on Cloud Map (DNS-based) which is fine but less observable
- Consider Internal ALB if load testing reveals service discovery issues

#### 12. WAF for Load Testing
- Production has 2 WAF WebACLs protecting API and Website ALBs
- UAT has none — add at least basic rate limiting before load tests
- Cost: ~$6/mo

### Summary of Technical Debt Costs

| Issue | Monthly Waste | Fix Effort | Priority |
|-------|--------------|------------|----------|
| Cross-region latency | $46 + poor perf | 1 day | 🔴 Critical |
| Missing F&B/Offer | $0 (missing revenue testing) | 2 days | 🔴 Critical |
| No CI/CD | $0 (dev time waste) | 2 days | 🔴 High |
| Payment SSM mismatch | $0 (config risk) | 30 min | 🟡 Medium |
| S3_REGION wrong | $0 (minor perf) | 5 min | 🟢 Low |
| Orphaned Aurora | $110 | 5 min | 🟡 Medium |
| Stopped temp DBs | $5 | 5 min | 🟢 Low |
| Test ALBs | $54 | 10 min | 🟡 Medium |
| GitLab S3 buckets | ~$1 | 30 min | 🟢 Low |
| **TOTAL WASTE** | **~$216/mo** | **~6 days** | |

---

## 32. Production Infrastructure Detailed Inventory (Account 2: 011566070219)

### ECS Cluster: Muvi-Production (eu-central-1)

| Service | Tasks | CPU | Memory | Total vCPU | Total GB | Container Port |
|---------|-------|-----|--------|------------|----------|---------------|
| muvi-production-gateway-service | 8 | 2 vCPU | 4 GB | 16 | 32 | 3001 |
| muvi-production-website-service | 8 | 1 vCPU | 2 GB | 8 | 16 | 3000 |
| muvi-production-main-service | 6 | 2 vCPU | 8 GB | 12 | 48 | 7024 |
| muvi-production-fb-service | 5 | 2 vCPU | 4 GB | 10 | 20 | 7024 |
| muvi-production-identity-service | 3 | 1 vCPU | 2 GB | 3 | 6 | 7024 |
| muvi-production-payment-service | 3 | 1 vCPU | 4 GB | 3 | 12 | 7024 |
| muvi-production-notification-service | 2 | 1 vCPU | 2 GB | 2 | 4 | 7024 |
| muvi-production-offer-service | 2 | 0.5 vCPU | 1 GB | 1 | 2 | 7024 |
| muvi-production-cms-service | 2 | 0.5 vCPU | 1 GB | 1 | 2 | 3000 |
| **TOTAL** | **39** | | | **56 vCPU** | **142 GB** | |

> **Auto-scaling:** Most services scale 2-8 tasks based on CPU/memory thresholds. Gateway and Website scale up to 8 during peak hours (Thu-Sat evenings Saudi time).

### Aurora PostgreSQL Clusters (eu-central-1)

| Cluster | Engine | Instances | Writer Class | Readers | Proxy |
|---------|--------|-----------|-------------|---------|-------|
| muvi-production-main-cluster | PostgreSQL 15.4 | 2 | r6g.xlarge | 1× r6g.xlarge | ✓ r6g.xlarge |
| muvi-production-identity-cluster | PostgreSQL 15.4 | 3 | r6g.large | 2× r6g.large | ✓ r6g.large |
| muvi-production-payment-cluster | PostgreSQL 15.4 | 2 | r6g.large | 1× r6g.large | ✓ r6g.large |
| muvi-production-fb-cluster | PostgreSQL 15.4 | 2 | r6g.large | 1× r6g.large | ✓ r6g.large |
| muvi-production-notification-cluster | PostgreSQL 15.4 | 2 | r6g.large | 1× r6g.large | ✓ r6g.large |
| muvi-production-offer-cluster | PostgreSQL 15.4 | 2 | r6g.large | 1× r6g.large | ✓ r6g.large |
| muvi-production-temp-cluster | PostgreSQL 15 | 4 | r6g.xlarge | 3× r6g.xlarge | — |

> **RDS Proxy** is used for connection pooling. All services connect through their respective proxy endpoints instead of directly to Aurora.

### ElastiCache Redis (eu-central-1)

| Cluster | Node Type | Nodes | Mode | Purpose |
|---------|-----------|-------|------|---------|
| muvi-production-shared | r6g.large | 2 | Cluster | Shared session/cache |
| muvi-production-gateway | r6g.large | 2 | Cluster | Rate limiting |
| muvi-production-main | r6g.large | 2 | Cluster | Booking locks |
| muvi-production-identity | r6g.large | 2 | Cluster | OTP cache |
| muvi-production-payment | r6g.large | 2 | Cluster | Payment state |
| muvi-production-fb | r6g.large | 2 | Cluster | Menu cache |
| muvi-production-notification | r6g.large | 2 | Cluster | Queue state |
| muvi-production-offer | r6g.xlarge | 2 | Cluster | Promo cache |
| muvi-production-website | r6g.large | 2 | Cluster | SSR cache |
| **TOTAL** | | **18** | | |

### Load Balancers (eu-central-1)

| Name | Scheme | Listeners | Target Groups |
|------|--------|-----------|--------------|
| Muvi-Production-ALB | internet-facing | 80 (→443), 443 | gateway-tg, cms-tg |
| Muvi-Production-Internal-ALB | internal | 80 | main-tg, identity-tg, payment-tg, fb-tg, notification-tg, offer-tg |
| Muvi-Production-Website-ALB | internet-facing | 80, 443 | website-tg |

### CloudFront Distributions (9)

| Alias | Origin | Purpose |
|-------|--------|---------|
| api.muvicinemas.com | Internal ALB | Public API |
| app.muvicinemas.com | Website ALB | Website |
| cms.muvicinemas.com | S3 muvi-cms-production | CMS |
| media.muvicinemas.com | S3 muvi-media-production | Media CDN |
| kiosk.muvicinemas.com | S3 muvi-kiosk-production | Kiosk app |
| ewallet.muvicinemas.com | S3 muvi-ewallet-production | E-wallet portal |
| cdp.muvicinemas.com | S3 muvi-cdp-production | Customer data |
| + 2 internal | Various | Admin, monitoring |

### Lambda Functions (32, key ones)

| Function | Runtime | Trigger | Purpose |
|----------|---------|---------|---------|
| StopProduction | Node.js 18 | EventBridge (cron) | Stop non-critical at midnight |
| StartProduction | Node.js 18 | EventBridge (cron) | Start services at 8 AM |
| start-rds / stop-rds | Python 3.9 | EventBridge | DB scheduling |
| InvalidateCache | Node.js 18 | CodePipeline | CDN cache invalidation |
| sync-job | Node.js 18 | EventBridge (15 crons) | Vista film/session sync |
| ewallet-transactions-export | Node.js 18 | EventBridge (daily) | Finance CSV to S3 |
| datadog-forwarder | Python 3.9 | CloudWatch Logs | Log forwarding |
| + 25 utility functions | Various | Various | Misc automation |

### CodePipeline (18 pipelines)

| Pipeline | Source | Build | Deploy |
|----------|--------|-------|--------|
| muvi-production-gateway | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-main | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-identity | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-payment | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-fb | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-notification | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-offer | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-website | GitHub (main branch) | CodeBuild | ECS |
| muvi-production-cms | GitHub (main branch) | CodeBuild | S3 + CF invalidation |
| + 9 utility/migration pipelines | Various | | |

---

## 33. AWS CLI Quick Reference for Both Accounts

### Account Switching

```powershell
# Account 1 (In-House, UAT) — default profile
aws sts get-caller-identity
# → 739991759290, rehan.tariq@muvicinemas.com

# Account 2 (Production) — muvi-prod profile
aws sts get-caller-identity --profile muvi-prod
# → 011566070219

# Set region for Account 1 operations
$env:AWS_DEFAULT_REGION = "me-central-1"
```

### Common Discovery Commands

```powershell
# ECS — List services and tasks
aws ecs list-clusters --region me-central-1
aws ecs list-services --cluster Muvi-Cluster --region me-central-1
aws ecs describe-services --cluster Muvi-Cluster --services (aws ecs list-services --cluster Muvi-Cluster --query 'serviceArns' --output text --region me-central-1).Split() --region me-central-1

# RDS — List databases across regions
aws rds describe-db-instances --region me-central-1 --query 'DBInstances[].{ID:DBInstanceIdentifier,Class:DBInstanceClass,Status:DBInstanceStatus}' --output table
aws rds describe-db-instances --region eu-central-1 --query 'DBInstances[].{ID:DBInstanceIdentifier,Class:DBInstanceClass,Status:DBInstanceStatus}' --output table

# Redis
aws elasticache describe-cache-clusters --region me-central-1 --show-cache-node-info --query 'CacheClusters[].{ID:CacheClusterId,Node:CacheNodeType,Status:CacheClusterStatus}' --output table

# SSM — List all UAT parameters
aws ssm get-parameters-by-path --path /uat/ --recursive --with-decryption --region me-central-1 --query 'Parameters[].{Name:Name,Value:Value}' --output table

# Secrets Manager
aws secretsmanager list-secrets --region me-central-1 --query 'SecretList[].Name' --output table

# Production (read-only)
aws ecs list-services --cluster Muvi-Production --region eu-central-1 --profile muvi-prod
aws rds describe-db-clusters --region eu-central-1 --profile muvi-prod --query 'DBClusters[].{ID:DBClusterIdentifier,Engine:Engine,Status:Status}' --output table
```

### UAT Service Management

```powershell
# Force new deployment (rolling restart)
aws ecs update-service --cluster Muvi-Cluster --service muvi-gateway-service-mfnabtxa --force-new-deployment --region me-central-1

# Scale a service
aws ecs update-service --cluster Muvi-Cluster --service muvi-main-uat --desired-count 3 --region me-central-1

# View logs
aws logs tail /ecs/muvi-gateway-uat --since 1h --follow --region me-central-1

# Update SSM parameter
aws ssm put-parameter --name /uat/SOME_PARAM --value "new-value" --type String --overwrite --region me-central-1
```

### Stop/Start UAT (Cost Savings)

```powershell
# STOP all ECS services (set desired to 0)
$services = @("muvi-gateway-service-mfnabtxa","muvi-identity-uat","muvi-main-uat","muvi-payment-uat","muvi-notification-uat","muvi-website-uat")
foreach ($svc in $services) {
    aws ecs update-service --cluster Muvi-Cluster --service $svc --desired-count 0 --region me-central-1
    Write-Host "Stopped: $svc"
}

# START all ECS services
$counts = @{
    "muvi-gateway-service-mfnabtxa"=2; "muvi-identity-uat"=2; "muvi-main-uat"=2;
    "muvi-payment-uat"=2; "muvi-notification-uat"=2; "muvi-website-uat"=1
}
foreach ($entry in $counts.GetEnumerator()) {
    aws ecs update-service --cluster Muvi-Cluster --service $entry.Key --desired-count $entry.Value --region me-central-1
    Write-Host "Started: $($entry.Key) → $($entry.Value) tasks"
}

# STOP RDS in Frankfurt (saves ~$326/mo)
$dbs = @("muvi-uat-main","muvi-uat-identity","muvi-uat-payment","muvi-uat-fb","muvi-uat-notification","muvi-uat-offer")
foreach ($db in $dbs) {
    aws rds stop-db-instance --db-instance-identifier $db --region eu-central-1
    Write-Host "Stopping: $db"
}
```

---

## 34. AWS Ecosystem Dashboard & Control Panel

### Overview

A live-polling web dashboard at `documentation/aws-app/` that shows all UAE UAT infrastructure in real-time with ON/OFF control for switchable resources.

**Run:** `cd documentation/aws-app && node server.js` → opens at http://localhost:8888

### Architecture

| Component | File | Purpose |
|-----------|------|---------|
| Server | `server.js` | Node.js HTTP server, polls AWS CLI every 30s, serves REST API + static files |
| Dashboard UI | `index.html` | Top bar (master switch), phase bar, cost strip, card grid, detail overlay, confirmation modal |
| Styles | `css/dashboard.css` | Dark terminal theme, toggle switches, master switch variants, responsive |
| Live Logic | `js/dashboard.js` | Polling, card rendering, toggle handlers, master switch state, toasts |
| Static Fallback | `js/data.js` | Pre-built INFRA object — renders immediately while server boots |

### Master Switch (Top Bar)

A big button in the top bar that stops or starts ALL 4 switchable resources at once:

| State | Button | Color | Action |
|-------|--------|-------|--------|
| All running | SLEEP ALL | Red | Stops ECS → Proxies → Redis → Aurora (dependency order) |
| All stopped | WAKE ALL | Green | Starts Aurora → Redis → Proxies → ECS (dependency order) |
| Mixed | SLEEP/WAKE ALL | Amber | Toggles based on majority state |
| In progress | SLEEPING…/WAKING… | Blue pulse | Animated, disabled during action |

### Switchable Resources (~$1,193/mo total)

| Resource | Cost | Stop Method | Start Method |
|----------|------|-------------|-------------|
| `aurora` | $188/mo | `stop-db-cluster` | `start-db-cluster` |
| `rds-proxies` | $265/mo | Save config → `delete-db-proxy` ×6 | Recreate from `.saved-configs.json` |
| `redis` | $540/mo | Snapshot → `delete-replication-group` ×9 | Restore from snapshots |
| `ecs` | $200/mo | `update-service --desired-count 0` | Scale back to saved counts |

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/infra` | Live infrastructure data + switchable metadata |
| GET | `/api/actions` | Recent action log |
| POST | `/api/action/:resource/:action` | Trigger start/stop for a single resource |
| POST | `/api/action/all/stop` | Master SLEEP ALL — chains all 4 stops |
| POST | `/api/action/all/start` | Master WAKE ALL — chains all 4 starts |

### ⚠️ IMPORTANT: Updating the Dashboard When Adding New Phases

When a new infrastructure phase is completed (e.g., Phase 5 ECS, Phase 6 CI/CD, etc.), the dashboard **MUST** be updated to reflect the new resources. Here's what to update:

#### 1. Static Data — `js/data.js`

Update the `INFRA` object:
- **`phases` array** — mark the completed phase as `status: 'complete'` with its date
- **`cards` array** — update the relevant card's `status`, `stats`, `table.rows`, and `detail` sections
- **`summary`** — update `totalCost`, `activeResources`, `pendingPhases` counts

#### 2. Live Polling — `server.js`

- **`pollAWS()` function** — add AWS CLI queries for new resources (e.g., new ECS services, new target groups)
- **`buildCards()` function** — update card-building logic to include new resource data
- **`SWITCHABLE` object** — if the new phase adds switchable resources, add them with label, cost, descriptions, and warnings
- **`ACTION_MAP`** — add start/stop handler functions for any new switchable resources
- **Batch grouping** — add new AWS queries to the appropriate Promise.all batch (Batch 1 or Batch 2) for parallel polling

#### 3. Dashboard UI — `js/dashboard.js`

- **`SWITCHABLE_IDS` array** — add new resource IDs if they're switchable
- **`getMasterState()`** — automatically picks up new IDs from `SWITCHABLE_IDS`
- **`updateMasterSwitch()`** — total cost auto-calculates from switchableMeta

#### 4. Phase Bar

The phase bar auto-renders from `data.phases` — just update the status in `js/data.js` and the server's phase-building logic.

#### Quick Checklist for Each New Phase

```
□ Update js/data.js — phases array (status → 'complete', add date)
□ Update js/data.js — cards array (new stats, table rows, detail sections)
□ Update js/data.js — summary totals (cost, active count, pending count)
□ Update server.js — pollAWS() with new AWS CLI queries
□ Update server.js — buildCards() with new card data
□ Update server.js — SWITCHABLE + ACTION_MAP (if resource is switchable)
□ Update dashboard.js — SWITCHABLE_IDS (if resource is switchable)
□ Test: node server.js → verify card appears with correct live data
□ Test: toggle switch works (if switchable)
□ Test: master switch still shows correct count and total cost
```

---

*Document updated: February 26, 2026 — Contains data from all documentation files + actual AWS infrastructure discovery across both accounts (739991759290 + 011566070219)*
*Total infrastructure verified: 2 accounts, 3 regions, 15 ECS services, 24+ databases, 10 Redis clusters, 7 ALBs, 21+ CloudFront distributions, 55+ S3 buckets, 51 SSM parameters, ~30 secrets*
