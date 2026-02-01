import type { ConnectorResult } from './types.js';

// Deterministic seed from query string for consistent mock data
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// --- Grafana Mock Data ---

export function mockGrafanaMetrics(query: string, timeRange: string): ConnectorResult {
  const rand = seededRandom(hashCode(query));
  const isHighCpu = query.toLowerCase().includes('cpu');
  const isMemory = query.toLowerCase().includes('memory') || query.toLowerCase().includes('mem');
  const isError = query.toLowerCase().includes('error') || query.toLowerCase().includes('5xx');
  const isLatency = query.toLowerCase().includes('latency') || query.toLowerCase().includes('duration');

  const baseValue = isHighCpu ? 72 + rand() * 25 : isMemory ? 55 + rand() * 30 : isError ? rand() * 15 : isLatency ? 120 + rand() * 400 : 40 + rand() * 50;
  const unit = isHighCpu ? '%' : isMemory ? '%' : isError ? 'errors/min' : isLatency ? 'ms' : '';
  const metricName = isHighCpu ? 'node_cpu_usage' : isMemory ? 'node_memory_usage_percent' : isError ? 'http_errors_total' : isLatency ? 'http_request_duration_ms' : 'custom_metric';

  const points = Array.from({ length: 6 }, (_, i) => {
    const t = Date.now() - (5 - i) * 60000;
    const v = baseValue + (rand() - 0.5) * 10;
    return `  ${new Date(t).toISOString()}: ${v.toFixed(2)}${unit}`;
  });

  const latest = baseValue.toFixed(2);
  const data = `Query: ${query}\nMetric: ${metricName}\nTime range: ${timeRange}\nLatest value: ${latest}${unit}\n\nTime series (last 6 points):\n${points.join('\n')}`;

  return { success: true, data, rawData: { status: 'success', metric: metricName, latest, unit } };
}

export function mockGrafanaAlerts(query: string): ConnectorResult {
  const alerts = [
    { name: 'HighCPUUsage', state: 'firing', severity: 'critical', value: '94.2%', since: '12 min ago' },
    { name: 'MemoryPressure', state: 'firing', severity: 'warning', value: '82.1%', since: '8 min ago' },
    { name: 'DiskSpaceLow', state: 'ok', severity: 'warning', value: '45.3%', since: 'N/A' },
    { name: 'ErrorRateHigh', state: 'firing', severity: 'critical', value: '12.4 err/min', since: '5 min ago' },
    { name: 'LatencyP99Elevated', state: 'pending', severity: 'warning', value: '520ms', since: '2 min ago' },
  ];

  const filtered = query ? alerts.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) || a.state === query.toLowerCase()) : alerts;
  const lines = filtered.map(a => `- [${a.state.toUpperCase()}] ${a.name} (${a.severity}): ${a.value} — since ${a.since}`);
  const data = `Alert Rules (${filtered.length} matching):\n${lines.join('\n')}`;

  return { success: true, data, rawData: filtered };
}

export function mockGrafanaDashboard(): ConnectorResult {
  const panels = [
    { title: 'API Request Rate', value: '1,247 req/s', trend: 'stable' },
    { title: 'Error Rate', value: '2.3%', trend: 'increasing' },
    { title: 'P95 Latency', value: '342ms', trend: 'increasing' },
    { title: 'Active Connections', value: '8,412', trend: 'stable' },
    { title: 'CPU Usage (avg)', value: '78.4%', trend: 'increasing' },
    { title: 'Memory Usage', value: '71.2%', trend: 'stable' },
  ];

  const lines = panels.map(p => `- ${p.title}: ${p.value} (${p.trend})`);
  const data = `Dashboard Overview:\n${lines.join('\n')}`;

  return { success: true, data, rawData: panels };
}

// --- Datadog Mock Data ---

export function mockDatadogMetrics(query: string, timeRange: string): ConnectorResult {
  const rand = seededRandom(hashCode(query));
  const isAvg = query.includes('avg:');
  const metricName = query.replace(/^(avg|max|min|sum):/, '').split('{')[0].trim();

  const baseValue = metricName.includes('cpu') ? 75 + rand() * 20 : metricName.includes('mem') ? 60 + rand() * 25 : metricName.includes('error') ? 5 + rand() * 20 : 100 + rand() * 500;

  const points = Array.from({ length: 5 }, (_, i) => {
    const t = Date.now() - (4 - i) * 60000;
    const v = baseValue + (rand() - 0.5) * 15;
    return `  ${new Date(t).toISOString()}: ${v.toFixed(2)}`;
  });

  const data = `Query: ${query}\nAggregation: ${isAvg ? 'average' : 'raw'}\nTime range: ${timeRange}\nLatest: ${baseValue.toFixed(2)}\n\nData points:\n${points.join('\n')}`;

  return { success: true, data, rawData: { status: 'ok', series: [{ metric: metricName, pointlist: points }] } };
}

export function mockDatadogMonitors(): ConnectorResult {
  const monitors = [
    { id: 12001, name: 'API Latency > 500ms', status: 'Alert', type: 'metric', tags: ['service:api', 'env:prod'] },
    { id: 12002, name: 'Error Rate > 5%', status: 'Alert', type: 'metric', tags: ['service:api', 'env:prod'] },
    { id: 12003, name: 'CPU Usage > 90%', status: 'Warn', type: 'metric', tags: ['host:web-01', 'env:prod'] },
    { id: 12004, name: 'Disk Usage > 80%', status: 'OK', type: 'metric', tags: ['host:web-01', 'env:prod'] },
    { id: 12005, name: 'Service Health Check', status: 'OK', type: 'synthetics', tags: ['service:api'] },
    { id: 12006, name: 'Database Connection Pool', status: 'Warn', type: 'metric', tags: ['service:db', 'env:prod'] },
  ];

  const lines = monitors.map(m => `- [${m.status}] #${m.id} ${m.name} (${m.type}) [${m.tags.join(', ')}]`);
  const alerting = monitors.filter(m => m.status === 'Alert').length;
  const warning = monitors.filter(m => m.status === 'Warn').length;
  const data = `Monitors: ${monitors.length} total, ${alerting} alerting, ${warning} warning\n\n${lines.join('\n')}`;

  return { success: true, data, rawData: monitors };
}

export function mockDatadogLogs(query: string, timeRange: string): ConnectorResult {
  const logs = [
    { timestamp: new Date(Date.now() - 30000).toISOString(), level: 'ERROR', service: 'api-server', message: 'Connection timeout to database pool after 30s', host: 'web-01' },
    { timestamp: new Date(Date.now() - 45000).toISOString(), level: 'ERROR', service: 'api-server', message: 'HTTP 503 returned from upstream service auth-svc', host: 'web-02' },
    { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'WARN', service: 'api-server', message: 'Request queue depth exceeded 1000', host: 'web-01' },
    { timestamp: new Date(Date.now() - 90000).toISOString(), level: 'ERROR', service: 'worker', message: 'Job processing failed: OOM killed by container runtime', host: 'worker-03' },
    { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'WARN', service: 'api-server', message: 'Slow query detected: SELECT * FROM users took 4.2s', host: 'web-01' },
    { timestamp: new Date(Date.now() - 180000).toISOString(), level: 'ERROR', service: 'api-server', message: 'TLS handshake timeout connecting to redis-cluster', host: 'web-02' },
  ];

  const filtered = query ? logs.filter(l => l.message.toLowerCase().includes(query.toLowerCase()) || l.service.includes(query) || l.level === query.toUpperCase()) : logs;
  const lines = filtered.map(l => `[${l.timestamp}] ${l.level} ${l.service}@${l.host}: ${l.message}`);
  const data = `Log search: "${query}" (${timeRange})\nFound ${filtered.length} entries:\n\n${lines.join('\n')}`;

  return { success: true, data, rawData: filtered };
}

// --- Sentry Mock Data ---

export function mockSentryIssues(query: string, timeRange: string): ConnectorResult {
  const issues = [
    { shortId: 'APP-1247', title: 'TypeError: Cannot read property \'id\' of undefined', count: 1842, userCount: 312, level: 'error', firstSeen: '2h ago', lastSeen: '30s ago' },
    { shortId: 'APP-1245', title: 'ConnectionError: Connection pool exhausted (max=50)', count: 523, userCount: 89, level: 'error', firstSeen: '45m ago', lastSeen: '1m ago' },
    { shortId: 'APP-1243', title: 'TimeoutError: Request to auth-service timed out after 30000ms', count: 287, userCount: 156, level: 'error', firstSeen: '1h ago', lastSeen: '2m ago' },
    { shortId: 'APP-1240', title: 'Warning: Memory usage exceeded 85% threshold', count: 45, userCount: 0, level: 'warning', firstSeen: '3h ago', lastSeen: '15m ago' },
    { shortId: 'APP-1238', title: 'RateLimitError: API rate limit exceeded for endpoint /api/v2/users', count: 128, userCount: 42, level: 'warning', firstSeen: '30m ago', lastSeen: '5m ago' },
  ];

  const lines = issues.map(i => `- [${i.shortId}] ${i.title}\n    Events: ${i.count}, Users: ${i.userCount}, Level: ${i.level}, Last seen: ${i.lastSeen}`);
  const data = `Sentry Issues (query: "${query}", period: ${timeRange}):\n${issues.length} issues found\n\n${lines.join('\n')}`;

  return { success: true, data, rawData: issues };
}

export function mockSentryStackTrace(issueId: string): ConnectorResult {
  const stackTrace = `Exception: TypeError: Cannot read property 'id' of undefined
  File "src/handlers/userHandler.ts", line 47, in getUserProfile
    const userId = request.user.id;
  File "src/middleware/auth.ts", line 23, in authenticate
    const user = await verifyToken(token);
  File "src/middleware/auth.ts", line 31, in verifyToken
    return jwt.verify(token, secret);
  File "node_modules/jsonwebtoken/verify.js", line 12, in verify
    throw new TokenExpiredError('jwt expired');

Context:
  request.user was undefined because the auth middleware failed silently.
  The token verification threw TokenExpiredError but the error was caught
  and swallowed, leaving request.user as undefined.

Tags: environment=production, server_name=web-02, release=v2.4.1
Browser: Chrome 120.0.6099.109, OS: Windows 10
URL: /api/v2/users/profile`;

  return { success: true, data: stackTrace, rawData: { issueId, type: 'stack_trace' } };
}

export function mockSentryReleases(): ConnectorResult {
  const releases = [
    { version: 'v2.4.1', dateCreated: '2h ago', newIssues: 3, authors: ['dev-a', 'dev-b'], commits: 12 },
    { version: 'v2.4.0', dateCreated: '1d ago', newIssues: 0, authors: ['dev-c'], commits: 5 },
    { version: 'v2.3.9', dateCreated: '3d ago', newIssues: 1, authors: ['dev-a'], commits: 8 },
  ];

  const lines = releases.map(r => `- ${r.version} (${r.dateCreated}): ${r.commits} commits, ${r.newIssues} new issues, by ${r.authors.join(', ')}`);
  const data = `Recent Releases:\n${lines.join('\n')}\n\nNote: v2.4.1 deployed 2h ago introduced 3 new issues.`;

  return { success: true, data, rawData: releases };
}

// --- CloudWatch Mock Data ---

export function mockCloudWatchMetrics(query: string, timeRange: string): ConnectorResult {
  const rand = seededRandom(hashCode(query));
  const isEC2 = query.toLowerCase().includes('ec2') || query.toLowerCase().includes('cpu');
  const isRDS = query.toLowerCase().includes('rds') || query.toLowerCase().includes('database');
  const isALB = query.toLowerCase().includes('alb') || query.toLowerCase().includes('elb') || query.toLowerCase().includes('target');
  const isLambda = query.toLowerCase().includes('lambda');

  let metricData: string;

  if (isEC2) {
    const cpuAvg = 76 + rand() * 18;
    const networkIn = 45000 + rand() * 20000;
    const networkOut = 32000 + rand() * 15000;
    metricData = `EC2 Instance Metrics (i-0abc123def456):\n  CPUUtilization: ${cpuAvg.toFixed(1)}% (avg over ${timeRange})\n  NetworkIn: ${(networkIn / 1000).toFixed(1)} KB/s\n  NetworkOut: ${(networkOut / 1000).toFixed(1)} KB/s\n  StatusCheckFailed: 0\n  EBSReadOps: ${Math.floor(120 + rand() * 80)}/s`;
  } else if (isRDS) {
    const cpuUtil = 65 + rand() * 25;
    const freeMemory = 1.2 + rand() * 2.5;
    const connections = 38 + Math.floor(rand() * 15);
    metricData = `RDS Instance Metrics (mydb-prod):\n  CPUUtilization: ${cpuUtil.toFixed(1)}%\n  FreeableMemory: ${freeMemory.toFixed(2)} GB\n  DatabaseConnections: ${connections}\n  ReadIOPS: ${Math.floor(200 + rand() * 300)}\n  WriteIOPS: ${Math.floor(150 + rand() * 200)}\n  ReplicaLag: ${(rand() * 0.5).toFixed(3)}s`;
  } else if (isALB) {
    const reqCount = 12000 + Math.floor(rand() * 5000);
    const healthy = 4;
    const unhealthy = Math.floor(rand() * 2);
    metricData = `ALB Metrics (app-lb-prod):\n  RequestCount: ${reqCount}/min\n  TargetResponseTime: ${(0.15 + rand() * 0.35).toFixed(3)}s\n  HTTP5xxCount: ${Math.floor(rand() * 50)}/min\n  HTTP4xxCount: ${Math.floor(rand() * 120)}/min\n  HealthyHostCount: ${healthy}\n  UnHealthyHostCount: ${unhealthy}\n  ActiveConnectionCount: ${Math.floor(3000 + rand() * 2000)}`;
  } else if (isLambda) {
    metricData = `Lambda Metrics (process-events):\n  Invocations: ${Math.floor(500 + rand() * 300)}/min\n  Duration (avg): ${Math.floor(120 + rand() * 200)}ms\n  Errors: ${Math.floor(rand() * 10)}/min\n  Throttles: ${Math.floor(rand() * 5)}/min\n  ConcurrentExecutions: ${Math.floor(20 + rand() * 30)}`;
  } else {
    metricData = `CloudWatch Query: ${query}\nTime range: ${timeRange}\nMetric Value: ${(50 + rand() * 50).toFixed(2)}`;
  }

  return { success: true, data: metricData, rawData: { source: 'cloudwatch', query } };
}

// --- Prometheus Mock Data ---

export function mockPrometheusQuery(query: string, timeRange: string): ConnectorResult {
  const rand = seededRandom(hashCode(query));
  const isRate = query.includes('rate(');
  const isHistogram = query.includes('histogram_quantile');

  let resultType = 'vector';
  let results: string;

  if (isHistogram) {
    const p50 = 50 + rand() * 100;
    const p95 = p50 * (1.5 + rand() * 1.5);
    const p99 = p95 * (1.2 + rand() * 0.8);
    results = `{quantile="0.5"}: ${p50.toFixed(2)}ms\n{quantile="0.95"}: ${p95.toFixed(2)}ms\n{quantile="0.99"}: ${p99.toFixed(2)}ms`;
    resultType = 'vector';
  } else if (isRate) {
    const value = rand() * 100;
    results = `{instance="web-01:9090"}: ${value.toFixed(4)}/s\n{instance="web-02:9090"}: ${(value * (0.8 + rand() * 0.4)).toFixed(4)}/s\n{instance="web-03:9090"}: ${(value * (0.7 + rand() * 0.6)).toFixed(4)}/s`;
  } else {
    const value = 30 + rand() * 70;
    results = `{instance="web-01:9090", job="node"}: ${value.toFixed(2)}\n{instance="web-02:9090", job="node"}: ${(value + (rand() - 0.5) * 20).toFixed(2)}`;
  }

  const data = `PromQL: ${query}\nResult type: ${resultType}\nTime range: ${timeRange}\n\nResults:\n${results}`;

  return { success: true, data, rawData: { status: 'success', data: { resultType, result: results } } };
}

// --- PagerDuty Mock Data ---

export function mockPagerDutyIncidents(): ConnectorResult {
  const incidents = [
    { id: 'P9X2YZ1', title: 'High Error Rate on API Gateway', status: 'triggered', urgency: 'high', service: 'API Gateway', assignee: 'Alice Chen', createdAt: '25 min ago', acknowledgedAt: null },
    { id: 'P8W3AB2', title: 'Database Connection Pool Exhaustion', status: 'acknowledged', urgency: 'high', service: 'PostgreSQL Primary', assignee: 'Bob Kim', createdAt: '42 min ago', acknowledgedAt: '35 min ago' },
    { id: 'P7V4CD3', title: 'Elevated P99 Latency on User Service', status: 'acknowledged', urgency: 'low', service: 'User Service', assignee: 'Alice Chen', createdAt: '1h ago', acknowledgedAt: '55 min ago' },
  ];

  const lines = incidents.map(i => `- [${i.status.toUpperCase()}] ${i.id}: ${i.title}\n    Service: ${i.service}, Urgency: ${i.urgency}, Assigned: ${i.assignee}\n    Created: ${i.createdAt}${i.acknowledgedAt ? `, Acked: ${i.acknowledgedAt}` : ''}`);
  const data = `PagerDuty Active Incidents (${incidents.length}):\n\n${lines.join('\n')}`;

  return { success: true, data, rawData: incidents };
}

export function mockPagerDutyOnCall(): ConnectorResult {
  const oncall = [
    { schedule: 'Primary On-Call', user: 'Alice Chen', email: 'alice@company.com', start: '2h ago', end: 'in 10h' },
    { schedule: 'Secondary On-Call', user: 'Bob Kim', email: 'bob@company.com', start: '2h ago', end: 'in 10h' },
    { schedule: 'Database On-Call', user: 'Carol Wu', email: 'carol@company.com', start: '6h ago', end: 'in 6h' },
  ];

  const lines = oncall.map(o => `- ${o.schedule}: ${o.user} (${o.email}) — ${o.start} to ${o.end}`);
  const data = `Current On-Call:\n${lines.join('\n')}`;

  return { success: true, data, rawData: oncall };
}
