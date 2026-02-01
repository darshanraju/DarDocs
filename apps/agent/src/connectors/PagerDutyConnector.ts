import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';
import { mockPagerDutyIncidents, mockPagerDutyOnCall } from './mockData.js';

export class PagerDutyConnector implements Connector {
  name = 'pagerduty';
  description = 'Query PagerDuty for incidents and on-call schedules';
  supportedQueryTypes = ['incidents', 'oncall'];

  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!credentials.apiKey) missing.push('apiKey');
    return { valid: missing.length === 0, missing };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query, credentials, metadata } = params;
    const queryType = metadata?.queryType || this.detectQueryType(query);

    if (MOCK_MODE) {
      return queryType === 'oncall' ? mockPagerDutyOnCall() : mockPagerDutyIncidents();
    }

    try {
      const apiKey = credentials.apiKey as string;
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return { success: false, data: '', error: `Missing credentials: ${validation.missing.join(', ')}` };
      }

      const baseUrl = 'https://api.pagerduty.com';
      const headers = {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      };

      let url: string;
      if (queryType === 'oncall') {
        url = `${baseUrl}/oncalls?include[]=users`;
      } else {
        url = `${baseUrl}/incidents?statuses[]=triggered&statuses[]=acknowledged&sort_by=created_at:desc`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        return { success: false, data: '', error: `PagerDuty API error: ${response.status} ${response.statusText}` };
      }

      const rawData = await response.json();
      const data = queryType === 'oncall' ? formatOnCall(rawData) : formatIncidents(rawData);
      return { success: true, data, rawData };
    } catch (error) {
      return { success: false, data: '', error: error instanceof Error ? error.message : String(error) };
    }
  }

  private detectQueryType(query: string): string {
    if (query.toLowerCase().includes('oncall') || query.toLowerCase().includes('on-call') || query.toLowerCase().includes('schedule')) return 'oncall';
    return 'incidents';
  }
}

function formatIncidents(data: unknown): string {
  const obj = data as Record<string, unknown>;
  if (obj.incidents && Array.isArray(obj.incidents)) {
    const incidents = (obj.incidents as Array<Record<string, unknown>>).slice(0, 10).map((i) =>
      `- [${(i.status as string || '').toUpperCase()}] ${i.title} (urgency: ${i.urgency}, service: ${(i.service as Record<string, unknown>)?.summary || 'unknown'})`
    );
    return `Active Incidents (${(obj.incidents as unknown[]).length}):\n${incidents.join('\n')}`;
  }
  return JSON.stringify(data, null, 2);
}

function formatOnCall(data: unknown): string {
  const obj = data as Record<string, unknown>;
  if (obj.oncalls && Array.isArray(obj.oncalls)) {
    const oncalls = (obj.oncalls as Array<Record<string, unknown>>).slice(0, 10).map((o) => {
      const user = o.user as Record<string, unknown>;
      const schedule = o.schedule as Record<string, unknown>;
      return `- ${schedule?.summary || 'Unknown'}: ${user?.summary || 'Unknown'}`;
    });
    return `Current On-Call:\n${oncalls.join('\n')}`;
  }
  return JSON.stringify(data, null, 2);
}
