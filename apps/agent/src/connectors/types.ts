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
  query(params: ConnectorQueryParams): Promise<ConnectorResult>;
}
