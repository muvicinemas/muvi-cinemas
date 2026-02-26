/* ================================================================
   Muvi UAE – AWS Ecosystem Dashboard  ·  Live Polling Server
   ────────────────────────────────────────────────────────────
   Runs AWS CLI commands every 30s and serves live infra state.
   
   Usage:
     node server.js              (default port 8888)
     node server.js --port 9999  (custom port)
   
   Then open: http://localhost:8888
   ================================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '8888');
const REGION = 'me-central-1';
const POLL_INTERVAL = 30_000; // 30 seconds

// ─── MIME TYPES ───
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ─── LIVE INFRA STATE ───
let liveInfra = null;
let lastPollTime = null;
let pollError = null;
let pollCount = 0;

// ─── ACTION STATE ───
let actionInProgress = null;  // e.g. { resource: 'aurora', action: 'stop', startedAt: ... }
const actionLog = [];         // history of all actions

// ─── SAVED CONFIGS (for recreating deleted resources) ───
const SAVED_CONFIGS_PATH = path.join(__dirname, '.saved-configs.json');
function loadSavedConfigs() {
  try { return JSON.parse(fs.readFileSync(SAVED_CONFIGS_PATH, 'utf8')); } catch { return {}; }
}
function saveSavedConfigs(configs) {
  fs.writeFileSync(SAVED_CONFIGS_PATH, JSON.stringify(configs, null, 2));
}

// ─── SWITCHABLE RESOURCE DEFINITIONS ───
const SWITCHABLE = {
  aurora: {
    label: 'Aurora Database',
    cost: 188,
    canSwitch: true,
    stopDesc: 'Stops the Aurora cluster "uatclusterdb". Both writer and reader instances will be stopped. The cluster can be stopped for up to 7 days before AWS auto-restarts it. All database connections will be severed immediately.',
    startDesc: 'Starts the Aurora cluster "uatclusterdb". Writer and reader instances will boot up. Takes 5-10 minutes to become available. All RDS Proxy connections will resume automatically.',
    stopWarnings: [
      'All active database connections will be dropped',
      'RDS Proxies will show errors until cluster restarts',
      'Local development (docker-compose) will lose DB access',
      'AWS auto-restarts stopped clusters after 7 days',
    ],
    startWarnings: [
      'Takes 5-10 minutes to become fully available',
      'RDS Proxies will auto-reconnect once cluster is up',
    ],
  },
  'rds-proxies': {
    label: 'RDS Proxies',
    cost: 265,
    canSwitch: true,
    stopDesc: 'Deletes all 6 RDS Proxies (no pause API exists). Proxy configurations are saved locally so they can be recreated with one click. ECS services will need to connect directly to Aurora until proxies are restored.',
    startDesc: 'Recreates all 6 RDS Proxies from saved configurations. Each proxy takes ~2 minutes to become available. ECS services will automatically use proxy endpoints once ready.',
    stopWarnings: [
      'Proxies will be DELETED (AWS has no pause for proxies)',
      'Configuration is saved locally in .saved-configs.json',
      'ECS services lose connection pooling until recreated',
      'Recreating takes ~2 min per proxy',
    ],
    startWarnings: [
      'Recreates from saved config — takes ~2 min per proxy',
      'Requires .saved-configs.json from previous stop action',
    ],
  },
  redis: {
    label: 'Redis Clusters',
    cost: 540,
    canSwitch: true,
    stopDesc: 'Creates a final snapshot of each Redis cluster, then deletes all 9 clusters. Snapshots are saved so clusters can be restored. All Bull queues, caching, and Pub/Sub will stop working.',
    startDesc: 'Restores all 9 Redis clusters from their snapshots. Each cluster takes ~5 minutes to become available. Bull queues and caching will resume automatically.',
    stopWarnings: [
      'All 9 Redis clusters will be DELETED',
      'Final snapshots are taken before deletion',
      'Bull queues, sessions, caching all stop immediately',
      'Restoration takes ~5 min per cluster (~45 min total)',
    ],
    startWarnings: [
      'Restores from snapshots — takes ~5 min per cluster',
      'Requires snapshots from previous stop action',
      'Queue data from before snapshot will be available',
    ],
  },
  ecs: {
    label: 'ECS Services',
    cost: 200,
    canSwitch: true,
    stopDesc: 'Scales all ECS services to 0 desired tasks. The service definitions remain — only the running containers are stopped. No API requests will be processed until services are scaled back up.',
    startDesc: 'Scales all ECS services back to their original desired count. Containers will pull latest images and start. Takes 2-3 minutes for health checks to pass.',
    stopWarnings: [
      'All running Fargate tasks will be stopped',
      'No API traffic will be processed',
      'Service definitions are preserved (instant scale-back)',
      'Cheapest and safest switch — recommended',
    ],
    startWarnings: [
      'Scales services back to original desired count',
      'Takes 2-3 min for containers to start and pass health checks',
    ],
  },
};

// ─── AWS CLI HELPER (async — does NOT block event loop) ───
async function aws(command, region = REGION, profile = null) {
  try {
    const profileFlag = profile ? ` --profile ${profile}` : '';
    const cmd = `aws ${command} --region ${region}${profileFlag} --output json`;
    const { stdout } = await execAsync(cmd, { encoding: 'utf8', timeout: 20000, maxBuffer: 5 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (e) {
    console.error(`  ✗ AWS CLI error: ${e.message.split('\n')[0]}`);
    return null;
  }
}

let isPolling = false;

// ─── POLL ALL RESOURCES (fully async — event loop stays free) ───
async function pollAWS() {
  if (isPolling) { console.log('  ⏭ Skipping — previous poll still running'); return; }
  isPolling = true;
  const start = Date.now();
  pollCount++;
  console.log(`\n⟳ Poll #${pollCount} starting at ${new Date().toLocaleTimeString()}...`);

  try {
    // ── Run independent queries in parallel batches ──
    console.log('  ↳ Batch 1: Aurora, RDS Proxies, Redis...');
    const [dbClusters, dbInstances, proxies, redis, redisClusters] = await Promise.all([
      aws('rds describe-db-clusters --query "DBClusters[?DBClusterIdentifier==\'uatclusterdb\']"'),
      aws('rds describe-db-instances --query "DBInstances[?DBClusterIdentifier==\'uatclusterdb\']"'),
      aws('rds describe-db-proxies --query "DBProxies[?starts_with(DBProxyName,\'uat-\')]"'),
      aws('elasticache describe-replication-groups'),
      aws('elasticache describe-cache-clusters --show-cache-node-info'),
    ]);

    console.log('  ↳ Batch 2: ALBs, ECS, SGs, VPC Peering...');
    const [albs, targetGroups, ecsClusters, ecsServices, sgs, peering] = await Promise.all([
      aws('elbv2 describe-load-balancers'),
      aws('elbv2 describe-target-groups'),
      aws('ecs describe-clusters --clusters Muvi-Cluster --include STATISTICS'),
      aws('ecs list-services --cluster Muvi-Cluster'),
      aws('ec2 describe-security-groups --filters "Name=vpc-id,Values=vpc-0ab936370488229bd"'),
      aws('ec2 describe-vpc-peering-connections --filters "Name=status-code,Values=active"'),
    ]);

    // ── Build INFRA object ──
    liveInfra = buildInfraObject({
      dbClusters, dbInstances, proxies, redis, redisClusters,
      albs, targetGroups, ecsClusters, ecsServices, sgs, peering,
    });

    lastPollTime = new Date().toISOString();
    pollError = null;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✓ Poll #${pollCount} complete in ${elapsed}s — ${liveInfra.cards.length} cards built`);
  } catch (e) {
    pollError = e.message;
    console.error(`  ✗ Poll #${pollCount} failed: ${e.message}`);
  } finally {
    isPolling = false;
  }
}

// ─── BUILD INFRA OBJECT FROM AWS RESPONSES ───
function buildInfraObject(raw) {
  const infra = {
    meta: {
      region: REGION,
      account: '739991759290',
      environment: 'UAT PROD',
      lastUpdated: new Date().toISOString(),
      totalMonthlyCost: 1304,
      sourceAccount: '011566070219',
      sourceRegion: 'eu-central-1',
      isLive: true,
      pollInterval: POLL_INTERVAL / 1000,
    },
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
    cards: [],
  };

  // ── AURORA CARD ──
  infra.cards.push(buildAuroraCard(raw.dbClusters, raw.dbInstances));

  // ── RDS PROXIES CARD ──
  infra.cards.push(buildProxiesCard(raw.proxies));

  // ── VPC & NETWORKING CARD ──
  infra.cards.push(buildNetworkCard(raw.peering));

  // ── ALB CARD ──
  infra.cards.push(buildALBCard(raw.albs, raw.targetGroups));

  // ── SECURITY GROUPS CARD ──
  infra.cards.push(buildSGCard(raw.sgs));

  // ── REDIS CARD ──
  infra.cards.push(buildRedisCard(raw.redis, raw.redisClusters));

  // ── ECS CARD ──
  infra.cards.push(buildECSCard(raw.ecsClusters, raw.ecsServices));

  // ── STATIC PENDING CARDS ──
  infra.cards.push(buildPendingCard('s3', '📦', 'S3 & CloudFront', 'Not started · Phase 6', 'Phase 6 will create S3 buckets, CloudFront distributions, and WAF rules.'));
  infra.cards.push(buildPendingCard('ssm', '🔐', 'SSM & Secrets', '6 DB secrets created · Phase 7', 'SSM Parameter Store migration and third-party credentials configuration.'));
  infra.cards.push(buildPendingCard('cicd', '🔄', 'CI/CD Pipeline', 'Not started · Phase 8', 'CodePipeline + CodeBuild for automated deployments.'));

  // ── COST CARD ──
  infra.cards.push(buildCostCard(infra.cards));

  return infra;
}

// ─── CARD BUILDERS ───

function buildAuroraCard(clusters, instances) {
  const cluster = clusters?.[0];
  const insts = instances || [];
  const clusterStatus = cluster?.Status || 'unknown';
  const status = clusterStatus === 'available' ? 'available' : clusterStatus === 'creating' ? 'creating' : 'pending';

  const rows = insts.map(i => [
    i.DBInstanceIdentifier || '—',
    i.IsClusterWriter ? 'Writer' : 'Reader',
    i.DBInstanceClass || '—',
    i.AvailabilityZone || '—',
    i.DBInstanceStatus || '—',
  ]);

  return {
    id: 'aurora',
    icon: '🗄️',
    title: 'Aurora Database',
    subtitle: `PostgreSQL ${cluster?.EngineVersion || '?'} · ${clusterStatus}`,
    status,
    costPerMonth: 188,
    glow: status === 'available' ? 'green' : 'yellow',
    stats: [
      { value: '1', label: 'Cluster' },
      { value: String(insts.length), label: 'Instances' },
      { value: '6', label: 'Databases' },
      { value: '52.9M', label: 'Rows' },
    ],
    table: {
      headers: ['Instance', 'Role', 'Class', 'AZ', 'Status'],
      rows,
    },
    detail: {
      description: `Aurora PostgreSQL cluster "${cluster?.DBClusterIdentifier || 'uatclusterdb'}". Real-time status: ${clusterStatus}. Engine: ${cluster?.Engine || '?'} ${cluster?.EngineVersion || '?'}.`,
      sections: [
        {
          title: '📍 Endpoints (Live)',
          type: 'kv',
          data: [
            ['Cluster ID', cluster?.DBClusterIdentifier || 'uatclusterdb'],
            ['Writer', cluster?.Endpoint || '—'],
            ['Reader', cluster?.ReaderEndpoint || '—'],
            ['Port', String(cluster?.Port || 5432)],
            ['Status', clusterStatus],
            ['Multi-AZ', cluster?.MultiAZ ? 'Yes' : 'No'],
            ['Encryption', cluster?.StorageEncrypted ? 'Enabled' : 'Disabled'],
            ['Deletion Protection', cluster?.DeletionProtection ? 'Enabled' : 'Disabled'],
          ],
        },
        {
          title: '🖥️ Instances (Live)',
          type: 'table',
          headers: ['Instance', 'Role', 'Class', 'AZ', 'Status', 'Engine'],
          rows: insts.map(i => [
            i.DBInstanceIdentifier,
            i.IsClusterWriter ? '✍️ Writer' : '📖 Reader',
            i.DBInstanceClass,
            i.AvailabilityZone,
            i.DBInstanceStatus,
            `${i.Engine} ${i.EngineVersion}`,
          ]),
        },
      ],
    },
  };
}

function buildProxiesCard(proxies) {
  const list = proxies || [];
  const allAvailable = list.length > 0 && list.every(p => p.Status === 'available');
  const status = list.length === 0 ? 'pending' : allAvailable ? 'available' : 'creating';

  return {
    id: 'rds-proxies',
    icon: '🔀',
    title: 'RDS Proxies',
    subtitle: `${list.length} proxies · Connection pooling`,
    status,
    costPerMonth: list.length * 44,
    glow: status === 'available' ? 'green' : 'yellow',
    stats: [
      { value: String(list.length), label: 'Proxies' },
      { value: String(list.length), label: 'Read EP' },
      { value: 'IAM', label: 'Auth' },
      { value: `~$${list.length * 44}`, label: '/month' },
    ],
    table: {
      headers: ['Proxy', 'Engine', 'Status', 'VPC'],
      rows: list.map(p => [
        p.DBProxyName,
        p.EngineFamily || '—',
        p.Status,
        p.VpcId?.slice(-12) || '—',
      ]),
    },
    detail: {
      description: `${list.length} RDS Proxies providing connection pooling between ECS Fargate tasks and Aurora. Each proxy targets the Aurora cluster.`,
      sections: [
        {
          title: '📍 Proxy Endpoints (Live)',
          type: 'table',
          headers: ['Proxy', 'Endpoint', 'Status', 'Idle Timeout'],
          rows: list.map(p => [
            p.DBProxyName,
            p.Endpoint || '—',
            p.Status,
            `${p.IdleClientTimeout || 1800}s`,
          ]),
        },
      ],
    },
  };
}

function buildNetworkCard(peering) {
  const peers = peering?.VpcPeeringConnections || [];
  const activePeer = peers[0];

  return {
    id: 'networking',
    icon: '🌐',
    title: 'VPC & Networking',
    subtitle: `2 VPCs · ${peers.length} peering · NAT`,
    status: 'available',
    costPerMonth: 33,
    glow: 'green',
    stats: [
      { value: '2', label: 'VPCs' },
      { value: String(peers.length), label: 'Peering' },
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
      description: 'Two VPCs connected via VPC Peering. Main VPC hosts all compute. Database VPC hosts Aurora and RDS Proxies.',
      sections: [
        {
          title: '🔗 VPC Peering (Live)',
          type: 'kv',
          data: activePeer ? [
            ['Peering ID', activePeer.VpcPeeringConnectionId],
            ['Status', activePeer.Status?.Code || '—'],
            ['Requester VPC', activePeer.RequesterVpcInfo?.VpcId || '—'],
            ['Requester CIDR', activePeer.RequesterVpcInfo?.CidrBlock || '—'],
            ['Accepter VPC', activePeer.AccepterVpcInfo?.VpcId || '—'],
            ['Accepter CIDR', activePeer.AccepterVpcInfo?.CidrBlock || '—'],
          ] : [['Status', 'No active peering found']],
        },
      ],
    },
  };
}

function buildALBCard(albs, targetGroups) {
  const lbs = albs?.LoadBalancers || [];
  const tgs = targetGroups?.TargetGroups || [];
  const allActive = lbs.length > 0 && lbs.every(l => l.State?.Code === 'active');
  const status = lbs.length === 0 ? 'pending' : allActive ? 'available' : 'creating';

  return {
    id: 'albs',
    icon: '⚖️',
    title: 'Load Balancers',
    subtitle: `${lbs.length} ALBs · ${tgs.length} Target Groups`,
    status,
    costPerMonth: lbs.length * 18,
    glow: status === 'available' ? 'green' : 'yellow',
    stats: [
      { value: String(lbs.length), label: 'ALBs' },
      { value: String(tgs.length), label: 'Targets' },
      { value: '—', label: 'Listeners' },
      { value: `~$${lbs.length * 18}`, label: '/month' },
    ],
    table: {
      headers: ['ALB', 'Scheme', 'State', 'DNS'],
      rows: lbs.map(l => [
        l.LoadBalancerName,
        l.Scheme || '—',
        l.State?.Code || '—',
        (l.DNSName || '—').slice(0, 45) + '…',
      ]),
    },
    detail: {
      description: `${lbs.length} Application Load Balancers with ${tgs.length} target groups. Public ALB for API, Internal for gRPC, Website for frontend.`,
      sections: [
        {
          title: '⚖️ Load Balancers (Live)',
          type: 'table',
          headers: ['Name', 'Scheme', 'Type', 'State', 'AZs'],
          rows: lbs.map(l => [
            l.LoadBalancerName,
            l.Scheme,
            l.Type,
            l.State?.Code || '—',
            (l.AvailabilityZones || []).map(z => z.ZoneName).join(', '),
          ]),
        },
        {
          title: '🎯 Target Groups (Live)',
          type: 'table',
          headers: ['Name', 'Port', 'Protocol', 'Target Type', 'Health'],
          rows: tgs.map(t => [
            t.TargetGroupName,
            String(t.Port),
            t.Protocol,
            t.TargetType,
            t.HealthCheckPath || '—',
          ]),
        },
      ],
    },
  };
}

function buildSGCard(sgs) {
  const groups = sgs?.SecurityGroups || [];
  const ecsSGs = groups.filter(g => g.GroupName.includes('ecs-sg'));
  const albSGs = groups.filter(g => g.GroupName.includes('alb-sg'));
  const redisSG = groups.find(g => g.GroupName.includes('redis'));

  return {
    id: 'security-groups',
    icon: '🛡️',
    title: 'Security Groups',
    subtitle: `${groups.length} SGs · VPC firewall rules`,
    status: 'available',
    costPerMonth: 0,
    glow: 'blue',
    stats: [
      { value: String(groups.length), label: 'Total SGs' },
      { value: String(ecsSGs.length), label: 'ECS SGs' },
      { value: String(albSGs.length), label: 'ALB SGs' },
      { value: '$0', label: '/month' },
    ],
    table: {
      headers: ['Security Group', 'ID', 'Rules'],
      rows: groups
        .filter(g => g.GroupName !== 'default')
        .sort((a, b) => a.GroupName.localeCompare(b.GroupName))
        .slice(0, 10)
        .map(g => [
          g.GroupName,
          g.GroupId,
          `${(g.IpPermissions || []).length} in / ${(g.IpPermissionsEgress || []).length} out`,
        ]),
    },
    detail: {
      description: `${groups.length} Security Groups in Main VPC. Each ECS service has its own SG. Redis SG allows port 6379 only from ECS SGs.`,
      sections: [
        {
          title: '🔒 All Security Groups (Live)',
          type: 'table',
          headers: ['Name', 'SG ID', 'Description', 'Inbound Rules', 'Outbound Rules'],
          rows: groups
            .filter(g => g.GroupName !== 'default')
            .sort((a, b) => a.GroupName.localeCompare(b.GroupName))
            .map(g => [
              g.GroupName,
              g.GroupId,
              (g.Description || '—').slice(0, 40),
              String((g.IpPermissions || []).length),
              String((g.IpPermissionsEgress || []).length),
            ]),
        },
        redisSG ? {
          title: '🔑 Redis SG Inbound Rules (Live)',
          type: 'table',
          headers: ['Protocol', 'Port', 'Source SG', 'Description'],
          rows: (redisSG.IpPermissions || []).flatMap(rule =>
            (rule.UserIdGroupPairs || []).map(pair => [
              rule.IpProtocol,
              `${rule.FromPort}-${rule.ToPort}`,
              pair.GroupId,
              pair.Description || '—',
            ])
          ),
        } : {
          title: '🔑 Redis SG',
          type: 'note',
          text: 'Redis security group not found in query results.',
        },
      ],
    },
  };
}

function buildRedisCard(redis, clusters) {
  const rgs = (redis?.ReplicationGroups || []).filter(r => r.ReplicationGroupId !== 'muvi-uat-redis-uae-classic');
  const allAvailable = rgs.length > 0 && rgs.every(r => r.Status === 'available');
  const status = rgs.length === 0 ? 'pending' : allAvailable ? 'available' : 'creating';

  // match clusters to replication groups for endpoints
  const clusterList = clusters?.CacheClusters || [];
  const endpointMap = {};
  clusterList.forEach(c => {
    const rgId = c.ReplicationGroupId;
    if (rgId && c.CacheNodes?.[0]?.Endpoint) {
      endpointMap[rgId] = c.CacheNodes[0].Endpoint.Address;
    }
  });

  const serviceMap = {
    'muvi-uat-redis-gateway': 'Gateway',
    'muvi-uat-redis-identity': 'Identity',
    'muvi-uat-redis-main': 'Main',
    'muvi-uat-redis-payment': 'Payment',
    'muvi-uat-redis-fb': 'F&B',
    'muvi-uat-redis-notification': 'Notification',
    'muvi-uat-redis-offer': 'Offer',
    'muvi-uat-redis-shared': 'Shared',
    'muvi-uat-redis-bulk-refund': 'Bulk Refund',
  };

  return {
    id: 'redis',
    icon: '⚡',
    title: 'Redis Clusters',
    subtitle: `${rgs.length} clusters · Per-service isolation`,
    status,
    costPerMonth: rgs.length * 60,
    glow: status === 'available' ? 'green' : 'yellow',
    stats: [
      { value: String(rgs.length), label: 'Clusters' },
      { value: rgs[0]?.CacheNodeType?.replace('cache.', '') || '—', label: 'Node Type' },
      { value: '7.0', label: 'Engine' },
      { value: `~$${rgs.length * 60}`, label: '/month' },
    ],
    table: {
      headers: ['Cluster', 'Service', 'Node Type', 'Status'],
      rows: rgs.map(r => [
        r.ReplicationGroupId,
        serviceMap[r.ReplicationGroupId] || '—',
        r.CacheNodeType || '—',
        r.Status,
      ]),
    },
    detail: {
      description: `${rgs.length} dedicated Redis replication groups. Each microservice has its own Redis for Bull queues, caching, and Pub/Sub isolation.`,
      sections: [
        {
          title: '📍 Endpoints (Live · port 6379)',
          type: 'table',
          headers: ['Service', 'Cluster ID', 'Endpoint', 'Status'],
          rows: rgs.map(r => [
            serviceMap[r.ReplicationGroupId] || '—',
            r.ReplicationGroupId,
            r.NodeGroups?.[0]?.PrimaryEndpoint?.Address || endpointMap[r.ReplicationGroupId] || '—',
            r.Status,
          ]),
        },
        {
          title: '⚙️ Configuration (Live)',
          type: 'kv',
          data: rgs[0] ? [
            ['Node Type', rgs[0].CacheNodeType || '—'],
            ['Cluster Mode', rgs[0].ClusterEnabled ? 'Enabled' : 'Disabled'],
            ['Auto-Failover', rgs[0].AutomaticFailover || '—'],
            ['Multi-AZ', rgs[0].MultiAZ || '—'],
            ['Nodes per Cluster', String(rgs[0].MemberClusters?.length || 1)],
          ] : [['Status', 'No clusters found']],
        },
      ],
    },
  };
}

function buildECSCard(ecsClusters, ecsServices) {
  const cluster = ecsClusters?.clusters?.[0];
  const serviceArns = ecsServices?.serviceArns || [];
  const activeCount = cluster?.activeServicesCount || 0;
  const runningTasks = cluster?.runningTasksCount || 0;
  const status = activeCount > 0 ? 'available' : cluster ? 'pending' : 'pending';

  return {
    id: 'ecs',
    icon: '🚀',
    title: 'ECS Cluster',
    subtitle: `Fargate · ${activeCount} services · ${runningTasks} tasks`,
    status,
    costPerMonth: activeCount > 0 ? activeCount * 30 : 0,
    glow: activeCount > 0 ? 'green' : 'yellow',
    stats: [
      { value: cluster ? '1' : '0', label: 'Cluster' },
      { value: String(activeCount), label: 'Services' },
      { value: String(runningTasks), label: 'Tasks' },
      { value: activeCount > 0 ? `~$${activeCount * 30}` : '$0', label: 'Current' },
    ],
    table: {
      headers: ['Resource', 'Value', 'Status'],
      rows: [
        ['Cluster', cluster?.clusterName || 'Muvi-Cluster', cluster?.status || 'unknown'],
        ['Active Services', `${activeCount} of 7 planned`, activeCount >= 7 ? 'available' : 'pending'],
        ['Running Tasks', String(runningTasks), runningTasks > 0 ? 'available' : 'pending'],
        ['Pending Tasks', String(cluster?.pendingTasksCount || 0), '—'],
      ],
    },
    detail: {
      description: `ECS Cluster "${cluster?.clusterName || 'Muvi-Cluster'}". Status: ${cluster?.status || 'unknown'}. Phase 5 will deploy 7 microservices as Fargate tasks.`,
      sections: [
        {
          title: '📊 Cluster Stats (Live)',
          type: 'kv',
          data: [
            ['Cluster Name', cluster?.clusterName || '—'],
            ['Status', cluster?.status || '—'],
            ['Active Services', String(activeCount)],
            ['Running Tasks', String(runningTasks)],
            ['Pending Tasks', String(cluster?.pendingTasksCount || 0)],
            ['Registered Instances', String(cluster?.registeredContainerInstancesCount || 0)],
          ],
        },
        serviceArns.length > 0 ? {
          title: '🔧 Services (Live)',
          type: 'table',
          headers: ['Service ARN'],
          rows: serviceArns.map(arn => [arn.split('/').pop()]),
        } : {
          title: '⏳ Planned Services',
          type: 'note',
          text: 'No services deployed yet. Phase 5 will create: Gateway (3000), Identity (5001), Main (5002), Payment (5003), F&B (5004), Notification (5005), Offer (5006).',
        },
      ],
    },
  };
}

function buildPendingCard(id, icon, title, subtitle, description) {
  return {
    id,
    icon,
    title,
    subtitle,
    status: 'pending',
    costPerMonth: 0,
    glow: 'gray',
    stats: [
      { value: '—', label: 'Resources' },
      { value: '—', label: 'Status' },
      { value: '—', label: 'Health' },
      { value: '$0', label: 'Current' },
    ],
    table: {
      headers: ['Resource', 'Status'],
      rows: [['Awaiting phase execution', 'Not started']],
    },
    detail: {
      description,
      sections: [{
        title: '⏳ Status',
        type: 'note',
        text: 'This resource group has not been created yet. It will be built in a future phase.',
      }],
    },
  };
}

function buildCostCard(cards) {
  const activeCost = cards.reduce((sum, c) => sum + (c.costPerMonth || 0), 0);
  const activeCards = cards.filter(c => c.status === 'available').length;
  const pendingCards = cards.filter(c => c.status === 'pending').length;

  return {
    id: 'cost',
    icon: '💰',
    title: 'Cost Summary',
    subtitle: `$${activeCost}/mo active · Live calculation`,
    status: 'available',
    costPerMonth: null,
    glow: 'blue',
    stats: [
      { value: `$${activeCost}`, label: 'Active' },
      { value: '$1,304', label: 'Projected' },
      { value: String(activeCards), label: 'Active' },
      { value: String(pendingCards), label: 'Pending' },
    ],
    table: {
      headers: ['Resource', 'Monthly Cost', 'Status'],
      rows: cards.filter(c => c.id !== 'cost').map(c => [
        c.title,
        c.costPerMonth !== null ? `$${c.costPerMonth}` : '—',
        c.status === 'available' ? 'Active' : 'Pending',
      ]),
    },
    detail: {
      description: `Live cost calculation from AWS resources. Active spend: $${activeCost}/mo. Projected total after all phases: $1,304/mo.`,
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
      ],
    },
  };
}

// ─── ACTION HANDLERS ───

async function handleAuroraStop() {
  console.log('  ⚡ ACTION: Stopping Aurora cluster...');
  const result = await aws('rds stop-db-cluster --db-cluster-identifier uatclusterdb');
  if (!result) throw new Error('Failed to stop Aurora cluster');
  return { message: 'Aurora cluster stop initiated. Takes ~2 min to fully stop.', result };
}

async function handleAuroraStart() {
  console.log('  ⚡ ACTION: Starting Aurora cluster...');
  const result = await aws('rds start-db-cluster --db-cluster-identifier uatclusterdb');
  if (!result) throw new Error('Failed to start Aurora cluster');
  return { message: 'Aurora cluster start initiated. Takes 5-10 min to become available.', result };
}

async function handleProxiesStop() {
  console.log('  ⚡ ACTION: Saving proxy configs and deleting...');
  // First save current proxy configs
  const proxies = await aws('rds describe-db-proxies --query "DBProxies[?starts_with(DBProxyName,\'uat-\')]"');
  if (!proxies || proxies.length === 0) throw new Error('No proxies found to stop');

  const configs = loadSavedConfigs();
  configs.proxies = [];

  for (const p of proxies) {
    // Save full config for recreation
    const targets = await aws(`rds describe-db-proxy-targets --db-proxy-name ${p.DBProxyName}`);
    configs.proxies.push({
      name: p.DBProxyName,
      engineFamily: p.EngineFamily,
      vpcSubnetIds: p.VpcSubnetIds,
      vpcSecurityGroupIds: p.VpcSecurityGroupIds,
      auth: p.Auth,
      roleArn: p.RoleArn,
      idleTimeout: p.IdleClientTimeout,
      targets: targets?.Targets || [],
    });
  }
  saveSavedConfigs(configs);
  console.log(`  ✓ Saved ${configs.proxies.length} proxy configs to .saved-configs.json`);

  // Delete each proxy
  const results = [];
  for (const p of proxies) {
    console.log(`  ↳ Deleting proxy: ${p.DBProxyName}...`);
    const r = await aws(`rds delete-db-proxy --db-proxy-name ${p.DBProxyName}`);
    results.push({ proxy: p.DBProxyName, success: !!r });
  }
  return { message: `${results.length} proxies deletion initiated. Configs saved for recreation.`, results };
}

async function handleProxiesStart() {
  console.log('  ⚡ ACTION: Recreating proxies from saved config...');
  const configs = loadSavedConfigs();
  if (!configs.proxies || configs.proxies.length === 0) throw new Error('No saved proxy configs found. Run stop first.');

  const results = [];
  for (const pc of configs.proxies) {
    console.log(`  ↳ Creating proxy: ${pc.name}...`);
    const authJson = JSON.stringify(pc.auth).replace(/"/g, '\\"');
    const subnetIds = pc.vpcSubnetIds.join(' ');
    const sgIds = pc.vpcSecurityGroupIds.join(' ');
    const r = await aws(
      `rds create-db-proxy --db-proxy-name ${pc.name}` +
      ` --engine-family ${pc.engineFamily}` +
      ` --auth "${authJson}"` +
      ` --role-arn ${pc.roleArn}` +
      ` --vpc-subnet-ids ${subnetIds}` +
      ` --vpc-security-group-ids ${sgIds}` +
      ` --idle-client-timeout ${pc.idleTimeout || 1800}`
    );
    results.push({ proxy: pc.name, success: !!r });
  }
  return { message: `${results.length} proxies creation initiated. Takes ~2 min each.`, results };
}

async function handleRedisStop() {
  console.log('  ⚡ ACTION: Snapshotting and deleting Redis clusters...');
  const redis = await aws('elasticache describe-replication-groups');
  const rgs = (redis?.ReplicationGroups || []).filter(r =>
    r.ReplicationGroupId.startsWith('muvi-uat-redis-') &&
    r.ReplicationGroupId !== 'muvi-uat-redis-uae-classic'
  );
  if (rgs.length === 0) throw new Error('No Redis clusters found to stop');

  const configs = loadSavedConfigs();
  configs.redis = rgs.map(r => ({
    id: r.ReplicationGroupId,
    description: r.Description,
    nodeType: r.CacheNodeType,
    snapshotName: `${r.ReplicationGroupId}-sleep-${Date.now()}`,
  }));
  saveSavedConfigs(configs);

  const results = [];
  for (const rc of configs.redis) {
    console.log(`  ↳ Deleting ${rc.id} with final snapshot ${rc.snapshotName}...`);
    const r = await aws(
      `elasticache delete-replication-group --replication-group-id ${rc.id}` +
      ` --final-snapshot-identifier ${rc.snapshotName}`
    );
    results.push({ cluster: rc.id, snapshot: rc.snapshotName, success: !!r });
  }
  return { message: `${results.length} Redis clusters deletion initiated with snapshots.`, results };
}

async function handleRedisStart() {
  console.log('  ⚡ ACTION: Restoring Redis clusters from snapshots...');
  const configs = loadSavedConfigs();
  if (!configs.redis || configs.redis.length === 0) throw new Error('No saved Redis configs found. Run stop first.');

  // Get the Redis security group
  const sgs = await aws('ec2 describe-security-groups --filters "Name=group-name,Values=redis-uat-sg"');
  const redisSgId = sgs?.SecurityGroups?.[0]?.GroupId;

  const results = [];
  for (const rc of configs.redis) {
    console.log(`  ↳ Restoring ${rc.id} from snapshot ${rc.snapshotName}...`);
    const sgFlag = redisSgId ? ` --security-group-ids ${redisSgId}` : '';
    const r = await aws(
      `elasticache create-replication-group --replication-group-id ${rc.id}` +
      ` --replication-group-description "${rc.description || rc.id}"` +
      ` --snapshot-name ${rc.snapshotName}` +
      sgFlag
    );
    results.push({ cluster: rc.id, success: !!r });
  }
  return { message: `${results.length} Redis clusters restoration initiated. Takes ~5 min each.`, results };
}

async function handleECSStop() {
  console.log('  ⚡ ACTION: Scaling ECS services to 0...');
  const ecsServices = await aws('ecs list-services --cluster Muvi-Cluster');
  const arns = ecsServices?.serviceArns || [];
  if (arns.length === 0) throw new Error('No ECS services found in Muvi-Cluster');

  // Save current desired counts
  const configs = loadSavedConfigs();
  const described = await aws(`ecs describe-services --cluster Muvi-Cluster --services ${arns.join(' ')}`);
  configs.ecs = (described?.services || []).map(s => ({
    name: s.serviceName,
    desiredCount: s.desiredCount,
  }));
  saveSavedConfigs(configs);

  const results = [];
  for (const svc of configs.ecs) {
    console.log(`  ↳ Scaling ${svc.name} to 0...`);
    const r = await aws(`ecs update-service --cluster Muvi-Cluster --service ${svc.name} --desired-count 0`);
    results.push({ service: svc.name, previousCount: svc.desiredCount, success: !!r });
  }
  return { message: `${results.length} services scaled to 0. Configs saved.`, results };
}

async function handleECSStart() {
  console.log('  ⚡ ACTION: Scaling ECS services back up...');
  const configs = loadSavedConfigs();
  if (!configs.ecs || configs.ecs.length === 0) throw new Error('No saved ECS configs found. Run stop first.');

  const results = [];
  for (const svc of configs.ecs) {
    const count = svc.desiredCount || 1;
    console.log(`  ↳ Scaling ${svc.name} to ${count}...`);
    const r = await aws(`ecs update-service --cluster Muvi-Cluster --service ${svc.name} --desired-count ${count}`);
    results.push({ service: svc.name, desiredCount: count, success: !!r });
  }
  return { message: `${results.length} services scaled back up.`, results };
}

const ACTION_MAP = {
  'aurora/stop': handleAuroraStop,
  'aurora/start': handleAuroraStart,
  'rds-proxies/stop': handleProxiesStop,
  'rds-proxies/start': handleProxiesStart,
  'redis/stop': handleRedisStop,
  'redis/start': handleRedisStart,
  'ecs/stop': handleECSStop,
  'ecs/start': handleECSStart,
};

// ─── HTTP SERVER ───
const server = http.createServer((req, res) => {

  // ── CORS preflight ──
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ── GET /api/infra ──
  if (req.url === '/api/infra' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify({
      data: liveInfra,
      meta: {
        pollCount,
        lastPollTime,
        pollError,
        pollIntervalMs: POLL_INTERVAL,
        nextPollIn: liveInfra ? Math.max(0, POLL_INTERVAL - (Date.now() - new Date(lastPollTime).getTime())) : 0,
        actionInProgress,
        switchable: Object.fromEntries(
          Object.entries(SWITCHABLE).map(([k, v]) => [k, {
            label: v.label, cost: v.cost, canSwitch: v.canSwitch,
            stopDesc: v.stopDesc, startDesc: v.startDesc,
            stopWarnings: v.stopWarnings, startWarnings: v.startWarnings,
          }])
        ),
      },
    }));
    return;
  }

  // ── GET /api/actions ── action log
  if (req.url === '/api/actions' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ actions: actionLog.slice(-20), actionInProgress }));
    return;
  }

  // ── POST /api/action/:resource/:action ──
  const actionMatch = req.url.match(/^\/api\/action\/([\w-]+)\/(start|stop)$/);
  if (actionMatch && req.method === 'POST') {
    const resource = actionMatch[1];
    const action = actionMatch[2];
    const key = `${resource}/${action}`;
    const handler = ACTION_MAP[key];

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: `Unknown action: ${key}` }));
      return;
    }

    if (actionInProgress) {
      res.writeHead(409, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: `Action already in progress: ${actionInProgress.resource}/${actionInProgress.action}` }));
      return;
    }

    // Execute action async — respond immediately
    actionInProgress = { resource, action, startedAt: new Date().toISOString() };
    console.log(`\n🎛️  ACTION REQUEST: ${key}`);

    handler().then(result => {
      actionLog.push({ resource, action, status: 'success', time: new Date().toISOString(), ...result });
      console.log(`  ✓ Action ${key} completed: ${result.message}`);
      // Trigger an immediate poll to refresh dashboard
      setTimeout(() => pollAWS(), 3000);
    }).catch(err => {
      actionLog.push({ resource, action, status: 'error', time: new Date().toISOString(), error: err.message });
      console.error(`  ✗ Action ${key} failed: ${err.message}`);
    }).finally(() => {
      actionInProgress = null;
    });

    res.writeHead(202, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ accepted: true, action: key, message: `Action ${key} initiated. Check dashboard for progress.` }));
    return;
  }

  // ── Static file serving ──
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// ─── START ───
console.log('╔════════════════════════════════════════════╗');
console.log('║  🎬 Muvi UAE — AWS Ecosystem Dashboard    ║');
console.log('║  Live Polling Server                       ║');
console.log('╠════════════════════════════════════════════╣');
console.log(`║  URL:     http://localhost:${PORT}             ║`);
console.log(`║  Region:  ${REGION}                    ║`);
console.log(`║  Poll:    Every ${POLL_INTERVAL / 1000}s                       ║`);
console.log('╚════════════════════════════════════════════╝');

// Initial poll (async — server starts immediately, poll runs in background)
pollAWS();
// Repeat every 30s
setInterval(() => pollAWS(), POLL_INTERVAL);

server.listen(PORT, () => {
  console.log(`\n✓ Server listening on http://localhost:${PORT}`);
  console.log('  Open this URL in your browser to see the live dashboard.\n');
});
