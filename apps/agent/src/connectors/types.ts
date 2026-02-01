export interface ConnectorQueryParams {
  query: string;
  timeRange?: string;
  credentials: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface ConnectorResult {
  success: boolean;
  data: string;
  rawData?: unknown;
  error?: string;
}

export interface Connector {
  name: string;
  description: string;
  supportedQueryTypes: string[];
  query(params: ConnectorQueryParams): Promise<ConnectorResult>;
  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] };
}

export const MOCK_MODE = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
