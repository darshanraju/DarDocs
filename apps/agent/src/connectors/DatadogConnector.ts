import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';

export class DatadogConnector implements Connector {
  name = 'datadog';

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    try {
      const { query, timeRange = '1h', credentials } = params;
      const apiKey = credentials.apiKey as string;
      const appKey = credentials.appKey as string;
      const site = (credentials.site as string) || 'datadoghq.com';

      if (!apiKey || !appKey) {
        return { success: false, data: '', error: 'Datadog API key and Application key are required' };
      }

      const baseUrl = `https://api.${site}`;
      const rangeSeconds = parseTimeRange(timeRange);
      const now = Math.floor(Date.now() / 1000);
      const from = now - rangeSeconds;

      const url = `${baseUrl}/api/v1/query?from=${from}&to=${now}&query=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          'DD-API-KEY': apiKey,
          'DD-APPLICATION-KEY': appKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          data: '',
          error: `Datadog API error: ${response.status} ${response.statusText}`,
        };
      }

      const rawData = await response.json();
      const data = formatDatadogResponse(rawData, query);

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

function formatDatadogResponse(data: unknown, query: string): string {
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
