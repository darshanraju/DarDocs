import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';

export class GrafanaConnector implements Connector {
  name = 'grafana';

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    try {
      const { query, timeRange = '1h', credentials } = params;
      const baseUrl = (credentials.url as string)?.replace(/\/$/, '');
      const apiKey = credentials.apiKey as string;

      if (!baseUrl || !apiKey) {
        return { success: false, data: '', error: 'Grafana URL and API key are required' };
      }

      const isPromQuery = !query.startsWith('/');
      let url: string;

      if (isPromQuery) {
        const now = Math.floor(Date.now() / 1000);
        const rangeSeconds = parseTimeRange(timeRange);
        const start = now - rangeSeconds;
        url = `${baseUrl}/api/datasources/proxy/1/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=60`;
      } else {
        url = `${baseUrl}${query}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          data: '',
          error: `Grafana API error: ${response.status} ${response.statusText}`,
        };
      }

      const rawData = await response.json();
      const data = formatGrafanaResponse(rawData, query);

      return { success: true, data, rawData };
    } catch (error) {
      return {
        success: false,
        data: '',
        error: error instanceof Error ? error.message : String(error),
      };
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

function formatGrafanaResponse(data: unknown, query: string): string {
  const obj = data as Record<string, unknown>;

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
