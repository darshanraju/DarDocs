import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';
import { mockPrometheusQuery } from './mockData.js';

export class PrometheusConnector implements Connector {
  name = 'prometheus';
  description = 'Query Prometheus directly with PromQL';
  supportedQueryTypes = ['instant query', 'range query'];

  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!credentials.url) missing.push('url');
    return { valid: missing.length === 0, missing };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query, timeRange = '1h', credentials } = params;

    if (MOCK_MODE) {
      return mockPrometheusQuery(query, timeRange);
    }

    try {
      const baseUrl = (credentials.url as string)?.replace(/\/$/, '');
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return { success: false, data: '', error: `Missing credentials: ${validation.missing.join(', ')}` };
      }

      const now = Math.floor(Date.now() / 1000);
      const rangeSeconds = parseTimeRange(timeRange);
      const start = now - rangeSeconds;

      const url = `${baseUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=60`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (credentials.token) {
        headers['Authorization'] = `Bearer ${credentials.token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        return { success: false, data: '', error: `Prometheus API error: ${response.status} ${response.statusText}` };
      }

      const rawData = await response.json();
      const data = formatPrometheusResponse(rawData, query);
      return { success: true, data, rawData };
    } catch (error) {
      return { success: false, data: '', error: error instanceof Error ? error.message : String(error) };
    }
  }
}

function parseTimeRange(range: string): number {
  const match = range.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3600;
  const [, value, unit] = match;
  const multiplier = unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return parseInt(value) * multiplier;
}

function formatPrometheusResponse(data: unknown, query: string): string {
  const obj = data as Record<string, unknown>;
  if (obj.status === 'success' && obj.data) {
    const result = obj.data as Record<string, unknown>;
    if (Array.isArray(result.result)) {
      const series = result.result.map((r: Record<string, unknown>) => {
        const metric = r.metric as Record<string, string>;
        const values = r.values as [number, string][];
        const latest = values?.[values.length - 1];
        return `${JSON.stringify(metric)}: latest=${latest?.[1] || 'N/A'}`;
      });
      return `PromQL: ${query}\nResults (${series.length} series):\n${series.join('\n')}`;
    }
  }
  return JSON.stringify(data, null, 2);
}
