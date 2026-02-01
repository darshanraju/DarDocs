import type { Node } from '@xyflow/react';

// ─── Port & Config Schema ───────────────────────────────────

export interface PortDef {
  name: string;
  type: 'json' | 'string' | 'number' | 'any';
  label?: string;
}

export interface ConfigField {
  key: string;
  type: 'string' | 'text' | 'number' | 'select' | 'boolean';
  label: string;
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
}

// ─── Plugin Definition ──────────────────────────────────────

export interface NodeTypePlugin {
  type: string;
  label: string;
  icon: string;       // Emoji or single char for the node header
  color: string;      // Accent color
  category: 'Data' | 'Transform' | 'AI' | 'Output' | 'Integrations';
  inputs: PortDef[];
  outputs: PortDef[];
  configSchema: ConfigField[];
  /** Runs server-side. Receives resolved config + input values. */
  executeKey: string;  // Maps to a server-side executor key
}

// ─── Program Data Model ─────────────────────────────────────

export interface ProgramNodeData {
  pluginType: string;
  config: Record<string, any>;
  lastOutput?: any;
  lastError?: string;
  [key: string]: unknown;
}

export type ProgramNode = Node<ProgramNodeData>;

export interface ProgramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ProgramDefinition {
  id: string;
  name: string;
  nodes: ProgramNode[];
  edges: ProgramEdge[];
}

export interface ProgramRunResult {
  success: boolean;
  nodeOutputs: Record<string, { output?: any; error?: string }>;
  error?: string;
}

// ─── Registry ───────────────────────────────────────────────

const registry = new Map<string, NodeTypePlugin>();

export function registerNodeType(plugin: NodeTypePlugin): void {
  registry.set(plugin.type, plugin);
}

export function getNodeType(type: string): NodeTypePlugin | undefined {
  return registry.get(type);
}

export function getAllNodeTypes(): NodeTypePlugin[] {
  return Array.from(registry.values());
}

export function getNodeTypesByCategory(): Record<string, NodeTypePlugin[]> {
  const grouped: Record<string, NodeTypePlugin[]> = {};
  for (const plugin of registry.values()) {
    if (!grouped[plugin.category]) grouped[plugin.category] = [];
    grouped[plugin.category].push(plugin);
  }
  return grouped;
}
