import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';

export class HTTPConnector implements Connector {
  name = 'http';

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    try {
      const { query: url, credentials, metadata } = params;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(metadata || {}),
      };

      if (credentials.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        return {
          success: false,
          data: '',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
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
      return {
        success: false,
        data: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
