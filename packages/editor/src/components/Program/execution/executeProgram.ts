import type { ProgramDefinition, ProgramRunResult } from '../registry';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function executeProgram(program: ProgramDefinition): Promise<ProgramRunResult> {
  const serializable = {
    id: program.id,
    name: program.name,
    nodes: program.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: { pluginType: n.data.pluginType, config: n.data.config },
    })),
    edges: program.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };

  const res = await fetch(`${API_BASE}/programs/execute`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializable),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      nodeOutputs: {},
      error: data.error || `Execution failed (${res.status})`,
    };
  }

  return res.json();
}
