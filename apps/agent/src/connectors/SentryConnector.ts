import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';

export class SentryConnector implements Connector {
  name = 'sentry';

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    try {
      const { query, timeRange = '24h', credentials } = params;
      const authToken = credentials.authToken as string;
      const baseUrl = (credentials.url as string)?.replace(/\/$/, '') || 'https://sentry.io';
      const org = credentials.org as string;
      const project = credentials.project as string;

      if (!authToken || !org) {
        return { success: false, data: '', error: 'Sentry auth token and org are required' };
      }

      let url: string;
      if (query.startsWith('/')) {
        url = `${baseUrl}/api/0${query}`;
      } else {
        const projectPath = project ? `projects/${org}/${project}` : `organizations/${org}`;
        url = `${baseUrl}/api/0/${projectPath}/issues/?query=${encodeURIComponent(query)}&statsPeriod=${timeRange}&sort=freq`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          data: '',
          error: `Sentry API error: ${response.status} ${response.statusText}`,
        };
      }

      const rawData = await response.json();
      const data = formatSentryResponse(rawData, query);

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

function formatSentryResponse(data: unknown, query: string): string {
  if (Array.isArray(data)) {
    const issues = data.slice(0, 10).map((issue: Record<string, unknown>) => {
      return `- [${issue.shortId}] ${issue.title} (count: ${issue.count}, users: ${issue.userCount})${issue.level ? ` level=${issue.level}` : ''}`;
    });
    return `Query: ${query}\nFound ${data.length} issues (showing top 10):\n${issues.join('\n')}`;
  }

  return JSON.stringify(data, null, 2);
}
