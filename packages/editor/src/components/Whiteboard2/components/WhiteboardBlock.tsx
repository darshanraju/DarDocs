/**
 * WhiteboardBlock — Main React component orchestrating all whiteboard layers.
 *
 * Lifecycle:
 *   1. Mount → create engine instances (SceneGraph, ViewTransform, etc.)
 *   2. Restore snapshot from store (cold start)
 *   3. Start render loop (requestAnimationFrame)
 *   4. Bind pointer/keyboard events via InteractionController
 *   5. Subscribe to changes for re-render + auto-save
 *   6. Unmount → save snapshot, clean up listeners, cancel RAF
 *
 * This component is designed to be used as a Tiptap NodeView (embedded block)
 * or as a standalone fullscreen whiteboard.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Trash2, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { throttle } from 'lodash-es';

import { SceneGraph } from '../engine/SceneGraph';
import { ViewTransform } from '../engine/ViewTransform';
import { CanvasRenderer } from '../engine/CanvasRenderer';
import { InteractionController } from '../engine/InteractionController';
import { CommandStack } from '../engine/CommandStack';
import { TextEditBridge } from '../engine/TextEditBridge';
import { CommentSystem } from '../engine/CommentSystem';
import { CollaborationAdapter } from '../engine/CollaborationAdapter';

import { OverlayLayer } from './OverlayLayer';
import { Toolbar } from './Toolbar';
import { CommentPanel } from './CommentPanel';

import {
  useWhiteboard2Store,
  createSnapshot,
  restoreSnapshot,
  createEmptySnapshot,
} from '../whiteboardStore';
import type { ToolType, SelectionState } from '../types';

const SAVE_THROTTLE_MS = 500;

export function WhiteboardBlock({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { boardId, height } = node.attrs;
  const store = useWhiteboard2Store;

  // Engine refs (stable across renders)
  const sceneRef = useRef<SceneGraph | null>(null);
  const viewRef = useRef<ViewTransform | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const interactionRef = useRef<InteractionController | null>(null);
  const commandsRef = useRef<CommandStack | null>(null);
  const textBridgeRef = useRef<TextEditBridge | null>(null);
  const commentsRef = useRef<CommentSystem | null>(null);
  const collabRef = useRef<CollaborationAdapter | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const initializedRef = useRef(false);

  // React state for UI (driven by engine events)
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<SelectionState>({
    selectedIds: new Set(),
    hoveredId: null,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [, forceRender] = useState(0);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // ─── Engine Initialization ────────────────────────────────────

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Create engine instances
    const scene = new SceneGraph();
    const view = new ViewTransform();
    const renderer = new CanvasRenderer();
    const commands = new CommandStack();
    const textBridge = new TextEditBridge(scene, view, commands);
    const comments = new CommentSystem();
    const collab = new CollaborationAdapter(scene);

    // Interaction controller with double-click → text editing
    const interaction = new InteractionController(
      scene, view, commands,
      (objectId) => textBridge.startEdit(objectId),
    );

    sceneRef.current = scene;
    viewRef.current = view;
    rendererRef.current = renderer;
    interactionRef.current = interaction;
    commandsRef.current = commands;
    textBridgeRef.current = textBridge;
    commentsRef.current = comments;
    collabRef.current = collab;

    // Restore from store
    const existingSnapshot = store.getState().getSnapshot(boardId);
    if (existingSnapshot && existingSnapshot.objects?.length > 0) {
      restoreSnapshot(existingSnapshot, scene, view, comments);
    }

    // Auto-fullscreen for newly created boards via slash command
    const pendingId = store.getState().pendingFullscreenBoardId;
    if (pendingId && pendingId === boardId) {
      setIsFullscreen(true);
      store.getState().clearPendingFullscreen();
    }

    // Throttled save to store
    const saveToStore = throttle(() => {
      if (sceneRef.current && viewRef.current && commentsRef.current) {
        const snapshot = createSnapshot(sceneRef.current, viewRef.current, commentsRef.current);
        store.getState().saveSnapshot(boardId, snapshot);
      }
    }, SAVE_THROTTLE_MS);

    // Subscribe to changes for re-render + auto-save
    const unsubScene = scene.subscribe(() => {
      renderer.setDirty();
      saveToStore();
    });

    const unsubInteraction = interaction.subscribe(() => {
      renderer.setDirty();
      setActiveTool(interaction.getTool());
      setZoom(view.getViewState().zoom);
      setSelection(interaction.getSelection());
      forceRender((n) => n + 1);
    });

    const unsubCommands = commands.subscribe(() => {
      renderer.setDirty();
      forceRender((n) => n + 1);
    });

    const unsubText = textBridge.subscribe(() => {
      renderer.setDirty();
      forceRender((n) => n + 1);
    });

    const unsubComments = comments.subscribe(() => {
      renderer.setDirty();
      saveToStore();
      forceRender((n) => n + 1);
    });

    // Render loop
    const renderLoop = () => {
      if (canvasRef.current && sceneRef.current && viewRef.current && interactionRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          renderer.render(
            ctx,
            sceneRef.current,
            viewRef.current,
            interactionRef.current.getSelection(),
            interactionRef.current.getInteractionState(),
            collab.getRemotePresences(),
          );
        }
      }
      rafRef.current = requestAnimationFrame(renderLoop);
    };
    rafRef.current = requestAnimationFrame(renderLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      unsubScene();
      unsubInteraction();
      unsubCommands();
      unsubText();
      unsubComments();
      saveToStore();
      saveToStore.flush?.();
      collab.disconnect();
      initializedRef.current = false;
    };
  }, [boardId]);

  // ─── Viewport Resize Observer ─────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !viewRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        viewRef.current?.setViewport({ width, height, dpr });

        if (canvasRef.current) {
          canvasRef.current.style.width = `${width}px`;
          canvasRef.current.style.height = `${height}px`;
        }
        rendererRef.current?.setDirty();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [isFullscreen]);

  // ─── Event Handlers ───────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactionRef.current || !canvasRef.current) return;
    interactionRef.current.handlePointerDown(e.nativeEvent, canvasRef.current);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!interactionRef.current || !canvasRef.current) return;
    interactionRef.current.handlePointerMove(e.nativeEvent, canvasRef.current);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!interactionRef.current || !canvasRef.current) return;
    interactionRef.current.handlePointerUp(e.nativeEvent, canvasRef.current);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!interactionRef.current) return;
    interactionRef.current.handleWheel(e.nativeEvent);
    setZoom(viewRef.current?.getViewState().zoom ?? 1);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!interactionRef.current) return;
    // Don't handle keys when text editing
    if (textBridgeRef.current?.isEditing()) return;
    interactionRef.current.handleKeyDown(e.nativeEvent);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!interactionRef.current || !canvasRef.current) return;
    interactionRef.current.handleDoubleClick(e.nativeEvent, canvasRef.current);
  }, []);

  const handleToolChange = useCallback((tool: ToolType) => {
    interactionRef.current?.setTool(tool);
    setActiveTool(tool);
  }, []);

  const handleZoomChange = useCallback(() => {
    setZoom(viewRef.current?.getViewState().zoom ?? 1);
    rendererRef.current?.setDirty();
    forceRender((n) => n + 1);
  }, []);

  // ─── Block Controls ───────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (confirm('Delete this whiteboard?')) {
      store.getState().deleteBoard(boardId);
      deleteNode();
    }
  }, [boardId, deleteNode]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // ─── Resize Handle ───────────────────────────────────────────

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
    },
    [height],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(200, Math.min(800, startHeightRef.current + deltaY));
      updateAttributes({ height: newHeight });
    };
    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateAttributes]);

  // ─── Render ───────────────────────────────────────────────────

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : 'relative';

  return (
    <NodeViewWrapper className="my-4">
      <div
        ref={containerRef}
        className={containerClasses}
        style={!isFullscreen ? { height: `${height}px`, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' } : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Drag handle */}
        {!isFullscreen && (
          <div
            className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab opacity-0 hover:opacity-100 transition-opacity z-10"
            data-drag-handle
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Block toolbar (top-right) */}
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 bg-white rounded border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors"
            title="Delete whiteboard"
          >
            <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
          }}
        />

        {/* DOM Overlay (text editing, comment badges, a11y) */}
        {textBridgeRef.current && commentsRef.current && viewRef.current && sceneRef.current && (
          <OverlayLayer
            textBridge={textBridgeRef.current}
            comments={commentsRef.current}
            view={viewRef.current}
            scene={sceneRef.current}
          />
        )}

        {/* Toolbar */}
        {commandsRef.current && viewRef.current && (
          <Toolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            commands={commandsRef.current}
            view={viewRef.current}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            showComments={showComments}
            onToggleComments={() => setShowComments((p) => !p)}
          />
        )}

        {/* Comment panel */}
        {showComments && commentsRef.current && sceneRef.current && (
          <CommentPanel
            comments={commentsRef.current}
            scene={sceneRef.current}
            selection={selection}
          />
        )}

        {/* Resize handle */}
        {!isFullscreen && (
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-blue-100 transition-colors"
            onMouseDown={handleResizeStart}
          />
        )}

        {/* Selected indicator */}
        {selected && !isFullscreen && (
          <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
        )}
      </div>
    </NodeViewWrapper>
  );
}
