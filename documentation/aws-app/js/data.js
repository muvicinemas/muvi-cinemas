/* ================================================================
   Muvi UAE – AWS Infrastructure Data
   ────────────────────────────────────
   UPDATE THIS FILE after each phase.
   The dashboard reads everything from here.
   Last updated: Phase 4 (Redis) — Feb 26, 2026
   ================================================================ */

const INFRA = {

  meta: {
    region: 'me-central-1',
    account: '739991759290',
    environment: 'UAT PROD',
    lastUpdated: '2026-02-26T19:30:00Z',
    totalMonthlyCost: 1304,
    sourceAccount: '011566070219',
    sourceRegion: 'eu-central-1',
  },

  /* ─── PHASE TRACKER ─── */
  phases: [
    { id: '1',  name: 'Cleanup',       status: 'complete', date: 'Feb 23' },
    { id: '2',  name: 'Databases',     status: 'complete', date: 'Feb 24' },
    { id: '2B', name: 'DB Ecosystem',  status: 'complete', date: 'Feb 24' },
    { id: '3',  name: 'Networking',    status: 'complete', date: 'Feb 25' },
    { id: '4',  name: 'Redis',         status: 'complete', date: 'Feb 26' },
    { id: '5',  name: 'ECS + ECR',     status: 'pending',  date: null },
    { id: '6',  name: 'S3/CF/WAF',     status: 'pending',  date: null },
    { id: '7',  name: 'SSM/Secrets',   status: 'pending',  date: null },
    { id: '8',  name: 'CI/CD',         status: 'pending',  date: null },
    { id: '9',  name: '3rd Party',     status: 'pending',  date: null },
    { id: '10', name: 'Load Test',     status: 'pending',  date: null },
    { id: '11', name: 'Decom FFM',     status: 'pending',  date: null },
    { id: '12', name: 'Terraform',     status: 'pending',  date: null },
    { id: '13', name: 'Control Panel', status: 'pending',  date: null },
  ],

  /* ─── CARDS ─── */
  cards: [

    /* ────────── 1. AURORA DATABASE ────────── */
    {
      id: 'aurora',
      icon: '🗄️',
      title: 'Aurora Database',
      subtitle: 'PostgreSQL 14.17 · Cluster Mode',
      status: 'available',
      costPerMonth: 188,
      glow: 'green',
      stats: [
        { value: '1', label: 'Cluster' },
        { value: '2', label: 'Instances' },
        { value: '6', label: 'Databases' },
        { value: '52.9M', label: 'Rows' },
      ],
      table: {
        headers: ['Instance', 'Role', 'Class', 'AZ', 'Status'],
        rows: [
          ['uatclusterdb-instance-1', 'Writer', 'db.r5.large', 'mec1-az1', 'available'],
          ['uatclusterdb-instance-1-me-central-1b', 'Reader', 'db.r5.large', 'mec1-az2', 'available'],
        ],
      },
      detail: {
        description: 'Aurora PostgreSQL cluster hosting all 6 microservice databases. Migrated 52.9M rows (18.6 GB) from Frankfurt UAT. PubliclyAccessible=True for developer convenience.',
        sections: [
          {
            title: '📍 Endpoints',
            type: 'kv',
            data: [
              ['Cluster ID', 'uatclusterdb'],
              ['Writer', 'uatclusterdb.cluster-cwyxrbeukelc.me-central-1.rds.amazonaws.com:5432'],
              ['Reader', 'uatclusterdb.cluster-ro-cwyxrbeukelc.me-central-1.rds.amazonaws.com:5432'],
              ['Master User', 'postgres'],
              ['Port', '5432'],
              ['Public Access', 'Yes (for developer DBeaver/pgAdmin)'],
            ],
          },
          {
            title: '🗃️ Databases',
            type: 'table',
            headers: ['Database', 'Service', 'Rows', 'Size'],
            rows: [
              ['muvi_gateway', 'Gateway', '~2.1M', '~1.8 GB'],
              ['muvi_identity', 'Identity', '~8.5M', '~3.2 GB'],
              ['muvi_main', 'Main', '~31.2M', '~9.4 GB'],
              ['muvi_payment', 'Payment', '~5.8M', '~2.1 GB'],
              ['muvi_fb', 'F&B', '~3.1M', '~1.2 GB'],
              ['muvi_notification', 'Notification', '~2.2M', '~0.9 GB'],
            ],
          },
          {
            title: '⚙️ Configuration',
            type: 'kv',
            data: [
              ['Engine', 'aurora-postgresql 14.17'],
              ['Instance Class', 'db.r5.large (2 vCPU, 16 GB)'],
              ['Storage', 'Aurora auto-scaling (pay per use)'],
              ['Encryption', 'AES-256 (aws/rds key)'],
              ['Auto Minor Upgrade', 'Enabled'],
              ['Backup Retention', '1 day'],
              ['Deletion Protection', 'Disabled (UAT)'],
            ],
          },
        ],
      },
    },

    /* ────────── 2. RDS PROXIES ────────── */
    {
      id: 'rds-proxies',
      icon: '🔀',
      title: 'RDS Proxies',
      subtitle: '6 proxies · Connection pooling for ECS',
      status: 'available',
      costPerMonth: 265,
      glow: 'green',
      stats: [
        { value: '6', label: 'Proxies' },
        { value: '6', label: 'Read Endpoints' },
        { value: 'IAM', label: 'Auth' },
        { value: '~$265', label: '/month' },
      ],
      table: {
        headers: ['Proxy', 'Service', 'Status'],
        rows: [
          ['uat-main-proxy', 'Main', 'available'],
          ['uat-identity-proxy', 'Identity', 'available'],
          ['uat-payment-proxy', 'Payment', 'available'],
          ['uat-fb-proxy', 'F&B', 'available'],
          ['uat-notification-proxy', 'Notification', 'available'],
          ['uat-offer-proxy', 'Offer', 'available'],
        ],
      },
      detail: {
        description: 'RDS Proxies provide connection pooling between ECS Fargate tasks and Aurora. Each service has its own proxy for isolation. Proxies live in the Database VPC and are reached via VPC Peering.',
        sections: [
          {
            title: '📍 Proxy Endpoints',
            type: 'table',
            headers: ['Proxy', 'Endpoint', 'Status'],
            rows: [
              ['uat-main-proxy', 'uat-main-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com', 'available'],
              ['uat-identity-proxy', 'uat-identity-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com', 'available'],
              ['uat-payment-proxy', 'uat-payment-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com', 'available'],
              ['uat-fb-proxy', 'uat-fb-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com', 'available'],
              ['uat-notification-proxy', 'uat-notification-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com', 'available'],
              ['uat-offer-proxy', 'uat-offer-proxy.proxy-cwyxrbeukelc.me-central-1.rds.amazonaws.com', 'available'],
            ],
          },
          {
            title: '🏗️ Architecture',
            type: 'note',
            text: 'ECS tasks (Main VPC 10.60.0.0/16) → VPC Peering → RDS Proxy (DB VPC 10.50.0.0/16) → Aurora Cluster. Proxies handle connection pooling, TLS, and IAM auth automatically. Each proxy targets the same Aurora cluster but connects to the service-specific database.',
          },
          {
            title: '⚙️ Configuration',
            type: 'kv',
            data: [
              ['Engine', 'PostgreSQL'],
              ['Auth', 'IAM + Secrets Manager'],
              ['Idle Timeout', '1800s (30 min)'],
              ['Max Connections', '100% of DB max'],
              ['TLS', 'Required'],
              ['VPC', 'vpc-05e2e9c2e88029d4d (Database VPC)'],
            ],
          },
        ],
      },
    },

    /* ────────── 3. VPC & NETWORKING ────────── */
    {
      id: 'networking',
      icon: '🌐',
      title: 'VPC & Networking',
      subtitle: '2 VPCs · Peering · Subnets',
      status: 'available',
      costPerMonth: 33,
      glow: 'green',
      stats: [
        { value: '2', label: 'VPCs' },
        { value: '1', label: 'Peering' },
        { value: '1', label: 'NAT GW' },
        { value: '~$33', label: '/month' },
      ],
      table: {
        headers: ['VPC', 'CIDR', 'Purpose'],
        rows: [
          ['vpc-0ab936370488229bd', '10.60.0.0/16', 'Main (ECS, ALBs, Redis)'],
          ['vpc-05e2e9c2e88029d4d', '10.50.0.0/16', 'Database (Aurora, Proxies)'],
        ],
      },
      detail: {
        description: 'Two VPCs connected via VPC Peering. Main VPC hosts all compute (ECS, ALBs, Redis). Database VPC hosts Aurora and RDS Proxies. Cross-VPC traffic goes through the peering connection.',
        sections: [
          {
            title: '🔗 VPC Peering',
            type: 'kv',
            data: [
              ['Peering ID', 'pcx-015fcde392996ef5d'],
              ['Requester', 'vpc-0ab936370488229bd (Main 10.60.0.0/16)'],
              ['Accepter', 'vpc-05e2e9c2e88029d4d (DB 10.50.0.0/16)'],
              ['Status', 'Active'],
              ['DNS Resolution', 'Enabled both ways'],
            ],
          },
          {
            title: '🏗️ Architecture Note',
            type: 'note',
            text: 'This mirrors production architecture: compute and databases live in separate VPCs for security isolation. The only path between them is the VPC Peering connection, which is restricted by Security Groups.',
          },
        ],
      },
    },

    /* ────────── 4. LOAD BALANCERS ────────── */
    {
      id: 'albs',
      icon: '⚖️',
      title: 'Load Balancers',
      subtitle: '3 ALBs · 9 Target Groups · ACM cert',
      status: 'available',
      costPerMonth: 54,
      glow: 'green',
      stats: [
        { value: '3', label: 'ALBs' },
        { value: '9', label: 'Target Groups' },
        { value: '8', label: 'Listeners' },
        { value: '~$54', label: '/month' },
      ],
      table: {
        headers: ['ALB', 'Type', 'Scheme', 'Status'],
        rows: [
          ['Muvi-UAT', 'Application', 'internet-facing', 'active'],
          ['Muvi-Internal-UAT', 'Application', 'internal', 'active'],
          ['Muvi-Website-UAT', 'Application', 'internet-facing', 'active'],
        ],
      },
      detail: {
        description: '3 ALBs matching production topology. Public ALB handles API gateway traffic, Internal ALB handles gRPC inter-service calls, Website ALB serves the Next.js frontend.',
        sections: [
          {
            title: '🎯 Target Groups',
            type: 'table',
            headers: ['Target Group', 'Port', 'Protocol', 'ALB', 'Health'],
            rows: [
              ['muvi-uat-gateway-tg', '3000', 'HTTP', 'Muvi-UAT', 'No targets (Phase 5)'],
              ['muvi-uat-identity-grpc-tg', '5001', 'HTTP', 'Internal', 'No targets (Phase 5)'],
              ['muvi-uat-main-grpc-tg', '5002', 'HTTP', 'Internal', 'No targets (Phase 5)'],
              ['muvi-uat-payment-grpc-tg', '5003', 'HTTP', 'Internal', 'No targets (Phase 5)'],
              ['muvi-uat-fb-grpc-tg', '5004', 'HTTP', 'Internal', 'No targets (Phase 5)'],
              ['muvi-uat-notification-grpc-tg', '5005', 'HTTP', 'Internal', 'No targets (Phase 5)'],
              ['muvi-uat-offer-grpc-tg', '5006', 'HTTP', 'Internal', 'No targets (Phase 5)'],
              ['muvi-uat-ticket-tg', '3001', 'HTTP', 'Muvi-UAT', 'No targets (Phase 5)'],
              ['muvi-uat-website-tg', '3000', 'HTTP', 'Website', 'No targets (Phase 5)'],
            ],
          },
          {
            title: '📜 ACM Certificate',
            type: 'kv',
            data: [
              ['Domain', 'internal-muvi-uat.local'],
              ['Type', 'Self-signed (private)'],
              ['Status', 'ISSUED'],
              ['Used By', 'Internal ALB HTTPS listeners'],
            ],
          },
        ],
      },
    },

    /* ────────── 5. SECURITY GROUPS ────────── */
    {
      id: 'security-groups',
      icon: '🛡️',
      title: 'Security Groups',
      subtitle: '15 SGs · VPC firewall rules',
      status: 'available',
      costPerMonth: 0,
      glow: 'blue',
      stats: [
        { value: '15', label: 'Total SGs' },
        { value: '7', label: 'ECS SGs' },
        { value: '3', label: 'ALB SGs' },
        { value: '$0', label: '/month' },
      ],
      table: {
        headers: ['Security Group', 'Purpose'],
        rows: [
          ['muvi-uat-gateway-ecs-sg', 'Gateway ECS tasks'],
          ['muvi-uat-identity-ecs-sg', 'Identity ECS tasks'],
          ['muvi-uat-main-ecs-sg', 'Main ECS tasks'],
          ['muvi-uat-payment-ecs-sg', 'Payment ECS tasks'],
          ['muvi-uat-fb-ecs-sg', 'F&B ECS tasks'],
          ['muvi-uat-notification-ecs-sg', 'Notification ECS tasks'],
          ['muvi-uat-offer-ecs-sg', 'Offer ECS tasks'],
        ],
      },
      detail: {
        description: 'Security Groups act as virtual firewalls. Each ECS service has its own SG. ALBs have their own SGs. Redis SG allows port 6379 only from ECS SGs. This provides service-level network isolation.',
        sections: [
          {
            title: '🔒 All Security Groups',
            type: 'table',
            headers: ['SG ID', 'Name', 'VPC', 'Purpose'],
            rows: [
              ['sg-0e23022843cd332c7', 'muvi-uat-gateway-ecs-sg', 'Main', 'Gateway containers'],
              ['sg-0c616792bfb778e95', 'muvi-uat-identity-ecs-sg', 'Main', 'Identity containers'],
              ['sg-0f2bc74f719236434', 'muvi-uat-main-ecs-sg', 'Main', 'Main containers'],
              ['sg-0e246e3c825bf988a', 'muvi-uat-payment-ecs-sg', 'Main', 'Payment containers'],
              ['sg-0b02bb81ef61f271f', 'muvi-uat-fb-ecs-sg', 'Main', 'F&B containers'],
              ['sg-0af86aff9b93c11ed', 'muvi-uat-notification-ecs-sg', 'Main', 'Notification containers'],
              ['sg-0d25823c9afe2bdde', 'muvi-uat-offer-ecs-sg', 'Main', 'Offer containers'],
              ['sg-0a9f27c9050348d22', 'muvi-uat-alb-sg', 'Main', 'Public ALB (gateway API)'],
              ['sg-065895635e8474f0b', 'muvi-uat-internal-alb-sg', 'Main', 'Internal ALB (gRPC)'],
              ['sg-0d52c3592bc9b4223', 'muvi-uat-website-alb-sg', 'Main', 'Website ALB'],
              ['sg-0731967bbd5ef6e51', 'redis-uat-sg', 'Main', 'Redis clusters'],
              ['sg-09a1fbd5a66494984', 'muvi-uat-ticket-ecs-sg', 'Main', 'Ticket service'],
              ['sg-07a05ebaf552a1a21', 'muvi-uat-website-ecs-sg', 'Main', 'Website containers'],
            ],
          },
          {
            title: '🔑 Redis SG Rules (port 6379 inbound)',
            type: 'note',
            text: 'The Redis security group (redis-uat-sg) allows TCP port 6379 inbound ONLY from the 7 ECS service security groups: gateway, identity, main, payment, fb, notification, offer. No public access. No other services can reach Redis.',
          },
        ],
      },
    },

    /* ────────── 6. REDIS CLUSTERS ────────── */
    {
      id: 'redis',
      icon: '⚡',
      title: 'Redis Clusters',
      subtitle: '9 clusters · Redis 7.0.7 · Per-service isolation',
      status: 'available',
      costPerMonth: 540,
      glow: 'green',
      stats: [
        { value: '9', label: 'Clusters' },
        { value: 't3.med', label: 'Node Type' },
        { value: '7.0.7', label: 'Engine' },
        { value: '~$540', label: '/month' },
      ],
      table: {
        headers: ['Cluster', 'Service', 'Status'],
        rows: [
          ['muvi-uat-redis-gateway', 'Gateway', 'available'],
          ['muvi-uat-redis-identity', 'Identity', 'available'],
          ['muvi-uat-redis-main', 'Main', 'available'],
          ['muvi-uat-redis-payment', 'Payment', 'available'],
          ['muvi-uat-redis-fb', 'F&B', 'available'],
          ['muvi-uat-redis-notification', 'Notification', 'available'],
          ['muvi-uat-redis-offer', 'Offer', 'available'],
          ['muvi-uat-redis-shared', 'Shared', 'available'],
          ['muvi-uat-redis-bulk-refund', 'Bulk Refund', 'available'],
        ],
      },
      detail: {
        description: 'Each microservice has its own dedicated Redis cluster for Bull queues, caching, and Pub/Sub. This mirrors production exactly — per-service isolation ensures accurate load testing (no cross-service Redis contention).',
        sections: [
          {
            title: '📍 Endpoints (port 6379)',
            type: 'table',
            headers: ['Service', 'Endpoint', 'Status'],
            rows: [
              ['Gateway', 'muvi-uat-redis-gateway.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Identity', 'muvi-uat-redis-identity.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Main', 'muvi-uat-redis-main.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Payment', 'muvi-uat-redis-payment.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['F&B', 'muvi-uat-redis-fb.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Notification', 'muvi-uat-redis-notification.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Offer', 'muvi-uat-redis-offer.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Shared', 'muvi-uat-redis-shared.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
              ['Bulk Refund', 'muvi-uat-redis-bulk-refund.c6kxj3.ng.0001.mec1.cache.amazonaws.com', 'available'],
            ],
          },
          {
            title: '⚙️ Configuration (same for all 9)',
            type: 'kv',
            data: [
              ['Node Type', 'cache.t3.medium (3.09 GB memory)'],
              ['Engine', 'Redis 7.0.7'],
              ['Parameter Group', 'default.redis7'],
              ['Cluster Mode', 'Disabled'],
              ['Auto-Failover', 'Disabled'],
              ['Multi-AZ', 'Disabled'],
              ['Nodes per Cluster', '1'],
              ['Subnet Group', 'muvi-uat-uae (2 subnets in Main VPC)'],
              ['Security Group', 'redis-uat-sg (sg-0731967bbd5ef6e51)'],
            ],
          },
          {
            title: '📊 Prod vs UAE Comparison',
            type: 'table',
            headers: ['Aspect', 'Prod (eu-central-1)', 'UAE (me-central-1)'],
            rows: [
              ['Total Clusters', '9', '9 ✅'],
              ['Per-service isolation', 'Yes', 'Yes ✅'],
              ['Engine Version', '7.0.7', '7.0.7 ✅'],
              ['Main/Notification size', 'cache.r5.large', 'cache.t3.medium (downsized for UAT)'],
              ['Other services', 'cache.t3.medium', 'cache.t3.medium ✅'],
              ['Cluster Mode', 'Disabled', 'Disabled ✅'],
            ],
          },
        ],
      },
    },

    /* ────────── 7. ECS CLUSTER ────────── */
    {
      id: 'ecs',
      icon: '🚀',
      title: 'ECS Cluster',
      subtitle: 'Fargate · 0 services running · Phase 5',
      status: 'pending',
      costPerMonth: 0,
      glow: 'yellow',
      stats: [
        { value: '1', label: 'Cluster' },
        { value: '0', label: 'Services' },
        { value: '0', label: 'Tasks' },
        { value: '$0', label: 'Current' },
      ],
      table: {
        headers: ['Resource', 'Value', 'Status'],
        rows: [
          ['Cluster', 'Muvi-Cluster', 'active'],
          ['Services', '0 of 7 planned', 'pending'],
          ['Task Definitions', 'Not created', 'pending'],
          ['ECR Repositories', 'Not created', 'pending'],
        ],
      },
      detail: {
        description: 'The ECS cluster exists but has zero services. Phase 5 will create 7 services (gateway, identity, main, payment, fb, notification, offer), their task definitions, ECR repositories, and container images.',
        sections: [
          {
            title: '📋 Planned Services (Phase 5)',
            type: 'table',
            headers: ['Service', 'Port', 'Framework', 'Redis', 'Database'],
            rows: [
              ['Gateway', '3000', 'NestJS 8.4', 'muvi-uat-redis-gateway', 'muvi_gateway'],
              ['Identity', '5001', 'NestJS 8.4', 'muvi-uat-redis-identity', 'muvi_identity'],
              ['Main', '5002', 'NestJS 8.4', 'muvi-uat-redis-main', 'muvi_main'],
              ['Payment', '5003', 'NestJS 8.4', 'muvi-uat-redis-payment', 'muvi_payment'],
              ['F&B', '5004', 'NestJS 9.4', 'muvi-uat-redis-fb', 'muvi_fb'],
              ['Notification', '5005', 'NestJS 8.4', 'muvi-uat-redis-notification', 'muvi_notification'],
              ['Offer', '5006', 'Go 1.24', 'muvi-uat-redis-offer', '(uses main DB)'],
            ],
          },
          {
            title: '⏳ What\'s Needed',
            type: 'note',
            text: 'Phase 5 is the biggest phase (~3-4 hours). It requires: creating 7 ECR repos, building Docker images for each service, creating task definitions with correct env vars pointing to UAE Redis/Aurora/Proxies, registering ECS services, and verifying health checks.',
          },
        ],
      },
    },

    /* ────────── 8. S3 & CDN ────────── */
    {
      id: 's3',
      icon: '📦',
      title: 'S3 & CloudFront',
      subtitle: 'Not started · Phase 6',
      status: 'pending',
      costPerMonth: 0,
      glow: 'gray',
      stats: [
        { value: '0', label: 'Buckets' },
        { value: '0', label: 'Distros' },
        { value: '0', label: 'WAF' },
        { value: '$0', label: 'Current' },
      ],
      table: {
        headers: ['Resource', 'Status'],
        rows: [
          ['S3 Buckets', 'Not created (Phase 6)'],
          ['CloudFront Distributions', 'Not created (Phase 6)'],
          ['WAF Web ACL', 'Not created (Phase 6)'],
        ],
      },
      detail: {
        description: 'Phase 6 will create S3 buckets for static assets, CloudFront distributions for CDN delivery, and WAF rules for rate limiting and security.',
        sections: [
          {
            title: '📋 Planned Resources',
            type: 'note',
            text: 'S3 buckets for static assets (film posters, banners, uploads), CloudFront distribution for CDN caching, and WAF Web ACL with rate limiting rules (100 req/60s default, 5 req/60s for orders).',
          },
        ],
      },
    },

    /* ────────── 9. SSM & SECRETS ────────── */
    {
      id: 'ssm',
      icon: '🔐',
      title: 'SSM & Secrets',
      subtitle: 'Not started · Phase 7',
      status: 'pending',
      costPerMonth: 0,
      glow: 'gray',
      stats: [
        { value: '6', label: 'DB Secrets' },
        { value: '?', label: 'SSM Params' },
        { value: '—', label: 'API Keys' },
        { value: '$0', label: 'Current' },
      ],
      table: {
        headers: ['Resource', 'Status'],
        rows: [
          ['DB Secrets (6)', '✅ Created in Phase 2B'],
          ['SSM Parameters', 'Not migrated (Phase 7)'],
          ['Third-party API Keys', 'Not configured (Phase 9)'],
        ],
      },
      detail: {
        description: 'SSM Parameter Store holds all service configuration (API URLs, feature flags, third-party credentials). Phase 7 will migrate ~200+ parameters from Frankfurt. DB secrets already exist from Phase 2B.',
        sections: [
          {
            title: '✅ Already Created',
            type: 'table',
            headers: ['Secret', 'Service', 'Created'],
            rows: [
              ['uat-main-db-secret', 'Main', 'Phase 2B'],
              ['uat-identity-db-secret', 'Identity', 'Phase 2B'],
              ['uat-payment-db-secret', 'Payment', 'Phase 2B'],
              ['uat-fb-db-secret', 'F&B', 'Phase 2B'],
              ['uat-notification-db-secret', 'Notification', 'Phase 2B'],
              ['uat-offer-db-secret', 'Offer', 'Phase 2B'],
            ],
          },
        ],
      },
    },

    /* ────────── 10. CI/CD ────────── */
    {
      id: 'cicd',
      icon: '🔄',
      title: 'CI/CD Pipeline',
      subtitle: 'Not started · Phase 8',
      status: 'pending',
      costPerMonth: 0,
      glow: 'gray',
      stats: [
        { value: '0', label: 'Pipelines' },
        { value: '0', label: 'Builds' },
        { value: '—', label: 'Last Build' },
        { value: '$0', label: 'Current' },
      ],
      table: {
        headers: ['Resource', 'Status'],
        rows: [
          ['CodePipeline', 'Not created (Phase 8)'],
          ['CodeBuild Projects', 'Not created (Phase 8)'],
          ['GitHub Webhooks', 'Not configured (Phase 8)'],
        ],
      },
      detail: {
        description: 'Phase 8 will create CodePipeline + CodeBuild for each microservice, triggered by GitHub pushes. Each pipeline will build Docker images, push to ECR, and deploy to ECS.',
        sections: [
          {
            title: '📋 Planned Pipelines',
            type: 'note',
            text: '7 CodePipeline pipelines (one per service), 7 CodeBuild projects, GitHub webhook integration, and ECR push + ECS deploy stages.',
          },
        ],
      },
    },

    /* ────────── 11. COST SUMMARY ────────── */
    {
      id: 'cost',
      icon: '💰',
      title: 'Cost Summary',
      subtitle: 'Current spend · Projections',
      status: 'available',
      costPerMonth: null,
      glow: 'blue',
      stats: [
        { value: '$1,304', label: 'Projected' },
        { value: '$1,080', label: 'Current Active' },
        { value: '5/13', label: 'Phases Done' },
        { value: '~10d', label: 'Remaining' },
      ],
      table: {
        headers: ['Resource', 'Monthly Cost', 'Phase'],
        rows: [
          ['Aurora (2 instances)', '$188', '✅ Phase 2'],
          ['RDS Proxies (6)', '$265', '✅ Phase 2B'],
          ['ALBs (3)', '$54', '✅ Phase 3'],
          ['NAT Gateway', '$33', '✅ Phase 3'],
          ['Redis (9 clusters)', '$540', '✅ Phase 4'],
          ['ECS Fargate (7 svc)', '$200', '⬜ Phase 5'],
          ['S3/CloudFront/WAF', '$16', '⬜ Phase 6'],
          ['SSM/Secrets', '$3', '⬜ Phase 7'],
          ['CI/CD', '$9', '⬜ Phase 8'],
        ],
      },
      detail: {
        description: 'Full projected cost once all phases are complete. Current active cost is only for resources already created (Phases 1-4). ECS services ($200/mo) will be the final major cost when Phase 5 is done.',
        sections: [
          {
            title: '💡 Cost Optimization Options',
            type: 'table',
            headers: ['Optimization', 'Saving', 'Effort'],
            rows: [
              ['Stop ECS outside business hours', '~40% ($220/mo)', 'Low (EventBridge)'],
              ['Use Fargate Spot for non-critical', '~70% on those', 'Low'],
              ['Stop Aurora outside hours', '~$60/mo', 'Medium'],
              ['Sleep Mode (control panel)', '~90% when off', 'Phase 13'],
            ],
          },
          {
            title: '📊 Frankfurt vs UAE',
            type: 'note',
            text: 'After Phase 11 (decommission Frankfurt), net savings are estimated at $650-800/mo ($7,800-$9,600/yr). UAE infrastructure is newer, cleaner, and has better architecture (Aurora cluster vs 6 separate RDS instances).',
          },
        ],
      },
    },

  ], // end cards
};
