import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';

export class HTTPConnector implements Connector {
  name = 'http';
  description = 'Query any HTTP/REST endpoint directly';
  supportedQueryTypes = ['GET request'];

  validateCredentials(_credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    // HTTP connector doesn't require specific credentials
    return { valid: true, missing: [] };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query: url, metadata } = params;

    if (MOCK_MODE) {
      return {
        success: true,
        data: `Mock HTTP response for: ${url}\n\n{"status": "ok", "data": {"healthy": true, "uptime": "12d 5h 23m", "version": "2.4.1", "connections": 847}}`,
        rawData: { status: 'ok', data: { healthy: true, uptime: '12d 5h 23m', version: '2.4.1', connections: 847 } },
      };
    }

    try {
      const { credentials } = params;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(metadata || {}),
      };

      if (credentials.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        return { success: false, data: '', error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const contentType = response.headers.get('content-type') || '';
      let data: string;
      let rawData: unknown;

      if (contentType.includes('application/json')) {
        rawData = await response.json();
        data = JSON.stringify(rawData, null, 2);
      } else {
        data = await response.text();
        rawData = data;
      }

      return { success: true, data, rawData };
    } catch (error) {
      return { success: false, data: '', error: error instanceof Error ? error.message : String(error) };
    }
  }
}
