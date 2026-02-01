import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';
import { mockDatadogMetrics, mockDatadogMonitors, mockDatadogLogs } from './mockData.js';

export class DatadogConnector implements Connector {
  name = 'datadog';
  description = 'Query Datadog for metrics, monitors, logs, and events';
  supportedQueryTypes = ['metrics', 'monitors', 'logs'];

  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!credentials.apiKey) missing.push('apiKey');
    if (!credentials.appKey) missing.push('appKey');
    return { valid: missing.length === 0, missing };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query, timeRange = '1h', credentials, metadata } = params;
    const queryType = metadata?.queryType || this.detectQueryType(query);

    if (MOCK_MODE) {
      return this.mockQuery(query, timeRange, queryType);
    }

    try {
      const apiKey = credentials.apiKey as string;
      const appKey = credentials.appKey as string;
      const site = (credentials.site as string) || 'datadoghq.com';

      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return { success: false, data: '', error: `Missing credentials: ${validation.missing.join(', ')}` };
      }

      const baseUrl = `https://api.${site}`;
      const headers = {
        'DD-API-KEY': apiKey,
        'DD-APPLICATION-KEY': appKey,
        'Content-Type': 'application/json',
      };

      let url: string;

      if (queryType === 'monitors') {
        url = `${baseUrl}/api/v1/monitor`;
      } else if (queryType === 'logs') {
        const body = JSON.stringify({
          filter: { query, from: `now-${timeRange}`, to: 'now' },
          sort: 'timestamp',
          page: { limit: 20 },
        });
        const response = await fetch(`${baseUrl}/api/v2/logs/events/search`, {
          method: 'POST', headers, body,
        });
        if (!response.ok) {
          return { success: false, data: '', error: `Datadog Logs API error: ${response.status}` };
        }
        const rawData = await response.json();
        return { success: true, data: formatDatadogLogs(rawData, query), rawData };
      } else {
        const rangeSeconds = parseTimeRange(timeRange);
        const now = Math.floor(Date.now() / 1000);
        const from = now - rangeSeconds;
        url = `${baseUrl}/api/v1/query?from=${from}&to=${now}&query=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        return { success: false, data: '', error: `Datadog API error: ${response.status} ${response.statusText}` };
      }

      const rawData = await response.json();
      const data = queryType === 'monitors' ? formatDatadogMonitors(rawData) : formatDatadogMetrics(rawData, query);
      return { success: true, data, rawData };
    } catch (error) {
      return { success: false, data: '', error: error instanceof Error ? error.message : String(error) };
    }
  }

  private detectQueryType(query: string): string {
    if (query.toLowerCase().includes('monitor')) return 'monitors';
    if (query.toLowerCase().includes('log') || query.toLowerCase().includes('source:')) return 'logs';
    return 'metrics';
  }

  private mockQuery(query: string, timeRange: string, queryType: string): ConnectorResult {
    if (queryType === 'monitors') return mockDatadogMonitors();
    if (queryType === 'logs') return mockDatadogLogs(query, timeRange);
    return mockDatadogMetrics(query, timeRange);
  }
}

function parseTimeRange(range: string): number {
  const match = range.match(/^(\d+)(m|h|d)$/);
  if (!match) return 3600;
  const [, value, unit] = match;
  const multiplier = unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return parseInt(value) * multiplier;
}

function formatDatadogMetrics(data: unknown, query: string): string {
  const obj = data as Record<string, unknown>;
  if (obj.status === 'ok' && Array.isArray(obj.series)) {
    const series = obj.series as Array<Record<string, unknown>>;
    const summaries = series.map((s) => {
      const pointlist = s.pointlist as [number, number][];
      const latest = pointlist?.[pointlist.length - 1];
      return `${s.scope || s.metric}: latest=${latest?.[1]?.toFixed(2) || 'N/A'}`;
    });
    return `Query: ${query}\nResults (${summaries.length} series):\n${summaries.join('\n')}`;
  }
  return JSON.stringify(data, null, 2);
}

function formatDatadogMonitors(data: unknown): string {
  if (Array.isArray(data)) {
    const monitors = data.slice(0, 10).map((m: Record<string, unknown>) =>
      `- [${m.overall_state || 'unknown'}] ${m.name} (type: ${m.type})`
    );
    return `Monitors (${data.length} total, showing top 10):\n${monitors.join('\n')}`;
  }
  return JSON.stringify(data, null, 2);
}

function formatDatadogLogs(data: unknown, query: string): string {
  const obj = data as Record<string, unknown>;
  if (obj.data && Array.isArray(obj.data)) {
    const logs = (obj.data as Array<Record<string, unknown>>).slice(0, 10).map((l) => {
      const attrs = l.attributes as Record<string, unknown>;
      return `[${attrs?.timestamp || ''}] ${attrs?.status || ''} ${attrs?.message || ''}`;
    });
    return `Log search: "${query}"\nFound entries (showing top 10):\n${logs.join('\n')}`;
  }
  return JSON.stringify(data, null, 2);
}
