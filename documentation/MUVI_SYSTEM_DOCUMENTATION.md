# MUVI Cinemas — Complete System Knowledge Base

> **Last Updated:** February 15, 2026
> **Purpose:** The single source of truth for every fact about the Muvi Cinemas platform — architecture, code, infrastructure, integrations, operations, costs, and transition status.
> **Audience:** AI agent, engineering team, CTO, CIO — anyone who needs to understand or operate this system.

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
- **AWS Account:** `739991759290` (shared for UAE setup)
- **GitHub Org:** `muvicinemas` (in-house repos)
- **Vendor GitHub Org:** `AlphaApps`

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

## 15. AWS Infrastructure — Frankfurt UAT (Vendor)

**Region:** eu-central-1 (Frankfurt) | **Account:** Vendor-managed (Alpha Apps)

### ECS Fargate (8 services, 10 tasks)

| Service | CPU | Memory | Replicas | Datadog Sidecar | Monthly |
|---------|-----|--------|----------|----------------|---------|
| muvi-gateway | 0.5 vCPU | 1 GB | 2 | ✓ | $32 |
| muvi-main | 0.5 vCPU | 1 GB | 1 | ✓ | $16 |
| muvi-identity | 0.5 vCPU | 1 GB | 1 | ✓ | $16 |
| muvi-payment | 0.5 vCPU | 1 GB | 1 | ✓ | $16 |
| muvi-notification | 0.5 vCPU | 1 GB | 1 | ✓ | $16 |
| muvi-fb | **2 vCPU** | **4 GB** | 1 | ✓ | **$64** |
| muvi-offer | 0.5 vCPU | 1 GB | 1 | ✓ | $16 |
| muvi-website | 0.5 vCPU | 1 GB | 1 | ✓ | $16 |
| **Total** | | | **10** | | **~$193** |

### Auto-Scaling Configuration

| Service | Normal | Min | Max | Trigger | Status |
|---------|--------|-----|-----|---------|--------|
| gateway | 2 | 0 | 5 | CPU>80% OR Mem>80% OR >8000 req/target | **ON** |
| website | 1 | 0 | 5 | CPU>60% OR Mem>60% OR >8000 req/target | **ON** |
| notification | 1 | 0 | 1 | CPU>60% (max=1, no real scaling) | Limited |
| identity | 1 | 0 | 5 | Registered but no active policies | Unclear |
| main | 1 | — | — | — | **NO** |
| payment | 1 | — | — | — | **NO** |
| fb | 1 | — | — | — | **NO** |
| offer | 1 | — | — | — | **NO** |

- Cooldown: 300s (5 min) between scale-down events
- Container start time: ~30–60 seconds
- UAT min=0 → scale-to-zero possible → 30-60s cold start at 3AM

### Networking & Other

| Service | Details | Monthly |
|---------|---------|---------|
| ALB × 3 | Muvi-UAT, Internal-UAT, Website-UAT | $66 |
| NAT Gateway × 1 | Outbound to Vista, Checkout.com | $35–50 |
| CloudFront × 12 | CDN distributions (API, website, CMS, media, etc.) | $5–10 |
| EC2 Jump Station × 1 | t3.small (1 running, 4 stopped) | $15 |
| WAF | API-WAF on ALB | $10 |
| Lambda × 10 | Datadog forwarder, cache invalidation, RDS start/stop, etc. | $1–2 |
| CodePipeline × 18 | $1/active pipe | $18 |
| CodeBuild | ~500 build min/mo | $3 |
| S3 × 30+ | Media, CMS, artifacts, logs | $10–30 |
| Cloud Map | uat.internal (DNS_PRIVATE) | $1 |
| Secrets Manager + SSM | ~10 secrets + 56 params | $4 |

### Lambda Functions

| Function | Purpose |
|----------|---------|
| StopUAT | Stops RDS/ECS at night (cost savings) |
| start-rds / stop-rds | Start/stop RDS on schedule |
| sync-job | Vista data sync |
| InvalidateCache | Clears CloudFront cache |
| ewallet-transactions-export | Wallet data export |
| Datadog Forwarder | Ships logs to Datadog |

---

## 16. AWS Infrastructure — UAE UAT (Our Setup)

**Region:** me-central-1 (UAE) | **Account:** 739991759290

### ECS Fargate (6 services, 11 tasks — NO F&B, NO Offer)

| Service | CPU | Memory | Replicas | Monthly |
|---------|-----|--------|----------|---------|
| muvi-gateway | 0.5 vCPU | 1 GB | 2 | $35 |
| muvi-main | 0.5 vCPU | 1 GB | 2 | $35 |
| muvi-identity | 0.5 vCPU | 1 GB | 2 | $35 |
| muvi-payment | 0.5 vCPU | 1 GB | 2 | $35 |
| muvi-notification | 0.5 vCPU | 1 GB | 2 | $35 |
| muvi-website | 0.5 vCPU | 1 GB | 1 | $17 |
| **Total** | | | **11** | **~$192** |

### RDS (8 databases — includes Aurora cluster that Frankfurt doesn't have)

| Database | Instance | Storage | Monthly |
|----------|----------|---------|---------|
| temp-muvi-uat-main | db.t3.micro | 2,000 GB gp2 | $240 |
| temp-muvi-uat-fb | db.t3.medium | 200 GB gp3 | $56 |
| temp-muvi-uat-idetity (**typo!**) | db.t3.micro | 200 GB gp2 | $30 |
| temp-muvi-uat-payment | db.t3.micro | 200 GB gp2 | $30 |
| temp-muvi-uat-notification | db.t3.micro | 200 GB gp2 | $30 |
| temp-muvi-uat-offer | db.t3.micro | 20 GB gp2 | $12 |
| uatclusterdb-instance-1 (Aurora) | db.t3.medium | Aurora | $55 |
| uatclusterdb-instance-1-b (Aurora replica) | db.t3.medium | Aurora | $55 |
| **Total** | | | **~$508** |

**Issues:**
1. All DBs have "temp-" prefix — should be cleaned up
2. "idetity" typo in DB name
3. Aurora cluster ($90/mo) doesn't exist in Frankfurt — evaluate if needed

### Other UAE Resources

| Service | Details | Monthly |
|---------|---------|---------|
| Redis × 1 | cache.t3.small | $27 |
| ALB × 4 | Muvi-UAT + 3 others (agha-lb, sample-film ×2) | $88 |
| NAT Gateway × 3 | **Should be 1** — $105-150/mo waste | $105–150 |
| CloudFront × 1 | No domain alias configured | $2–5 |
| Cloud Map | uat.internal | $1 |

**UAE Grand Total:** ~$950–998/mo → Optimizable to **~$630–750/mo**

---

## 17. Infrastructure Gap Analysis (Frankfurt vs UAE)

**Overall status: ~60% complete** (as of February 12, 2026)

### Score Cards

| Status | Count |
|--------|-------|
| ✓ Components Matched | **11** |
| ◉ Acceptable Differences | **4** |
| ⚠ Partially Done | **5** |
| ✗ Missing / Mandatory | **7** |

### ECS Services Gap

| Service | Frankfurt | UAE | Status |
|---------|-----------|-----|--------|
| Gateway | 2 containers + ALB TG | 2 containers + ALB TG | ✓ Match |
| Main | 1 container + ALB TG | 2 containers, **no ALB** | ⚠ No ALB TG |
| Identity | 1 container + ALB TG | 2 containers, **no ALB** | ⚠ No ALB TG |
| Payment | 1 container + ALB TG | 2 containers, **no ALB** | ⚠ No ALB TG |
| F&B | 1 container (2048/4096) + ALB TG | **MISSING** | ✗ Mandatory |
| Notification | 1 container + ALB TG | 2 containers, **no ALB** | ⚠ No ALB TG |
| Offer | 1 container, internal | **MISSING** | ✗ Mandatory |
| Website | 1 container + ALB TG | 1 container + ALB TG | ✓ Match |

### Load Balancers Gap

| LB | Frankfurt | UAE | Status |
|----|-----------|-----|--------|
| Public API ALB | Muvi-UAT (internet-facing) | Muvi-UAT (internet-facing) | ✓ |
| Internal ALB | Muvi-Internal-UAT | **MISSING** | ✗ Mandatory (gRPC) |
| Website ALB | Muvi-Website-UAT | **MISSING** | Can share public ALB |

### CloudFront & WAF Gap

| Component | Frankfurt | UAE | Status |
|-----------|-----------|-----|--------|
| API CloudFront | api.uat.muvicinemas.com → ALB | 1 unnamed (no domain alias) | ⚠ No domain |
| Website CloudFront | app.uat.muvicinemas.com → Website ALB | **MISSING** | ✗ |
| CMS CloudFront | cms.uat.muvicinemas.com → S3 | **MISSING** | ✗ |
| Media CloudFront | → muvi-media-uat S3 | **MISSING** | ⚠ Needed later |
| WAF | API-WAF on ALB | **MISSING** | ✗ Mandatory (~$6/mo) |

### CI/CD Gap
- Frankfurt: **18 pipelines** (GitHub → CodeBuild → ECS; push to "uat" branch = auto-deploy)
- UAE: **0 app pipelines** (all deploys manual via AWS Console, 15-30 min/service)

### ECR Gap

| Repo | Frankfurt | UAE |
|------|-----------|-----|
| muvi-gateway | ✓ | muvi-gateway-uat ✓ |
| muvi-main | ✓ | muvi-main-uat ✓ |
| muvi-identity | ✓ | muvi-identity-uat ✓ |
| muvi-payment | ✓ | muvi-payment-uat ✓ |
| muvi-fb | ✓ | **MISSING** ✗ |
| muvi-notification | ✓ | muvi-notification-uat ✓ |
| muvi-offer | ✓ | **MISSING** ✗ |
| muvi-website | ✓ | muvi-website-uat ✓ |

### Lambda Gap (all missing in UAE)

| Function | Priority | Reason |
|----------|----------|--------|
| StopUAT / start-rds / stop-rds | **High** | Saves ~$150+/mo |
| InvalidateCache | Medium | After CloudFront setup |
| sync-job | Medium | Only if Vista sync needed in UAE |
| Datadog Forwarder | Medium | Only after Datadog setup |
| ewallet-transactions-export | Low | Finance reporting |

### Execution Roadmap

| Week | Tasks |
|------|-------|
| Week 1 | Create F&B + Offer (ECR repos, task defs, ECS services) + Internal ALB + target groups |
| Week 2 | CloudFront + WAF + DNS (domain aliases, distributions, Route 53) |
| Week 3 | CI/CD (GitHub Actions for all 8 services) |
| Week 4 | Cost optimization (StopUAT/StartUAT Lambdas, SSM audit, delete Aurora, fix naming, Datadog) |

### Cost Comparison After Completion

| Resource | Frankfurt | UAE Current | UAE After Completion |
|----------|-----------|-------------|---------------------|
| ECS Fargate | ~$150 | ~$110 | ~$170 |
| RDS | ~$290 | ~$180 | ~$90 |
| Redis | ~$100 | ~$25 | ~$25 |
| ALB | ~$54 | ~$18 | ~$36 |
| CloudFront | ~$15 | ~$2 | ~$10 |
| WAF | ~$8 | $0 | ~$8 |
| NAT + misc | ~$40 | ~$40 | ~$40 |
| **Total** | **~$657/mo** | **~$375/mo** | **~$379/mo** |
| With Stop/Start | — | — | **~$230/mo** |

**Key insight:** UAE can match Frankfurt functionality at **35–58% of cost**.

---

## 18. AWS Cost Analysis

### Total Platform Cost Summary

| Environment | Monthly Cost | Basis |
|-------------|-------------|-------|
| Frankfurt UAT (Vendor) | ~$1,100 (AWS) + $200-400 (Datadog) = **~$1,250–$1,500** | Exact AWS data |
| Production (Vendor, separate account) | **~$2,700–$4,300** | Estimated ±30% |
| UAE UAT (Our setup, current) | **~$950–$998** | Exact AWS data |
| UAE UAT (after optimization) | **~$630–$750** | Projected |

### Alpha Apps Total Monthly (Vendor's bill)

| Item | Monthly |
|------|---------|
| AWS Frankfurt UAT | $1,050–$1,100 |
| AWS Production | $2,230–$3,520 |
| Datadog Non-prod | $200–$400 |
| Datadog Production | $500–$800 |
| Sentry | $26–$80 |
| GitHub | $20–$50 |
| Domain & DNS | $5–$10 |
| **Total** | **$4,030–$5,960/mo** |
| **Annual** | **$48K–$72K/year** |
| With RI/Savings Plans | $2,800–$3,500/mo ($34K–$42K/yr) |

### Peak Traffic Cost Impact

| Scenario | Extra Tasks | Duration | Extra Cost |
|----------|------------|----------|-----------|
| Busy Thursday night | 3–5 extra | ~4 hours | ~$0.35 |
| Blockbuster release night | 8–10 extra | ~5 hours | ~$0.90 |
| Monthly average | ~8 busy nights | ~35 extra hours | ~$5–8 |

### Cost Optimization Techniques

1. **Scale-to-Zero at Night** — saves ~30–40% on ECS
2. **Single-AZ Databases** — saves ~50% on RDS
3. **Burstable t3 Instances** — saves ~60% vs m5/r5
4. **Stopped EC2** — 4 of 5 stopped in Frankfurt → saves ~$45/mo
5. **RDS Schedule** (DISABLED but available) — could save ~$15/day
6. **Small Container Sizes** — 0.5 vCPU / 1 GB sufficient for most services
7. **Clean up main_db** — 2TB in UAT is excessive, cleanup saves ~$200/mo
8. **Reduce NAT Gateways** — UAE has 3, should be 1, saves ~$70+/mo
9. **Delete Aurora cluster** — UAE-only ($90/mo), not in Frankfurt reference

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
| `MUVI_SYSTEM_DOCUMENTATION.md` | Markdown | **This file** — complete knowledge base | Manual |
| `CICD-SETUP-PLAN.md` | Markdown | CI/CD pipeline implementation plan (5 phases) | Manual |
| `api.html` | HTML | Interactive API reference — 481 endpoints, "Try it" buttons | `generate-api-docs.js` |
| `api-storybook.html` | HTML | Narrative API walkthrough — 24 chapters, 284 steps | `generate-api-storybook.js` |
| `backend-audit.html` | HTML | Backend audit — 23 integrations, 15 cron jobs, 6 queues | `generate-backend-audit.js` |
| `aws-cost-analysis.html` | HTML | AWS cost breakdown — Frankfurt, Production, UAE | Manual |
| `infra-gap-report.html` | HTML | Frankfurt vs UAE gap analysis — 60% complete | Manual |
| `MUVI_Takeover_Plan_CIO.html` | HTML | 8-week CIO transition plan | Manual |
| `generate-api-docs.js` | Script | Generates api.html from Gateway controller source code | — |
| `generate-api-storybook.js` | Script | Generates api-storybook.html with narrative content | — |
| `generate-backend-audit.js` | Script | Generates backend-audit.html from hardcoded audit data | — |

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

*Document generated: February 15, 2026 — Contains data from all 10 documentation files + actual codebase analysis*
