import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Tldraw, getSnapshot, loadSnapshot } from 'tldraw';
import type { Editor as TldrawEditor } from 'tldraw';
import { Trash2, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { throttle } from 'lodash-es';
import { useBoardStore } from '../../../../stores/boardStore';
import { BOARD_SAVE_DEBOUNCE_MS } from '../../../../lib/constants';

import 'tldraw/tldraw.css';

export function BoardBlockComponent({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { boardId, height } = node.attrs;
  const { getBoardSnapshot, setBoardSnapshot, createBoard } = useBoardStore();
  const editorRef = useRef<TldrawEditor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Initialize board in store if it doesn't exist
  useEffect(() => {
    if (boardId && !getBoardSnapshot(boardId)) {
      createBoard(boardId);
    }
  }, [boardId, getBoardSnapshot, createBoard]);

  // Auto-fullscreen for newly created boards via slash command
  useEffect(() => {
    const pendingId = useBoardStore.getState().pendingFullscreenBoardId;
    if (pendingId && pendingId === boardId) {
      setIsFullscreen(true);
      useBoardStore.getState().clearPendingFullscreen();
    }
  }, [boardId]);

  // Throttled save function
  const saveSnapshot = useCallback(
    throttle((editor: TldrawEditor) => {
      const snapshot = getSnapshot(editor.store);
      setBoardSnapshot(boardId, snapshot);
    }, BOARD_SAVE_DEBOUNCE_MS),
    [boardId, setBoardSnapshot]
  );

  const handleMount = useCallback(
    (editor: TldrawEditor) => {
      editorRef.current = editor;

      // Load existing snapshot if available
      const existingSnapshot = getBoardSnapshot(boardId);
      if (existingSnapshot && Object.keys(existingSnapshot).length > 0) {
        try {
          loadSnapshot(editor.store, existingSnapshot);
        } catch (e) {
          console.warn('Failed to load board snapshot:', e);
        }
      }

      // Listen for changes and save
      const unsubscribe = editor.store.listen(
        () => {
          saveSnapshot(editor);
        },
        { scope: 'document' }
      );

      return () => {
        unsubscribe();
      };
    },
    [boardId, getBoardSnapshot, saveSnapshot]
  );

  const handleDelete = useCallback(() => {
    if (confirm('Delete this whiteboard?')) {
      useBoardStore.getState().deleteBoard(boardId);
      deleteNode();
    }
  }, [boardId, deleteNode]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleDoubleClick = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
    }
  }, [isFullscreen]);

  // Resize handling
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
    },
    [height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(200, Math.min(800, startHeightRef.current + deltaY));
      updateAttributes({ height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateAttributes]);

  const boardContent = (
    <div
      ref={containerRef}
      className={isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'board-block-wrapper relative'}
      style={!isFullscreen ? { height: `${height}px` } : undefined}
      onDoubleClick={handleDoubleClick}
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

      {/* Toolbar */}
      <div className="board-toolbar absolute top-2 right-2 z-20 flex gap-1">
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

      {/* tldraw canvas */}
      <div className="w-full h-full">
        <Tldraw onMount={handleMount} />
      </div>

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
  );

  // Portal to document.body when fullscreen to escape overflow:hidden ancestors
  if (isFullscreen) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="board-block-wrapper relative" style={{ height: `${height}px` }}>
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Whiteboard is open in fullscreen
          </div>
        </div>
        {createPortal(boardContent, document.body)}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-4">
      {boardContent}
    </NodeViewWrapper>
  );
}
