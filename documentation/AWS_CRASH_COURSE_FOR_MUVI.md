# AWS Crash Course for Muvi Cinemas

> **Audience**: Developer with zero AWS experience  
> **Goal**: Understand every service, why it exists, and replicate in UAT within 1 week  
> **Prerequisites**: AWS CLI configured (`--profile muvi-prod`), VS Code + Copilot

---

## How to Read This Guide

Each service has:
- **What it is** — plain English, no jargon
- **Why Muvi uses it** — the business reason
- **Real-world analogy** — something familiar
- **Hands-on command** — run it yourself to see it live
- **What you need for UAT** — stripped-down version

---

## Table of Contents

1. [The Big Picture — How a User Request Flows](#1-the-big-picture)
2. [VPC — The Private Network](#2-vpc--your-private-network)
3. [Subnets — Rooms in the Building](#3-subnets--rooms-in-the-building)
4. [NAT Gateway — The Receptionist's Phone](#4-nat-gateway)
5. [Security Groups — Door Locks](#5-security-groups--door-locks)
6. [ECR — Docker Image Storage](#6-ecr--docker-image-storage)
7. [ECS Fargate — Running the Containers](#7-ecs-fargate--running-the-containers)
8. [ALB — Traffic Director](#8-alb--the-traffic-director)
9. [Target Groups — ALB's Address Book](#9-target-groups--albs-address-book)
10. [CloudFront — Global CDN](#10-cloudfront--the-global-speed-boost)
11. [WAF — The Security Guard](#11-waf--the-security-guard)
12. [Route 53 — DNS / Phone Book](#12-route-53--the-phone-book)
13. [ACM — SSL Certificates](#13-acm--ssl-certificates)
14. [Aurora PostgreSQL — The Databases](#14-aurora-postgresql--the-databases)
15. [RDS Proxy — Database Connection Pooler](#15-rds-proxy--the-database-bouncer)
16. [ElastiCache Redis — Fast Temporary Storage](#16-elasticache-redis--the-sticky-notes)
17. [S3 — File Storage](#17-s3--the-file-cabinet)
18. [Lambda — Serverless Functions](#18-lambda--the-interns)
19. [EventBridge — The Alarm Clock](#19-eventbridge--the-alarm-clock)
20. [Secrets Manager — The Safe](#20-secrets-manager--the-safe)
21. [SSM Parameter Store — The Config File](#21-ssm-parameter-store--the-config-file)
22. [CodePipeline — The Assembly Line](#22-codepipeline--the-assembly-line)
23. [CloudWatch — The CCTV System](#23-cloudwatch--the-cctv-system)
24. [Cloud Map / Service Discovery — Internal GPS](#24-cloud-map--internal-gps)
25. [VPC Endpoints — Secret Tunnels](#25-vpc-endpoints--secret-tunnels)
26. [Step Functions — The Workflow Manager](#26-step-functions--the-workflow-manager)
27. [Auto Scaling — The Smart Thermostat](#27-auto-scaling--the-smart-thermostat)
28. [IAM — The Permission System](#28-iam--who-can-do-what)

---

## 1. The Big Picture

Before diving into individual services, here's what happens when someone opens muvicinemas.com and books a ticket:

```
User's Phone/Browser
       │
       ▼
[Route 53] — "What IP is muvicinemas.com?" → answers with CloudFront IP
       │
       ▼
[CloudFront] — Closest edge server (Dubai, Riyadh, etc.)
       │         Checks WAF rules → blocks bots/attacks
       │         Has cached content? → return immediately
       │         No cache? → forward to origin ▼
       │
       ▼
[ALB: Muvi-Prod] — Internet-facing load balancer
       │              Receives HTTPS request on port 80
       │              (CloudFront already terminated SSL)
       │
       ▼
[ECS: gateway] — NestJS API Gateway container (port 3001)
       │            Validates JWT token (from Redis)
       │            Routes request to correct microservice
       │            Uses gRPC to call internal services ▼
       │
       ▼
[ALB: Muvi-Microservices-Prod] — INTERNAL load balancer
       │                           Only accessible inside VPC
       │                           Routes by port: 5002=main, 5003=payment, etc.
       │
       ├──► [ECS: main-grpc :5002] ──► [RDS Proxy] ──► [Aurora: main DB]
       │         │                                        (db.r5.2xlarge)
       │         └──► [Redis: main] (seat locks, Bull queues)
       │
       ├──► [ECS: payment-grpc :5003] ──► [RDS Proxy] ──► [Aurora: payment DB]
       │         │
       │         └──► [Redis: payment] (payment events pub/sub)
       │
       ├──► [ECS: identity-grpc :5005] ──► [RDS Proxy] ──► [Aurora: identity DB]
       │         │
       │         └──► [Redis: identity] (OTP codes, JWT sessions)
       │
       └──► [ECS: notification-grpc :5007] ──► [Aurora: notification DB]
                  │
                  └──► [Redis: notification] (push notification queues)
```

**Key insight**: Everything flows through the **gateway**. The gateway is the only service that talks to the internet. All other services are hidden behind an internal load balancer.

---

## 2. VPC — Your Private Network

### What it is
A **Virtual Private Cloud** is your own isolated section of AWS. Think of it as renting an entire building in a business park. Nobody else can see inside. You control who enters and leaves.

### Why Muvi uses it
All 9 microservices, 6 databases, and 9 Redis clusters need to talk to each other privately. You don't want your database accessible from the internet.

### Muvi's VPC
```
Name: Muvi-VPC
CIDR: 10.230.0.0/16 → gives you 65,536 IP addresses
VPC ID: vpc-078c1286f49e3383e
```

### Hands-on: See it yourself
```powershell
aws ec2 describe-vpcs --profile muvi-prod --query "Vpcs[?Tags[?Value=='Muvi-VPC']].[CidrBlock,VpcId]" --output text
```

### What "CIDR" means
`10.230.0.0/16` means:
- First two numbers are fixed: `10.230.x.x`
- Last two numbers can be anything: `10.230.0.0` to `10.230.255.255`
- That's 65,536 possible addresses for your services

### For UAT
Create one VPC in me-central-1 with the same or different CIDR (e.g., `10.240.0.0/16`).

---

## 3. Subnets — Rooms in the Building

### What it is
Subnets divide your VPC into smaller sections, like rooms in a building. Each room has a purpose and different access rules.

### Muvi's Layout (3 tiers × 3 availability zones)

```
                    AZ-a              AZ-b              AZ-c
                ┌──────────┐     ┌──────────┐     ┌──────────┐
PUBLIC          │ 10.230.1 │     │ 10.230.2 │     │ 10.230.3 │
(ALBs, NAT GW) │  .0/24   │     │  .0/24   │     │  .0/24   │
                └──────────┘     └──────────┘     └──────────┘
                ┌──────────┐     ┌──────────┐     ┌──────────┐
NAT/PRIVATE     │ 10.230.4 │     │ 10.230.5 │     │ 10.230.6 │
(ECS tasks)     │  .0/24   │     │  .0/24   │     │  .0/24   │
                └──────────┘     └──────────┘     └──────────┘
                ┌──────────┐     ┌──────────┐     ┌──────────┐
PRIVATE         │ 10.230.7 │     │ 10.230.8 │     │ 10.230.9 │
(RDS, Redis)    │  .0/24   │     │  .0/24   │     │  .0/24   │
                └──────────┘     └──────────┘     └──────────┘
```

### Why 3 tiers?
| Tier | Can reach internet? | Can internet reach it? | What lives here |
|---|:---:|:---:|---|
| **Public** | Yes | Yes | Load balancers, NAT Gateway |
| **NAT** (also called "app tier") | Yes (via NAT GW) | **No** | ECS containers (your code) |
| **Private** | **No** | **No** | Databases, Redis |

### Why 3 availability zones?
AZs are physically separate data centers. If AZ-a catches fire, AZ-b and AZ-c keep running. Muvi uses `eu-central-1a`, `eu-central-1b`, `eu-central-1c`.

### Hands-on
```powershell
# See all subnets with their names and tiers
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-078c1286f49e3383e" --profile muvi-prod --query "Subnets[*].[Tags[?Key=='Name']|[0].Value,CidrBlock,AvailabilityZone]" --output table
```

### For UAT
Same layout. UAE region (me-central-1) has 3 AZs. Use 2 minimum for load testing credibility.

---

## 4. NAT Gateway

### What it is
A **NAT Gateway** lets your private containers (ECS) access the internet (to call Vista API, HyperPay, SendGrid, etc.) **without** being directly reachable from the internet.

### Real-world analogy
Your office has no front door (private subnet). But the receptionist on the ground floor (public subnet) can make calls on your behalf. Outside callers can't reach your desk directly.

### Muvi's setup
```
NAT GW: nat-084762c0476c4fe74
Public IP: 18.158.143.26 ← This is the IP that Vista, HyperPay etc. see when Muvi calls them
Location: Public-c subnet (AZ-c)
```

### Why only 1?
Cost savings. Each NAT Gateway costs ~$35/month + $0.045/GB data transfer. Having one per AZ would triple the cost. Trade-off: if AZ-c fails, all outbound internet stops.

### Hands-on
```powershell
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-078c1286f49e3383e" --profile muvi-prod --query "NatGateways[*].[NatGatewayId,NatGatewayAddresses[0].PublicIp,State]" --output table
```

### For UAT
Create 1 NAT Gateway. Same trade-off.

---

## 5. Security Groups — Door Locks

### What it is
A security group is a **firewall** attached to a specific resource (container, database, Redis). It controls which traffic is allowed in and out.

### How they work
- **Inbound rules**: who can send traffic TO this resource
- **Outbound rules**: where can this resource send traffic TO
- Default: all outbound allowed, all inbound blocked
- Rules reference **other security groups** (not just IPs)

### Muvi's pattern (chained security groups)
```
Internet → [ALB SG: allows HTTP/HTTPS from 0.0.0.0/0]
                │
                ▼ (ALB forwards to ECS)
           [ECS Gateway SG: allows traffic FROM ALB SG on port 3001]
                │
                ▼ (Gateway calls internal ALB)
           [Internal ALB SG: allows traffic FROM ECS SGs on port 5002-5007]
                │
                ▼ (Internal ALB forwards to microservices)
           [ECS Main SG: allows traffic FROM Internal ALB SG]
                │
                ▼ (Microservice queries database via proxy)
           [RDS Proxy SG: allows traffic FROM ECS Main SG on port 5432]
                │
                ▼ (Proxy connects to Aurora)
           [RDS SG: allows traffic FROM Proxy SG on port 5432]
```

Each layer only trusts the layer above it. The database can ONLY be reached by the proxy, which can ONLY be reached by the ECS container.

### Hands-on
```powershell
# See the Gateway ECS security group rules
aws ec2 describe-security-groups --group-ids sg-03400c50a0a0bc1f3 --profile muvi-prod --query "SecurityGroups[*].IpPermissions[*].{Port:FromPort,Source:UserIdGroupPairs[0].GroupId}" --output table
```

### For UAT
Mirror the same chain pattern. This is the most tedious part — you'll create ~20 security groups with cross-references.

---

## 6. ECR — Docker Image Storage

### What it is
**Elastic Container Registry** = Docker Hub but private and inside your AWS account. It stores your Docker images (the packaged application code).

### Why Muvi uses it
Every microservice is built into a Docker image. When ECS needs to run a container, it pulls the image from ECR.

### Muvi's repositories (8)

| Repository | What's inside |
|---|---|
| muvi-gateway | NestJS API gateway |
| muvi-identity | Auth, OTP, users |
| muvi-main | Films, bookings, cinemas, orders |
| muvi-payment | HyperPay, PayFort, wallets |
| muvi-fb | Food & beverage |
| muvi-notification | Push, email, SMS |
| muvi-offer | Go service: promotions, vouchers |
| muvi-website | Next.js frontend |

### Hands-on
```powershell
# List all repos and how many images each has
$repos = aws ecr describe-repositories --profile muvi-prod --query "repositories[*].repositoryName" --output text
foreach ($r in $repos -split "`t") {
    $count = aws ecr list-images --repository-name $r --profile muvi-prod --query "imageIds | length(@)" --output text
    Write-Host "$r : $count images"
}
```

### For UAT
Create 8 identical ECR repos in your UAT account. Push the same Docker images (or build fresh from your Git repos).

---

## 7. ECS Fargate — Running the Containers

### What it is
**ECS** (Elastic Container Service) runs your Docker containers. **Fargate** means AWS manages the servers — you don't pick an EC2 instance, you just say "give me 1 vCPU and 2 GB RAM" and it runs.

### Key concepts

| Term | What it means | Analogy |
|---|---|---|
| **Cluster** | A logical group of services | A department in a company |
| **Service** | Maintains N copies of a task | "Always keep 7 gateway servers running" |
| **Task** | One running container (or group) | One actual server process |
| **Task Definition** | The recipe for a task | Dockerfile + env vars + CPU/memory specs |

### Muvi's services

```
Cluster: Muvi-Production
│
├── gateway (7 tasks)         ← the front door, takes all HTTP requests
│     1 vCPU, 2 GB            ← handles rate limiting, JWT validation, routing
│
├── identity-grpc (7 tasks)   ← user registration, login, OTP
│     1 vCPU, 2 GB            ← why 7? gets called on EVERY authenticated request
│
├── main-grpc (7 tasks)       ← the big one: films, cinemas, bookings, orders
│     4 vCPU, 8 GB ⚡         ← biggest because it handles seat reservation (heavy)
│
├── website (5 tasks)          ← Next.js server-side rendering
│     1 vCPU, 2 GB            ← serves the muvicinemas.com pages
│
├── payment-grpc (3 tasks)    ← payment processing (HyperPay, checkout)
│     1 vCPU, 2 GB            ← fewer tasks because payments are less frequent
│
├── offer-muvi (3 tasks)      ← Go service: promotions, vouchers, student discounts
│     2 vCPU, 4 GB            ← Go needs less memory but they over-provisioned
│
├── fb-muvi (3 tasks)         ← food & beverage: menus, cart, kiosk orders
│     2 vCPU, 4 GB            ← separate from main because it uses NestJS 9.4
│
├── notification-grpc (2 tasks) ← sends push/email/SMS via OneSignal/SendGrid
│     1 vCPU, 2 GB            ← least tasks because sending is async (queued)
│
└── ticket (2 tasks) ⚠️       ← clone of main-grpc, same Docker image
      1 vCPU, 2 GB            ← dedicated to ticket validation/scanning
```

### Why each service exists

**Gateway** — Single entry point. Without it, you'd expose 6 different URLs to the internet. Gateway validates tokens, applies rate limiting (100 req/60s), and routes to the right service.

**Identity** — Handles login, registration, OTP verification. Called on every authenticated request to validate JWT tokens. High traffic = 7 replicas.

**Main** — The core business logic. Films, sessions, seats, bookings. Needs 4 vCPU / 8 GB because seat reservation involves locking seats in Redis + database writes + Vista API calls.

**Website** — Server-side rendered Next.js. Generates HTML on the server for SEO and initial page load speed.

**Payment** — Isolated because payment failures should never crash the booking flow. Handles 3 payment gateways (HyperPay, PayFort, Checkout.com) + Tabby (buy now pay later).

**F&B** — Separated because it runs NestJS 9.4 (other services use 8.4). Has its own kiosk flow that's independent of cinema bookings.

**Offer** — Written in Go (not TypeScript) for performance. Handles promo code validation which needs to be fast.

**Notification** — Low task count because it's async. Main/Payment put messages on a Redis Bull queue, Notification picks them up and sends via OneSignal/SendGrid/Unifonic.

**Ticket** — Mystery service. Uses the same `muvi-main` Docker image but has its own task definition. Likely handles ticket validation at cinema entry (separate scaling from main booking flow).

### Hands-on: Inspect a service
```powershell
# See all services and their status
aws ecs describe-services --cluster Muvi-Production --services gateway identity-grpc main-grpc website payment-grpc offer-muvi fb-muvi notification-grpc ticket --profile muvi-prod --query "services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount,CPU:deployments[0].networkConfiguration.awsvpcConfiguration.subnets[0]}" --output table

# See what a task definition looks like (the "recipe")
aws ecs describe-task-definition --task-definition muvi-gateway:169 --profile muvi-prod --query "taskDefinition.{CPU:cpu,Memory:memory,Containers:containerDefinitions[*].name,Image:containerDefinitions[0].image}" --output json
```

### For UAT
Same 8 services (skip `ticket`), but each with **1 task** and minimum CPU/memory. Total: ~4.5 vCPU instead of 66 vCPU.

---

## 8. ALB — The Traffic Director

### What it is
An **Application Load Balancer** receives incoming HTTP/HTTPS requests and forwards them to the right ECS container. If a container is unhealthy, the ALB stops sending it traffic.

### Why Muvi needs 3 ALBs

```
ALB #1: Muvi-Prod (internet-facing)
├── Purpose: API traffic
├── Receives: HTTP:80 from CloudFront
├── Forwards to: ECS gateway (port 3001)
└── DNS: Muvi-Prod-1403725330.eu-central-1.elb.amazonaws.com

ALB #2: Muvi-Website-ALB (internet-facing)
├── Purpose: Website traffic
├── Receives: HTTP:80 from CloudFront
├── Forwards to: ECS website (port 80)
└── DNS: Muvi-Website-ALB-1113256437.eu-central-1.elb.amazonaws.com

ALB #3: Muvi-Microservices-Prod (INTERNAL)
├── Purpose: gRPC communication between services
├── NOT accessible from internet
├── Listens on 6 ports, one per microservice:
│   ├── HTTPS:5002 → main-grpc
│   ├── HTTPS:5003 → payment-grpc
│   ├── HTTPS:5004 → fb-muvi
│   ├── HTTPS:5005 → identity-grpc
│   ├── HTTPS:5006 → offer-muvi
│   └── HTTPS:5007 → notification-grpc
└── DNS: *.prod.microservices.internal (private DNS)
```

### Why internal ALB for gRPC?
The microservices use gRPC (HTTP/2) to talk to each other. Instead of each service knowing the IP of every other service, they all go through the internal ALB:
- Gateway wants to call Identity → sends gRPC to `identity.prod.microservices.internal:5005`
- DNS resolves to internal ALB → ALB forwards to healthy identity task

### Hands-on
```powershell
# See all ALBs
aws elbv2 describe-load-balancers --profile muvi-prod --query "LoadBalancers[*].[LoadBalancerName,Scheme,Type]" --output table

# See internal ALB listeners (the port→service mapping)
$arn = aws elbv2 describe-load-balancers --profile muvi-prod --query "LoadBalancers[?LoadBalancerName=='Muvi-Microservices-Prod'].LoadBalancerArn" --output text
aws elbv2 describe-listeners --load-balancer-arn $arn --profile muvi-prod --query "Listeners[*].[Port,Protocol]" --output table
```

### For UAT
Create 2-3 ALBs with same pattern. Internal ALB is critical — without it, microservices can't talk to each other.

---

## 9. Target Groups — ALB's Address Book

### What it is
A **target group** tells the ALB where to send traffic. It's a list of IP addresses (ECS container IPs) that the ALB health-checks and load-balances across.

### How it works
1. ECS launches a new gateway task → gets IP `10.230.4.17`
2. ECS registers that IP with `muvi-gateway-tg` target group
3. ALB health-checks `/heartbeat` on that IP
4. If healthy → ALB starts sending traffic to it
5. Task dies → ECS deregisters IP → ALB stops sending traffic

### Muvi's target groups (9)

| Target Group | ALB | Health Check | Port |
|---|---|---|:---:|
| muvi-gateway-tg | Muvi-Prod | `/heartbeat` | 80 |
| muvi-website-tg | Muvi-Website-ALB | `/api/healthcheck` | 80 |
| muvi-main-grpc | Internal ALB | gRPC health check | 80 |
| muvi-identity-tg | Internal ALB | gRPC health check | 80 |
| muvi-payment-grpc | Internal ALB | gRPC health check | 80 |
| muvi-fb-grpc-tg | Internal ALB | gRPC health check | 80 |
| muvi-offer-grpc | Internal ALB | gRPC health check | 80 |
| muvi-notification-grpc | Internal ALB | gRPC health check | 80 |
| muvi-ticket-tg | **Unattached** ⚠️ | gRPC health check | 80 |

### For UAT
One target group per ECS service. Gets auto-created when you link an ECS service to an ALB.

---

## 10. CloudFront — The Global Speed Boost

### What it is
CloudFront is a **CDN** (Content Delivery Network). It has servers in 400+ locations worldwide. When someone in Riyadh requests the website, CloudFront serves it from a nearby edge server instead of going all the way to Frankfurt.

### What it does for Muvi

```
Without CloudFront:
  User in Riyadh → 3000km → Frankfurt server → 3000km back
  Latency: ~120ms round trip

With CloudFront:
  User in Riyadh → ~50km → CloudFront edge in Riyadh → cached? return instantly
                                                       → not cached? → Frankfurt → cache for next time
  Latency: ~10ms for cached, ~130ms for first request
```

### Muvi's 9 distributions explained

| Domain | What it serves | Why separate |
|---|---|---|
| **api.prod.muvicinemas.com** | API requests | Needs WAF protection, different caching rules (mostly no-cache) |
| **muvicinemas.com** | Website HTML/JS/CSS | Caches static assets, WAF for bot protection |
| **dashboard.muvicinemas.com** | CMS admin panel | Served from S3 (static React app), no WAF needed |
| **media.prod.muvicinemas.com** | Film posters, banners | Heavy caching (images rarely change), no WAF needed |
| **go.muvicinemas.com** | Short URL redirects | External service (SpGo), just a proxy |
| **api-dr.prod.muvicinemas.com** | API disaster recovery | Points to Ireland ALB, activated in emergency |
| **app-dr.prod.muvicinemas.com** | Website DR | Same as above |
| **cms-dr.prod.muvicinemas.com** | CMS DR | Points to Ireland S3 bucket |
| **media-dr.prod.muvicinemas.com** | Media DR | Points to Ireland S3 bucket |

### Hands-on
```powershell
# List all distributions with their domains
aws cloudfront list-distributions --profile muvi-prod --query "DistributionList.Items[*].[Aliases.Items[0],Origins.Items[0].DomainName]" --output table
```

### For UAT
Create 3 distributions: API, Website, Media. Skip DR and URL shortener.

---

## 11. WAF — The Security Guard

### What it is
**Web Application Firewall** inspects every HTTP request and blocks malicious ones (SQL injection, XSS, DDoS, bots).

### Muvi's WAF rules (in order of priority)

```
Request arrives at CloudFront
    │
    ▼ Rule 1: LimitBlock
    │   → Rate limit: block IPs sending too many requests
    │
    ▼ Rule 2: block-rate-otp
    │   → Special rate limit for OTP endpoints (prevent brute force)
    │
    ▼ Rule 3: Allow-White-List-Rule
    │   → Always allow specific IPs (office, monitoring)
    │
    ▼ Rule 4: Block-Black-List-Rule
    │   → Always block specific IPs (known attackers)
    │
    ▼ Rule 5-13: AWS Managed Rules
    │   → CommonRuleSet: XSS, path traversal, file inclusion
    │   → AdminProtection: block access to admin paths
    │   → IpReputation: block known bad IPs
    │   → AnonymousIpList: block VPNs/Tor (optional)
    │   → KnownBadInputs: log4j, SSRF patterns
    │   → LinuxRuleSet: Linux-specific exploits
    │   → SQLiRuleSet: SQL injection
    │
    ✅ Passed all rules → forward to ALB
```

### For UAT
Basic rate limiting is enough. Skip expensive managed rule sets for testing.

---

## 12. Route 53 — The Phone Book

### What it is
DNS service. Translates human-readable names (muvicinemas.com) to IP addresses.

### Muvi's DNS zones

| Zone | Type | What it resolves |
|---|---|---|
| `muvicinemas.com` | Public | api.prod.muvicinemas.com → CloudFront, muvicinemas.com → CloudFront |
| `prod.microservices.internal` | **Private** (VPC only) | identity.prod.microservices.internal → Internal ALB IP |

The **private hosted zone** is crucial — it's how the gateway knows where to find the microservices. The env var `NOTIFICATION_SERVICE_HOST=notification.prod.microservices.internal` resolves to the internal ALB only inside the VPC.

### For UAT
- Create a public zone for your UAT domain (e.g., `uat.muvicinemas.com`)
- Create a private zone for internal routing (e.g., `uat.microservices.internal`)

---

## 13. ACM — SSL Certificates

### What it is
**AWS Certificate Manager** provides free SSL/TLS certificates. These are the "https://" padlocks.

### Muvi's certificates

| Certificate | Region | Used by |
|---|---|---|
| `*.muvicinemas.com` | us-east-1 | CloudFront (wildcard for all subdomains) |
| `*.prod.muvicinemas.com` | us-east-1 | CloudFront (API, DR) |
| `prod.microservices.internal` | eu-central-1 | Internal ALB (HTTPS between services) |

> **Why us-east-1?** CloudFront requires certificates to be in us-east-1 regardless of where your servers are.

### For UAT
Request 2 certificates: one in us-east-1 for CloudFront, one in me-central-1 for internal ALB.

---

## 14. Aurora PostgreSQL — The Databases

### What it is
**Aurora** is AWS's managed PostgreSQL. It's like running PostgreSQL but AWS handles backups, failover, patching, and scaling. It's 3-5x faster than standard PostgreSQL.

### Why 6 separate databases?
Microservice architecture: **each service owns its data**. Main service can't read identity's database directly. They talk via gRPC.

```
[muvi-prod-main-service]        ← Biggest: films, cinemas, sessions, bookings, orders
  ├── Writer: db.r5.2xlarge (8 vCPU, 64 GB RAM)
  └── Reader: db.r5.2xlarge (read-only replica for queries)

[muvi-prod-identity]            ← Users, roles, permissions, OTP logs
  ├── Writer: db.r5.xlarge (4 vCPU, 32 GB)
  └── Reader: db.r5.xlarge

[muvi-prod-payments-recovered]  ← Transactions, refunds, wallet balances
  ├── Writer: db.r5.xlarge
  └── Reader: db.r5.xlarge

[muvi-prod-fb]                  ← Menu items, F&B orders, kiosk sessions
  ├── Writer: db.r5.large (2 vCPU, 16 GB)
  └── Reader: db.r5.large

[muvi-offer-prod]               ← Promo codes, vouchers, discounts
  ├── Writer: db.r5.large
  └── Reader: db.r5.large

[muvi-prod-notification]        ← Notification logs, templates, preferences
  └── Writer: db.r5.large (NO reader — low read traffic)
```

### Writer vs Reader

| | Writer | Reader |
|---|---|---|
| Can INSERT/UPDATE/DELETE? | Yes | **No** (read-only) |
| Can SELECT? | Yes | Yes |
| Purpose | All writes + some reads | Heavy queries, reports |
| Code uses | `DB_WRITE_HOST` env var | `DB_READ_HOST` env var |

The app code sends writes to the writer endpoint and reads to the reader endpoint, splitting the load.

### Hands-on
```powershell
# List all database clusters with sizes
aws rds describe-db-instances --profile muvi-prod --query "DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus]" --output table
```

### For UAT
- 6 Aurora clusters, each with **writer only** (no reader — saves 50% on DB costs)
- Use `db.r6g.medium` (2 vCPU, 16 GB) for all — smallest reasonable Aurora size
- r6g is Graviton (ARM) and ~20% cheaper than r5

---

## 15. RDS Proxy — The Database Bouncer

### What it is
RDS Proxy sits between your ECS containers and the database. It **pools connections** — instead of 100 ECS tasks each opening 10 database connections (1000 total!), the proxy maintains a smaller pool and multiplexes.

### Why Muvi needs it
```
Without Proxy:
  7 gateway tasks × 10 connections = 70
  7 main tasks × 10 connections = 70
  7 identity tasks × 10 connections = 70
  Total: 210+ connections to main DB
  (Aurora max_connections ≈ 5000, but each connection uses RAM)

With Proxy:
  210 app connections → Proxy → 50 actual DB connections
  Saves ~75% of DB connection overhead
```

### Muvi's proxies

| Proxy | Points to | Writer Endpoint | Read Endpoint |
|---|---|---|---|
| main-proxy | muvi-prod-main-service | ✅ | main-proxy-read-only |
| identity-proxy | muvi-prod-identity | ✅ | identity-proxy-read-only |
| payment-proxy | muvi-prod-payments | ✅ | payment-proxy-read-only |
| fb-proxy | muvi-prod-fb | ✅ | fb-proxy-read-only |
| offer-proxy | muvi-offer-prod | ✅ | offer-proxy-ro |
| notification-proxy | muvi-prod-notification | ✅ | notification-proxy-read-only |

### For UAT
**Skip RDS Proxy for UAT**. With 1 task per service, you'll have ~60 total DB connections. Aurora handles this easily. Saves ~$650/month.

*However*, if your load test simulates many concurrent users and ECS scales up, you may want proxy for main and identity.

---

## 16. ElastiCache Redis — The Sticky Notes

### What it is
Redis is an **in-memory key-value store**. Think of it as super-fast sticky notes — data is stored in RAM (not disk), so reads/writes take <1ms vs 5-50ms for a database.

### Why Muvi needs 9 Redis instances

| Redis Cluster | Why it exists | What's stored |
|---|---|---|
| **foms-redis-prod-main** (r5.large) | Main service caching + queues | Seat locks (5-min TTL), session cache, **Bull queues** for async jobs (booking confirmations) |
| **foms-redis-prod-notification** (r5.large) | Notification queues | Bull queues: push notifications, emails, SMS to be sent |
| **foms-redis-prod-getway** | Gateway rate limiting + sessions | Rate limit counters (100 req/60s), JWT token cache |
| **foms-redis-prod-identity** | OTP + auth state | OTP codes (4-digit, 5-min TTL), session tokens |
| **foms-redis-prod-paymnet** | Payment events | Redis Pub/Sub for real-time payment status updates |
| **foms-redis-prod-offer** | Promo code validation cache | Cached promo rules + usage counts |
| **foms-redis-prod-fb** | F&B cart + sessions | Cart items (ephemeral), kiosk session data |
| **foms-redis-prod-shared** | Cross-service data | Shared data between services (config, feature flags) |
| **foms-redis-prod-bulk-refund-booking** | Bulk refund queue | Special queue for processing mass refunds |

### Key Redis patterns in this app

**Bull Queue** (most important):
```
Main service: "Send booking confirmation email"
     ↓ adds job to Redis queue
Redis (main): JOB #1234 {type: "booking-confirm", userId: "xxx", bookingId: "yyy"}
     ↓ notification service polls this queue
Notification: picks up JOB #1234, sends email via SendGrid, marks as complete
```

**Seat Locking**:
```
User selects seat A5 → Redis: SET "seat:session123:A5" "locked" EX 300
  (key auto-expires in 300 seconds = 5 minutes)
Another user tries seat A5 → Redis: EXISTS "seat:session123:A5" → true → "seat taken!"
User completes payment → Redis: DEL "seat:session123:A5" → DB: mark seat as sold
```

### Hands-on
```powershell
# List all Redis clusters with node types
aws elasticache describe-cache-clusters --profile muvi-prod --query "CacheClusters[*].[CacheClusterId,CacheNodeType,EngineVersion]" --output table
```

### For UAT
For load testing, you want to **keep Redis per-service** (not shared) to simulate real conditions. But use smaller instances:
- main + notification: `cache.t3.small` (1.37 GB)
- others: `cache.t3.micro` (0.5 GB) or combine into 1-2 shared instances

---

## 17. S3 — The File Cabinet

### What it is
**Simple Storage Service** — unlimited file storage. Think Google Drive but for your app. Stores anything: images, videos, static websites, backups, logs.

### Muvi's important S3 buckets

| Bucket | Purpose | How it's used |
|---|---|---|
| **muvi-media-prod** | Film posters, banners, user uploads | App uploads via AWS SDK, served via CloudFront CDN |
| **muvi-cms-prod** | CMS React app (static files) | S3 static website hosting → CloudFront → dashboard.muvicinemas.com |
| **muvi-menu-public** | F&B menu images | Public bucket for kiosk menu display |

### S3 Static Website Hosting
The CMS dashboard is a React app (just HTML/JS/CSS files). Instead of running a server:
1. Build the React app → output folder of static files
2. Upload to S3 bucket
3. Enable "static website hosting" on the bucket
4. Put CloudFront in front for HTTPS + caching

### For UAT
Create 3 buckets: media, cms, menu. Skip all the logging/backup buckets.

---

## 18. Lambda — The Interns

### What it is
**Lambda** runs a function (piece of code) only when triggered. You don't manage servers, you don't pay when it's not running. Perfect for scheduled tasks.

### Real-world analogy
Instead of hiring a full-time employee to check the mailbox once per hour, you hire an intern who only shows up, checks the mailbox, and leaves. You pay per minute they work.

### Why Muvi uses Lambda instead of putting this code in the microservices

The microservices handle **live user traffic**. You don't want a heavy cron job (like syncing 500 films from Vista) consuming CPU/memory that should serve user requests. Lambda runs separately.

### Muvi's Lambda functions by category

**Vista Sync (6 functions)** — These sync data FROM Vista (the cinema management system) INTO Muvi's databases:
```
Every 20 min:  sync-sessions    → GET sessions from Vista API → upsert into main DB
Every 30 min:  sync-films       → GET films from Vista API → upsert into main DB
Every 30 min:  sync-person      → GET directors/actors → upsert into main DB
Every 2 hours: sync-genres      → GET genres → upsert into main DB
3x daily:      sync-concessions → GET F&B items → upsert into fb DB
Bi-monthly:    sync-cinemas     → GET cinema locations → upsert into main DB
```
Without these, the app would show stale/outdated content.

**Cleanup (7 functions)** — Database housekeeping:
```
Midnight:  clean-sessions     → Delete expired screening sessions
Midnight:  clean-orders       → Delete abandoned/expired orders
2 AM:      clear-orders-fb    → Delete expired F&B orders
Daily:     delete-old-notifications → Purge old notification records
10 min:    terminate-pending-sync → Kill stuck sync processes
```
Without these, the database grows indefinitely and queries slow down.

**Business Operations (4 functions)**:
```
Every 10 min:  cancel-expired → Cancel bookings where payment wasn't completed in time
Every 30 min:  cron-reminder  → Send "your movie starts in 2 hours" push notifications
9 PM daily:    process-expired-cashback → Move expired cashback to platform revenue
```

### Hands-on
```powershell
# List all Lambda functions sorted by runtime
aws lambda list-functions --profile muvi-prod --query "sort_by(Functions, &Runtime)[*].[FunctionName,Runtime,MemorySize]" --output table
```

### For UAT
You need the Vista sync functions (otherwise no films/sessions to test). You need cancel-expired and clean-sessions. Skip everything else.

---

## 19. EventBridge — The Alarm Clock

### What it is
EventBridge triggers Lambda functions on a schedule. It's the "alarm clock" that wakes up the Lambda "interns."

### How it works
```
EventBridge Rule: "sync-sessions"
  Schedule: cron(0/20 * * * ? *)    ← "every 20 minutes"
  Target: Lambda:sync-sessions-prod  ← "run this function"
```

It can also react to events:
```
EventBridge Rule: "CopyProdToStaging-muvi-gateway"
  Event Pattern: ECR image push to muvi-gateway
  Target: Copy image to staging ECR
```

### Cron syntax reference
```
cron(minutes hours day-of-month month day-of-week year)

Examples:
  cron(0/20 * * * ? *)        = every 20 minutes
  cron(0 0 * * ? *)           = midnight daily
  cron(0 11 * * ? *)          = 11:00 AM daily
  cron(*/5 * * * ? *)         = every 5 minutes
  cron(0 5,9,13 * * ? *)     = at 5:00, 9:00, 13:00
  cron(0 0 1 */2 ? *)         = 1st of every 2nd month
  rate(30 minutes)             = every 30 minutes (simpler syntax)
```

### For UAT
Create rules only for the Lambda functions you deploy. Use the same schedules.

---

## 20. Secrets Manager — The Safe

### What it is
Stores sensitive values (passwords, API keys, certificates) encrypted. Your code retrieves them at runtime instead of hardcoding.

### Muvi's secrets (22)

| Category | Secret Names | What's inside |
|---|---|---|
| **Database passwords** | prod/main/rds, prod/identity/rds, prod/payment/rds, prod/fb/rds, prod/notification/rds, OfferDBSecret | PostgreSQL username + password |
| **Internal ALB certs** | prod/gateway/lb/certificate, prod/main/lb/certificate, etc. | TLS certificates for HTTPS between services |
| **Apple Pay** | prod/payment/applepay/hyperpay/cert, /privatekey, etc. | Apple Pay merchant certificates |
| **Other** | identity-ecs-braze-api-key, prod/payment/nearpay/privatekey | API keys for integrations |

### How the app uses them
The **RDS Proxy** reads `prod/main/rds` to get the database password. Your ECS tasks don't have the DB password in their env vars — the proxy handles auth.

### For UAT
Create your own secrets with UAT-specific values. Don't copy prod passwords.

---

## 21. SSM Parameter Store — The Config File

### What it is
Like Secrets Manager but for **non-sensitive configuration**. Cheaper, simpler, and supports hierarchical paths.

### How Muvi uses it
Each service has env var `SSM_ACCESS_KEY_ID` that lets it read parameters from SSM at startup. When you see `NODE_ENV=local` it skips SSM and uses local env vars instead.

### For UAT
You can either:
1. Use SSM in UAT (recommended for prod-like testing) — create parameters under `/uat/` path
2. Use local env vars in ECS task definitions (simpler)

---

## 22. CodePipeline — The Assembly Line

### What it is
CI/CD service that automates: code commit → build → test → deploy. Like GitHub Actions but AWS-native.

### Muvi's pipeline flow
```
1. Developer pushes to GitLab (via CodeStar Connection)
       │
       ▼
2. Manual Approval ← Person clicks "Approve" in AWS Console
       │                (prevents accidental deployments)
       ▼
3. CodeBuild ← Builds Docker image, runs tests
       │          pushes image to ECR
       ▼
4. Azure Blob ← Copies build artifacts to Azure
       │          (backup/compliance requirement)
       ▼
5. ECS Deploy ← Updates the ECS service to use the new image
                 (rolling deployment: replaces tasks one by one)
```

### For UAT
Use **GitHub Actions** instead (you already have the code on GitHub). Simpler CI/CD:
1. Push to GitHub
2. GitHub Action builds Docker image
3. Push to ECR
4. Update ECS service

---

## 23. CloudWatch — The CCTV System

### What it is
Monitoring and logging service. Collects metrics (CPU usage, request count), stores logs, and sends alerts.

### Muvi's setup
- **~99 CloudWatch Alarms** (mostly auto-created by auto-scaling)
- Security alarms: console login failures, unauthorized API calls, root account usage
- ECS: CPU/Memory/Request count metrics per service
- RDS: CPU, connections, storage metrics

> **Note**: Muvi primarily uses **Datadog** for monitoring (every ECS task has a Datadog sidecar). CloudWatch is the baseline.

### For UAT
Keep CloudWatch default metrics (free). Add a few alarms for ECS CPU/Memory. Skip Datadog.

---

## 24. Cloud Map — Internal GPS

### What it is
**Service discovery** — lets ECS services find each other by name instead of IP address.

### Muvi's setup
```
Namespace: "internal" (DNS_PRIVATE)
Services: gateway, website
```

Only gateway and website use Cloud Map directly. The other 6 microservices are discovered via the **internal ALB + private hosted zone** (prod.microservices.internal).

### For UAT
Create one Cloud Map namespace. Or just use the internal ALB pattern (simpler).

---

## 25. VPC Endpoints — Secret Tunnels

### What it is
Normally, when your ECS container calls S3 or ECR, the traffic goes out through the NAT Gateway to the internet and back into AWS. VPC Endpoints create a **private shortcut** — traffic stays inside AWS's network.

### Benefits
1. Saves NAT Gateway data transfer costs ($0.045/GB)
2. Faster (no round-trip through the internet)
3. More secure (traffic never leaves AWS)

### Muvi's endpoints

| Endpoint | Type | Purpose |
|---|---|---|
| S3 | Gateway (free!) | ECR image pulls, S3 media access |
| Application Auto Scaling | Interface | Auto-scaling API calls |
| Datadog PrivateLink (×12) | Interface | Secure Datadog metric/log shipping |

### For UAT
Create the S3 **Gateway** endpoint (free, saves money). Skip Datadog PrivateLink.

---

## 26. Step Functions — The Workflow Manager

### What it is
Orchestrates multi-step workflows visually. "If this, then that, wait, then do the next thing."

### Muvi's usage
```
Step-Function-LambdaECS:
  1. Lambda checks current hour
  2. If peak time → scale up main-grpc ECS tasks
  3. If off-peak → scale down
  4. Also adjusts RDS instance sizes on weekends
```

### For UAT
Skip. Manually set your ECS task count.

---

## 27. Auto Scaling — The Smart Thermostat

### What it is
Automatically adjusts the number of ECS tasks (or database capacity) based on demand.

### How it works
```
Rule: If CPUUtilization > 75% for 3 minutes → add 1 task
Rule: If CPUUtilization < 25% for 15 minutes → remove 1 task
Rule: If RequestCount > 1000/target/min → add tasks
```

### Muvi's scaling ranges

| Service | Min | Max | Scale triggers |
|---|:---:|:---:|---|
| gateway | 7 | **120** | CPU, Memory, Request Count |
| main-grpc | 7 | **100** | CPU, Memory, Request Count |
| identity-grpc | 7 | **100** | CPU, Memory, Request Count |
| website | 5 | **100** | CPU, Memory, Request Count |
| payment-grpc | 3 | **100** | CPU, Memory, Request Count |
| fb-muvi | 3 | 15 | CPU, Memory, Request Count |
| offer-muvi | 3 | 10 | CPU, Memory, Request Count |
| notification-grpc | 2 | 25 | CPU, Memory, Request Count |
| ticket | 2 | **100** | CPU, RAM |

### For UAT (Load Testing)
**This is important for load testing!** Set:
- Min: 1 (save money when idle)
- Max: 10-20 (enough for load test, with a cost safety cap)
- Same scaling triggers as prod

---

## 28. IAM — Who Can Do What

### What it is
**Identity and Access Management** controls which AWS users/services can do what.

### Key IAM concepts

| Concept | What it means | Example |
|---|---|---|
| **User** | A person | Your `rehan.tariq@muvicinemas.com` account |
| **Role** | An identity for services | "ECS tasks can read from S3" |
| **Policy** | Permission rules | "Allow ecs:UpdateService on Muvi-Production/*" |

### Important roles for Muvi

| Role | Who uses it | Permissions |
|---|---|---|
| ECS Task Execution Role | ECS (to pull images) | ECR pull, CloudWatch logs, Secrets Manager read |
| ECS Task Role | Your running containers | S3 read/write, SSM read, SQS, etc. |
| CodePipeline Role | CI/CD pipelines | ECR push, ECS deploy, S3, CodeBuild |
| Lambda Execution Role | Each Lambda function | CloudWatch logs, RDS/Redis access, specific actions |
| Auto Scaling Role | Auto Scaling service | ECS UpdateService |

### For UAT
You'll need to create these roles. AWS managed policies simplify this:
- `AmazonECSTaskExecutionRolePolicy` for ECS execution
- Custom policies for task roles (S3, SSM access)

---

## Day-by-Day Execution Plan

### Day 1 (Monday): Foundation — VPC + Networking

**Morning: Learn + Build VPC**
```
Goal: Create the "building" for all your services
Time: 3-4 hours

1. Create VPC (10.240.0.0/16)
2. Create 6 subnets (2 AZs × 3 tiers):
   - Public-a, Public-b
   - App-a, App-b
   - Private-a, Private-b
3. Create Internet Gateway (attach to VPC)
4. Create NAT Gateway (in public subnet)
5. Create 3 Route Tables:
   - Public: 0.0.0.0/0 → Internet Gateway
   - App: 0.0.0.0/0 → NAT Gateway
   - Private: no internet route
6. Associate subnets with route tables
7. Create S3 VPC Gateway Endpoint (free)
```

**Afternoon: Security Groups + ALBs**
```
8. Create security groups (in order):
   - ALB-Public-SG (inbound: 80,443 from 0.0.0.0/0)
   - ALB-Internal-SG (inbound: 5002-5007 from ECS SGs)
   - ECS-Gateway-SG (inbound: 3001 from ALB-Public-SG)
   - ECS-Main-SG, ECS-Identity-SG, etc.
   - RDS-SG (inbound: 5432 from ECS SGs)
   - Redis-SG (inbound: 6379 from ECS SGs)

9. Create ALBs:
   - uat-api-alb (internet-facing, public subnets)
   - uat-internal-alb (internal, app subnets)

10. Create target groups (empty for now)
11. Create ALB listeners
```

### Day 2 (Tuesday): Data Layer — Databases + Redis

**Morning: Aurora PostgreSQL**
```
1. Create DB subnet group (private subnets)
2. Create 6 Aurora clusters (writer only):
   - uat-main, uat-identity, uat-payment
   - uat-fb, uat-offer, uat-notification
   All: db.r6g.medium, PostgreSQL 14.x
3. Note down all writer endpoints
```

**Afternoon: Redis**
```
4. Create ElastiCache subnet group (private subnets)
5. Create 3-9 Redis clusters:
   Option A (simple): 3 clusters (main, shared, notification)
   Option B (prod-like): 9 clusters mirroring prod
   All: cache.t3.small or t3.micro, Redis 7.x
6. Note down all Redis endpoints
```

### Day 3 (Wednesday): Compute — ECR + ECS

**Morning: Docker Images**
```
1. Create 8 ECR repositories
2. Build Docker images from your codebase:
   cd main-backend-microservices/alpha-muvi-gateway-main
   docker build -t muvi-gateway .
3. Tag and push to ECR
4. Repeat for all 8 services
```

**Afternoon: ECS Cluster + Task Definitions**
```
5. Create ECS cluster: Muvi-UAT
6. Create IAM roles:
   - ecsTaskExecutionRole (ECR pull, logs, secrets)
   - ecsTaskRole (S3, SSM)
7. Create 8 task definitions with:
   - Container image → your ECR URI
   - Environment variables (endpoints, ports)
   - CPU/Memory (minimal sizing)
   - Logging to CloudWatch
8. Create 8 ECS services (1 task each)
9. Attach to target groups
```

### Day 4 (Thursday): Edge + DNS + Testing

**Morning: CloudFront + DNS**
```
1. Request ACM certificates (us-east-1 for CF, me-central-1 for ALB)
2. Create CloudFront distributions (API, Website, Media)
3. Create Route 53 records
4. Create private hosted zone for internal routing
5. Upload CMS to S3
```

**Afternoon: Smoke Testing**
```
6. Hit each service health check endpoint
7. Test gateway → identity flow (login/OTP)
8. Test gateway → main flow (list films)
9. Fix any connection/permission issues
10. Run a simple k6 load test (10 users, 1 minute)
```

### Day 5 (Friday): Lambda + Cron + Polish

**Morning: Serverless**
```
1. Deploy essential Lambda functions:
   - sync-films, sync-sessions, sync-concessions
   - clean-sessions, clean-orders
   - cancel-expired
2. Create EventBridge rules with schedules
3. Trigger each Lambda manually to verify
```

**Afternoon: Auto Scaling + Load Test Prep**
```
4. Configure auto-scaling for each ECS service:
   - Min: 1, Max: 10-20
   - CPU target: 70%, Memory target: 80%
5. Set up CloudWatch dashboard
6. Run initial load test (50 users, 5 minutes)
7. Identify bottlenecks
```

### Day 6-7 (Weekend): Load Testing

```
Saturday:
  - Run full load test (ramping to target users)
  - Monitor CloudWatch metrics
  - Adjust scaling parameters
  - Identify and fix bottlenecks

Sunday:
  - Run final load test with production-like traffic patterns
  - Document results
  - If this is UAT → tear down or scale to 0 to save costs
```

---

## Quick Reference: AWS CLI Commands You'll Use Daily

```powershell
# === ECS ===
# List running services
aws ecs describe-services --cluster Muvi-UAT --services gateway --query "services[0].{Running:runningCount,Desired:desiredCount,Status:status}" --output table

# Force new deployment (restart all tasks)
aws ecs update-service --cluster Muvi-UAT --service gateway --force-new-deployment

# Scale a service (change task count)
aws ecs update-service --cluster Muvi-UAT --service gateway --desired-count 3

# View logs
aws logs tail /ecs/muvi-gateway --follow

# === RDS ===
# Check database status
aws rds describe-db-clusters --query "DBClusters[*].[DBClusterIdentifier,Status]" --output table

# === Redis ===
# Check Redis cluster status
aws elasticache describe-cache-clusters --query "CacheClusters[*].[CacheClusterId,CacheClusterStatus]" --output table

# === Lambda ===
# Run a Lambda manually
aws lambda invoke --function-name sync-films-prod --payload '{}' output.json; cat output.json

# === CloudFront ===
# Invalidate cache (after deploying new version)
aws cloudfront create-invalidation --distribution-id E12345 --paths "/*"

# === General ===
# See what's costing money
aws ce get-cost-and-usage --time-period Start=2026-02-01,End=2026-02-19 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE --query "ResultsByTime[0].Groups[*].[Keys[0],Metrics.BlendedCost.Amount]" --output table
```

---

## Glossary

| Term | Meaning |
|---|---|
| **AZ** | Availability Zone — a physical data center within a region |
| **CIDR** | IP address range notation (e.g., 10.230.0.0/16) |
| **gRPC** | Google's RPC protocol — faster than REST for service-to-service calls |
| **Fargate** | Serverless containers — you don't manage the underlying server |
| **Aurora** | AWS's high-performance managed PostgreSQL/MySQL |
| **Bull queue** | Job queue library for Node.js, backed by Redis |
| **Task definition** | The "recipe" for an ECS container (image, CPU, env vars) |
| **Target group** | A list of IPs that an ALB load-balances across |
| **Private hosted zone** | DNS that only works inside your VPC |
| **NAT Gateway** | Lets private subnets access the internet (outbound only) |
| **PrivateLink** | VPC Endpoint for accessing AWS services without internet |
| **ACL** | Access Control List (WAF rules) |
| **SSM** | Systems Manager — stores configuration parameters |
| **ECR** | Container registry (where Docker images live) |

---

*Ask Copilot to help with any step. I can generate Terraform/CloudFormation templates, write CLI commands, debug connection issues, and explain any error you hit.*
