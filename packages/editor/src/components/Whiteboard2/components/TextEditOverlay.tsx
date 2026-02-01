/**
 * TextEditOverlay — DOM textarea positioned over a canvas text object.
 *
 * Reads TextEditBridge state, positions a textarea at screen coordinates
 * using the ViewTransform, and pipes edits back through the bridge.
 *
 * Behavior matches Lark/Figma:
 *   - Textarea appears exactly over the text object
 *   - Native text editing (cursor, selection, IME, copy/paste)
 *   - Blur or Escape → commit
 *   - Transparent background to show canvas beneath
 */
import { useCallback, useEffect, useRef } from 'react';
import type { ITextEditBridge, IViewTransform } from '../types';

interface TextEditOverlayProps {
  bridge: ITextEditBridge;
  view: IViewTransform;
}

export function TextEditOverlay({ bridge, view }: TextEditOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editState = bridge.getEditState();

  // Auto-focus when editing starts
  useEffect(() => {
    if (editState && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      const len = editState.text.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editState?.objectId]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      bridge.updateText(e.target.value);
    },
    [bridge],
  );

  const handleBlur = useCallback(() => {
    bridge.commitEdit();
  }, [bridge]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        bridge.cancelEdit();
      }
      // Enter without Shift commits (matches Lark for single-line shapes)
      if (e.key === 'Enter' && !e.shiftKey && editState?.style.fontSize) {
        e.preventDefault();
        bridge.commitEdit();
      }
      // Prevent canvas keyboard shortcuts while editing
      e.stopPropagation();
    },
    [bridge, editState],
  );

  if (!editState) return null;

  const { worldRect, text, style } = editState;
  const topLeft = view.worldToScreen({ x: worldRect.x, y: worldRect.y });
  const bottomRight = view.worldToScreen({
    x: worldRect.x + worldRect.width,
    y: worldRect.y + worldRect.height,
  });
  const zoom = view.getViewState().zoom;

  const screenW = bottomRight.x - topLeft.x;
  const screenH = bottomRight.y - topLeft.y;
  const fontSize = (style.fontSize ?? 16) * zoom;

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: topLeft.x,
        top: topLeft.y,
        width: Math.max(screenW, 60),
        minHeight: Math.max(screenH, 24),
        fontSize,
        fontFamily: style.fontFamily ?? 'Inter, system-ui, sans-serif',
        color: style.stroke ?? '#1e1e1e',
        background: 'transparent',
        border: '2px solid #3370ff',
        borderRadius: 2,
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        padding: '2px 4px',
        lineHeight: 1.4,
        zIndex: 10,
        boxSizing: 'border-box',
      }}
    />
  );
}
