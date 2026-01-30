/**
 * Toolbar — Floating toolbar for whiteboard tools.
 *
 * Matches Lark behavior: horizontal toolbar at bottom-center of the canvas,
 * with tool icons, undo/redo, and zoom controls.
 */
import { useCallback } from 'react';
import {
  MousePointer2,
  Square,
  Circle,
  ArrowUpRight,
  Pencil,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  MessageSquare,
} from 'lucide-react';
import type { ICommandStack, IViewTransform, Point, ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  commands: ICommandStack;
  view: IViewTransform;
  zoom: number;
  onZoomChange: () => void;
  showComments: boolean;
  onToggleComments: () => void;
}

const tools: Array<{ type: ToolType; icon: React.ReactNode; label: string; shortcut: string }> = [
  { type: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { type: 'rect', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  { type: 'ellipse', icon: <Circle size={18} />, label: 'Ellipse', shortcut: 'O' },
  { type: 'arrow', icon: <ArrowUpRight size={18} />, label: 'Arrow', shortcut: 'L' },
  { type: 'path', icon: <Pencil size={18} />, label: 'Pencil', shortcut: 'P' },
  { type: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
];

export function Toolbar({
  activeTool,
  onToolChange,
  commands,
  view,
  zoom,
  onZoomChange,
  showComments,
  onToggleComments,
}: ToolbarProps) {
  const handleZoomIn = useCallback(() => {
    const vp = view.getViewport();
    view.zoomBy(1.2, { x: vp.width / 2, y: vp.height / 2 });
    onZoomChange();
  }, [view, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const vp = view.getViewport();
    view.zoomBy(0.8, { x: vp.width / 2, y: vp.height / 2 });
    onZoomChange();
  }, [view, onZoomChange]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '4px 6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 30,
      }}
    >
      {/* Tools */}
      {tools.map((t) => (
        <button
          key={t.type}
          onClick={() => onToolChange(t.type)}
          title={`${t.label} (${t.shortcut})`}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 8,
            background: activeTool === t.type ? '#eef2ff' : 'transparent',
            color: activeTool === t.type ? '#3370ff' : '#6b7280',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {t.icon}
        </button>
      ))}

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 24,
          background: '#e5e7eb',
          margin: '0 4px',
        }}
      />

      {/* Undo/Redo */}
      <button
        onClick={() => commands.undo()}
        disabled={!commands.canUndo()}
        title="Undo (Ctrl+Z)"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: commands.canUndo() ? '#6b7280' : '#d1d5db',
          cursor: commands.canUndo() ? 'pointer' : 'default',
        }}
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={() => commands.redo()}
        disabled={!commands.canRedo()}
        title="Redo (Ctrl+Shift+Z)"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: commands.canRedo() ? '#6b7280' : '#d1d5db',
          cursor: commands.canRedo() ? 'pointer' : 'default',
        }}
      >
        <Redo2 size={18} />
      </button>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 24,
          background: '#e5e7eb',
          margin: '0 4px',
        }}
      />

      {/* Zoom */}
      <button
        onClick={handleZoomOut}
        title="Zoom Out"
        style={{
          width: 32,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: '#6b7280',
          cursor: 'pointer',
        }}
      >
        <ZoomOut size={16} />
      </button>
      <span
        style={{
          fontSize: 12,
          color: '#6b7280',
          minWidth: 40,
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={handleZoomIn}
        title="Zoom In"
        style={{
          width: 32,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: '#6b7280',
          cursor: 'pointer',
        }}
      >
        <ZoomIn size={16} />
      </button>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 24,
          background: '#e5e7eb',
          margin: '0 4px',
        }}
      />

      {/* Comments toggle */}
      <button
        onClick={onToggleComments}
        title="Toggle Comments"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 8,
          background: showComments ? '#eef2ff' : 'transparent',
          color: showComments ? '#3370ff' : '#6b7280',
          cursor: 'pointer',
        }}
      >
        <MessageSquare size={18} />
      </button>
    </div>
  );
}
