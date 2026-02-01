import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';
import { mockGrafanaMetrics, mockGrafanaAlerts, mockGrafanaDashboard } from './mockData.js';

export class GrafanaConnector implements Connector {
  name = 'grafana';
  description = 'Query Grafana for metrics, alerts, and dashboard data';
  supportedQueryTypes = ['metrics (PromQL)', 'alerts', 'dashboard'];

  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!credentials.url) missing.push('url');
    if (!credentials.apiKey) missing.push('apiKey');
    return { valid: missing.length === 0, missing };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query, timeRange = '1h', credentials, metadata } = params;
    const queryType = metadata?.queryType || this.detectQueryType(query);

    if (MOCK_MODE) {
      return this.mockQuery(query, timeRange, queryType);
    }

    try {
      const baseUrl = (credentials.url as string)?.replace(/\/$/, '');
      const apiKey = credentials.apiKey as string;

      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return { success: false, data: '', error: `Missing credentials: ${validation.missing.join(', ')}` };
      }

      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      let url: string;

      if (queryType === 'alerts') {
        url = `${baseUrl}/api/v1/provisioning/alert-rules`;
      } else if (queryType === 'dashboard') {
        url = query.startsWith('/') ? `${baseUrl}${query}` : `${baseUrl}/api/search?query=${encodeURIComponent(query)}&type=dash-db`;
      } else {
        // PromQL metrics query
        const now = Math.floor(Date.now() / 1000);
        const rangeSeconds = parseTimeRange(timeRange);
        const start = now - rangeSeconds;
        const dsUid = credentials.defaultDataSourceUid as string;

        if (dsUid) {
          url = `${baseUrl}/api/datasources/proxy/uid/${dsUid}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=60`;
        } else {
          url = `${baseUrl}/api/datasources/proxy/1/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=60`;
        }
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        return { success: false, data: '', error: `Grafana API error: ${response.status} ${response.statusText}` };
      }

      const rawData = await response.json();
      const data = formatGrafanaResponse(rawData, query, queryType);
      return { success: true, data, rawData };
    } catch (error) {
      return { success: false, data: '', error: error instanceof Error ? error.message : String(error) };
    }
  }

  private detectQueryType(query: string): string {
    if (query.toLowerCase().includes('alert')) return 'alerts';
    if (query.startsWith('/api/dashboards') || query.toLowerCase().includes('dashboard')) return 'dashboard';
    return 'metrics';
  }

  private mockQuery(query: string, timeRange: string, queryType: string): ConnectorResult {
    if (queryType === 'alerts') return mockGrafanaAlerts(query);
    if (queryType === 'dashboard') return mockGrafanaDashboard();
    return mockGrafanaMetrics(query, timeRange);
  }
}

function parseTimeRange(range: string): number {
  const match = range.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3600;
  const [, value, unit] = match;
  const multiplier = unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return parseInt(value) * multiplier;
}

function formatGrafanaResponse(data: unknown, query: string, queryType: string): string {
  const obj = data as Record<string, unknown>;

  if (queryType === 'alerts' && Array.isArray(data)) {
    const alerts = data.slice(0, 10).map((a: Record<string, unknown>) =>
      `- [${a.state || 'unknown'}] ${a.title} (${a.ruleGroup || 'default'})`
    );
    return `Alert Rules:\n${alerts.join('\n')}`;
  }

  if (obj.status === 'success' && obj.data) {
    const result = obj.data as Record<string, unknown>;
    if (Array.isArray(result.result)) {
      const metrics = result.result.map((r: Record<string, unknown>) => {
        const metric = r.metric as Record<string, string>;
        const values = r.values as [number, string][];
        const latest = values?.[values.length - 1];
        return `${JSON.stringify(metric)}: latest=${latest?.[1] || 'N/A'}`;
      });
      return `Query: ${query}\nResults (${metrics.length} series):\n${metrics.join('\n')}`;
    }
  }

  return JSON.stringify(data, null, 2);
}
