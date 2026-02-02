import { useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node as RFNode,
  type Edge as RFEdge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─── Data types from documentGenerator ───────────────────────

interface DiagramNodeData {
  id: string;
  label: string;
  type: 'service' | 'tech' | 'external';
  role?: string;
  techStack?: string[];
  description?: string;
}

interface DiagramEdgeData {
  from: string;
  to: string;
  label: string;
  type: string;
}

interface DiagramData {
  nodes: DiagramNodeData[];
  edges: DiagramEdgeData[];
}

// ─── Custom Node Component ───────────────────────────────────

function ServiceNode({ data }: { data: DiagramNodeData }) {
  const isPrimary = data.role === 'primary';
  const isExternal = data.type === 'external';

  return (
    <div className={`arch-node ${isExternal ? 'arch-node-external' : isPrimary ? 'arch-node-primary' : 'arch-node-secondary'}`}>
      <div className="arch-node-header">
        <span className="arch-node-icon">
          {isExternal ? '⚙' : '📦'}
        </span>
        <span className="arch-node-label">{data.label}</span>
      </div>
      {data.description && (
        <div className="arch-node-desc">{data.description}</div>
      )}
      {data.techStack && data.techStack.length > 0 && (
        <div className="arch-node-tech">
          {data.techStack.map((t) => (
            <span key={t} className="arch-node-tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { archNode: ServiceNode };

// ─── Layout ──────────────────────────────────────────────────

function computeLayout(data: DiagramData): { nodes: RFNode[]; edges: RFEdge[] } {
  const serviceNodes = data.nodes.filter((n) => n.type === 'service');
  const externalNodes = data.nodes.filter((n) => n.type !== 'service');

  const rfNodes: RFNode[] = [];

  // Layout service nodes in a horizontal row at center
  const serviceSpacing = 320;
  const serviceY = 40;
  const serviceStartX = serviceNodes.length > 1
    ? -(serviceNodes.length - 1) * serviceSpacing / 2
    : 0;

  serviceNodes.forEach((n, i) => {
    rfNodes.push({
      id: n.id,
      type: 'archNode',
      position: { x: serviceStartX + i * serviceSpacing, y: serviceY },
      data: n,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  });

  // Layout external nodes in a row below services
  if (externalNodes.length > 0) {
    const extSpacing = 220;
    const extY = serviceY + 200;
    const extStartX = externalNodes.length > 1
      ? -(externalNodes.length - 1) * extSpacing / 2
      : 0;

    externalNodes.forEach((n, i) => {
      rfNodes.push({
        id: n.id,
        type: 'archNode',
        position: { x: extStartX + i * extSpacing, y: extY },
        data: n,
        sourcePosition: Position.Top,
        targetPosition: Position.Top,
      });
    });
  }

  // Create edges
  const rfEdges: RFEdge[] = data.edges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    type: 'default',
    animated: e.type === 'event' || e.type === 'webhook',
    style: { stroke: edgeColor(e.type), strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: '#6b7280', fontWeight: 500 },
    labelBgStyle: { fill: 'white', fillOpacity: 0.85 },
    labelBgPadding: [4, 2] as [number, number],
  }));

  return { nodes: rfNodes, edges: rfEdges };
}

function edgeColor(type: string): string {
  switch (type) {
    case 'api': return '#3b82f6';
    case 'event': return '#f59e0b';
    case 'shared-db': return '#8b5cf6';
    case 'import': return '#6b7280';
    case 'webhook': return '#10b981';
    case 'dependency': return '#94a3b8';
    default: return '#6b7280';
  }
}

// ─── Main Component ──────────────────────────────────────────

export function ArchDiagramComponent({ node }: NodeViewProps) {
  const raw = node.attrs.diagramData;

  const diagramData = useMemo<DiagramData | null>(() => {
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [raw]);

  const { nodes, edges } = useMemo(() => {
    if (!diagramData || diagramData.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return computeLayout(diagramData);
  }, [diagramData]);

  if (!diagramData || diagramData.nodes.length === 0) {
    return (
      <NodeViewWrapper>
        <div className="arch-diagram-empty">
          No architecture data available.
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="arch-diagram-container" contentEditable={false}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        </ReactFlow>
      </div>
    </NodeViewWrapper>
  );
}
