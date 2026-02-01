import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';
import { mockSentryIssues, mockSentryStackTrace, mockSentryReleases } from './mockData.js';

export class SentryConnector implements Connector {
  name = 'sentry';
  description = 'Query Sentry for issues, stack traces, and release data';
  supportedQueryTypes = ['issues', 'stacktrace', 'releases'];

  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!credentials.authToken) missing.push('authToken');
    if (!credentials.org) missing.push('org');
    return { valid: missing.length === 0, missing };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query, timeRange = '24h', credentials, metadata } = params;
    const queryType = metadata?.queryType || this.detectQueryType(query);

    if (MOCK_MODE) {
      return this.mockQuery(query, timeRange, queryType);
    }

    try {
      const authToken = credentials.authToken as string;
      const baseUrl = (credentials.url as string)?.replace(/\/$/, '') || 'https://sentry.io';
      const org = credentials.org as string;
      const project = credentials.project as string;

      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return { success: false, data: '', error: `Missing credentials: ${validation.missing.join(', ')}` };
      }

      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      };

      let url: string;

      if (queryType === 'releases') {
        url = `${baseUrl}/api/0/organizations/${org}/releases/?per_page=10`;
      } else if (queryType === 'stacktrace') {
        // query should be an issue ID
        url = `${baseUrl}/api/0/organizations/${org}/issues/${query}/events/latest/`;
      } else if (query.startsWith('/')) {
        url = `${baseUrl}/api/0${query}`;
      } else {
        const projectPath = project ? `projects/${org}/${project}` : `organizations/${org}`;
        url = `${baseUrl}/api/0/${projectPath}/issues/?query=${encodeURIComponent(query)}&statsPeriod=${timeRange}&sort=freq`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        return { success: false, data: '', error: `Sentry API error: ${response.status} ${response.statusText}` };
      }

      const rawData = await response.json();
      const data = formatSentryResponse(rawData, query, queryType);
      return { success: true, data, rawData };
    } catch (error) {
      return { success: false, data: '', error: error instanceof Error ? error.message : String(error) };
    }
  }

  private detectQueryType(query: string): string {
    if (query.toLowerCase().includes('release')) return 'releases';
    if (query.match(/^[A-Z]+-\d+$/)) return 'stacktrace';
    return 'issues';
  }

  private mockQuery(query: string, timeRange: string, queryType: string): ConnectorResult {
    if (queryType === 'releases') return mockSentryReleases();
    if (queryType === 'stacktrace') return mockSentryStackTrace(query);
    return mockSentryIssues(query, timeRange);
  }
}

function formatSentryResponse(data: unknown, query: string, queryType: string): string {
  if (queryType === 'releases' && Array.isArray(data)) {
    const releases = data.slice(0, 10).map((r: Record<string, unknown>) =>
      `- ${r.version} (${r.dateCreated}) — ${r.newGroups || 0} new issues`
    );
    return `Recent Releases:\n${releases.join('\n')}`;
  }

  if (queryType === 'stacktrace') {
    const obj = data as Record<string, unknown>;
    const entries = obj.entries as Array<Record<string, unknown>> | undefined;
    if (entries) {
      const exception = entries.find(e => e.type === 'exception');
      if (exception) {
        return `Stack Trace:\n${JSON.stringify(exception.data, null, 2)}`;
      }
    }
    return JSON.stringify(data, null, 2);
  }

  if (Array.isArray(data)) {
    const issues = data.slice(0, 10).map((issue: Record<string, unknown>) =>
      `- [${issue.shortId}] ${issue.title} (count: ${issue.count}, users: ${issue.userCount})${issue.level ? ` level=${issue.level}` : ''}`
    );
    return `Query: ${query}\nFound ${data.length} issues (showing top 10):\n${issues.join('\n')}`;
  }

  return JSON.stringify(data, null, 2);
}
