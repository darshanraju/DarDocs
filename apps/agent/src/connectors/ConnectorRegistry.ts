import type { Connector } from './types.js';

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
}
