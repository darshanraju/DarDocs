import type { Connector, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';

export class ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    this.connectors.set(connector.name, connector);
  }

  get(name: string): Connector | undefined {
    return this.connectors.get(name);
  }

  has(name: string): boolean {
    return this.connectors.has(name);
  }

  list(): string[] {
    return Array.from(this.connectors.keys());
  }

  isMockMode(): boolean {
    return MOCK_MODE;
  }

  getConnectorInfo(): Array<{ name: string; description: string; queryTypes: string[] }> {
    return Array.from(this.connectors.values()).map(c => ({
      name: c.name,
      description: c.description,
      queryTypes: c.supportedQueryTypes,
    }));
  }

  async testQuery(
    connectorName: string,
    query: string,
    timeRange: string,
    credentials: Record<string, unknown>,
    metadata?: Record<string, string>,
  ): Promise<ConnectorResult> {
    const connector = this.connectors.get(connectorName);
    if (!connector) {
      return { success: false, data: '', error: `Connector '${connectorName}' not found. Available: ${this.list().join(', ')}` };
    }

    const validation = connector.validateCredentials(credentials);
    if (!validation.valid && !MOCK_MODE) {
      return { success: false, data: '', error: `Missing credentials for ${connectorName}: ${validation.missing.join(', ')}` };
    }

    return connector.query({ query, timeRange, credentials, metadata });
  }
}
