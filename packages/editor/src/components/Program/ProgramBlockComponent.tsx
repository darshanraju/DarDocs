import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { useProgramStore } from './programStore';
import { getNodeTypesByCategory, getNodeType, type ProgramNode } from './registry';
import { ProgramFlowNode } from './components/ProgramFlowNode';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { OutputPreview } from './components/OutputPreview';
import { executeProgram } from './execution/executeProgram';

// Import builtins so they register themselves
import './nodes/builtins';

const nodeTypes = { programNode: ProgramFlowNode };

export function ProgramBlockComponent(props: NodeViewProps) {
  const { node, deleteNode } = props;
  const programId: string = node.attrs.programId;

  const store = useProgramStore();
  const program = store.getProgram(programId);
  const isRunning = store.runningPrograms.has(programId);
  const runResult = store.getRunResult(programId);

  const [nodes, setNodes, onNodesChange] = useNodesState<ProgramNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const programName = program?.name || 'Untitled Program';

  // Init program in store
  useEffect(() => {
    if (!programId) return;
    store.createProgram(programId);
  }, [programId]);

  // Sync from store → local state on mount
  useEffect(() => {
    if (initializedRef.current) return;
    const p = store.getProgram(programId);
    if (p && p.nodes.length > 0) {
      setNodes(p.nodes);
      setEdges(p.edges as Edge[]);
      initializedRef.current = true;
    }
  }, [programId, store.programs]);

  // Sync local state → store on changes
  useEffect(() => {
    if (!initializedRef.current && nodes.length === 0) return;
    initializedRef.current = true;
    store.updateNodes(programId, nodes as ProgramNode[]);
  }, [nodes]);

  useEffect(() => {
    if (!initializedRef.current) return;
    store.updateEdges(programId, edges);
  }, [edges]);

  // After a run, update node data from store
  useEffect(() => {
    const p = store.getProgram(programId);
    if (!p) return;
    const needsUpdate = p.nodes.some((pn) => {
      const localNode = nodes.find((n) => n.id === pn.id);
      return localNode && (localNode.data.lastOutput !== pn.data.lastOutput || localNode.data.lastError !== pn.data.lastError);
    });
    if (needsUpdate) {
      setNodes((prev) =>
        prev.map((n) => {
          const storeNode = p.nodes.find((sn) => sn.id === n.id);
          if (!storeNode) return n;
          return { ...n, data: storeNode.data };
        })
      );
    }
  }, [store.runResults]);

  // Focus title input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((_: any, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowAddMenu(false);
  }, []);

  const handleAddNode = useCallback(
    (pluginType: string) => {
      const plugin = getNodeType(pluginType);
      if (!plugin) return;

      const defaultConfig: Record<string, any> = {};
      for (const field of plugin.configSchema) {
        if (field.defaultValue !== undefined) {
          defaultConfig[field.key] = field.defaultValue;
        }
      }

      const newNode: ProgramNode = {
        id: crypto.randomUUID(),
        type: 'programNode',
        position: { x: 150 + nodes.length * 60, y: 100 + nodes.length * 40 },
        data: { pluginType, config: defaultConfig },
      };

      setNodes((prev) => [...prev, newNode]);
      setShowAddMenu(false);
      setSelectedNodeId(newNode.id);
    },
    [nodes.length, setNodes]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const handleRun = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const p = store.getProgram(programId);
      if (!p || p.nodes.length === 0) return;

      store.setRunning(programId, true);
      try {
        const result = await executeProgram(p);
        store.setRunResult(programId, result);
      } catch (err: any) {
        store.setRunResult(programId, {
          success: false,
          nodeOutputs: {},
          error: err.message || 'Execution failed',
        });
      } finally {
        store.setRunning(programId, false);
      }
    },
    [programId, store]
  );

  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTitleDraft(programName);
    setIsEditingTitle(true);
  }, [programName]);

  const handleTitleCommit = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== programName) {
      store.renameProgram(programId, trimmed);
    }
    setIsEditingTitle(false);
  }, [titleDraft, programName, programId, store]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingTitle(false);
    }
  }, [handleTitleCommit]);

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFullscreen((prev) => !prev);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedPlugin = selectedNode ? getNodeType(selectedNode.data.pluginType) : undefined;
  const categorized = useMemo(() => getNodeTypesByCategory(), []);

  const wrapperClass = isFullscreen ? 'program-block program-block-fullscreen' : 'program-block';

  return (
    <NodeViewWrapper className={wrapperClass}>
      <div className="program-block-header" contentEditable={false}>
        <div className="program-block-header-left">
          <button
            className="program-block-toggle"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCollapsed(!collapsed); }}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="program-block-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleCommit}
              onKeyDown={handleTitleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="program-block-title"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={handleTitleClick}
              title="Click to rename"
            >
              {programName}
            </span>
          )}
          <span className="program-block-count">{nodes.length} nodes</span>
        </div>
        <div className="program-block-header-right">
          <button
            className="program-block-add-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
          >
            <Plus size={14} />
            Add Node
          </button>
          <button
            className="program-block-run-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={handleRun}
            disabled={isRunning || nodes.length === 0}
          >
            {isRunning ? <Loader2 size={14} className="exec-spin" /> : <Play size={14} />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            className="program-block-fullscreen-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            className="program-block-delete-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}
            title="Delete program block"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showAddMenu && (
        <div className="program-add-menu" contentEditable={false}>
          {Object.entries(categorized).map(([category, plugins]) => (
            <div key={category}>
              <div className="program-add-category">{category}</div>
              {plugins.map((plugin) => (
                <button
                  key={plugin.type}
                  className="program-add-option"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddNode(plugin.type); }}
                >
                  <span className="program-add-icon">{plugin.icon}</span>
                  <span>{plugin.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className={`program-block-canvas ${isFullscreen ? 'program-block-canvas-fullscreen' : ''}`} contentEditable={false}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>

          {selectedNode && selectedPlugin && (
            <NodeConfigPanel
              programId={programId}
              nodeId={selectedNode.id}
              plugin={selectedPlugin}
              config={selectedNode.data.config}
              onClose={() => setSelectedNodeId(null)}
            />
          )}

          {selectedNodeId && (
            <button
              className="program-delete-node-btn"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSelected(); }}
            >
              <Trash2 size={12} />
              Delete Node
            </button>
          )}
        </div>
      )}

      {runResult && !isFullscreen && (
        <div contentEditable={false}>
          <OutputPreview result={runResult} nodes={nodes as ProgramNode[]} />
        </div>
      )}
    </NodeViewWrapper>
  );
}
