import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { openVideoPicker, readFileAsDataURL } from './mediaUtils';

export function VideoBlockComponent({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const { src, width, alignment } = node.attrs;
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const resizeRef = useRef({
    startX: 0,
    startWidth: 0,
    containerWidth: 0,
    handle: '',
  });

  // --- Resize ---

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();

      const video = videoRef.current;
      const wrapper = wrapperRef.current;
      if (!video || !wrapper) return;

      setIsResizing(true);
      resizeRef.current = {
        startX: e.clientX,
        startWidth: video.offsetWidth,
        containerWidth: wrapper.offsetWidth,
        handle,
      };
    },
    []
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startWidth, containerWidth, handle } = resizeRef.current;
      const isLeft = handle.includes('w');
      const deltaX = isLeft ? startX - e.clientX : e.clientX - startX;
      const newWidthPx = Math.max(120, startWidth + deltaX);
      const newWidthPercent = Math.min(
        100,
        Math.round((newWidthPx / containerWidth) * 100)
      );
      updateAttributes({ width: newWidthPercent });
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

  // --- Actions ---

  const handleReplace = useCallback(async () => {
    const file = await openVideoPicker();
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    updateAttributes({ src: dataUrl });
  }, [updateAttributes]);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  const setAlign = useCallback(
    (align: string) => {
      updateAttributes({ alignment: align });
    },
    [updateAttributes]
  );

  // --- Fullscreen ---

  const handleDoubleClick = useCallback(() => {
    if (src) setIsFullscreen(true);
  }, [src]);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullscreen]);

  // --- Upload placeholder ---

  const handleUpload = useCallback(async () => {
    const file = await openVideoPicker();
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    updateAttributes({ src: dataUrl });
  }, [updateAttributes]);

  if (!src) {
    return (
      <NodeViewWrapper className="media-block">
        <div className="media-placeholder" onClick={handleUpload}>
          <Upload className="w-8 h-8 text-gray-300" />
          <span className="text-sm text-gray-400">Click to upload video</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // --- Render ---

  const justifyContent =
    alignment === 'left'
      ? 'flex-start'
      : alignment === 'right'
        ? 'flex-end'
        : 'center';

  const showControls = (isHovered || selected) && editor.isEditable;

  return (
    <NodeViewWrapper className="media-block" data-drag-handle>
      <div
        ref={wrapperRef}
        className="media-block-wrapper"
        style={{ display: 'flex', justifyContent }}
      >
        <div
          ref={containerRef}
          className={[
            'video-block-container',
            selected ? 'is-selected' : '',
            isResizing ? 'is-resizing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            width: width ? `${width}%` : undefined,
            maxWidth: '100%',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <video
            ref={videoRef}
            src={src}
            controls
            preload="metadata"
            draggable={false}
            onDoubleClick={handleDoubleClick}
          />

          {/* Resize handles */}
          {showControls && (
            <>
              <div
                className="media-resize-handle nw"
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
              />
              <div
                className="media-resize-handle ne"
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
              />
              <div
                className="media-resize-handle sw"
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
              />
              <div
                className="media-resize-handle se"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
              />
            </>
          )}

          {/* Hover toolbar */}
          {showControls && (
            <div className="media-toolbar">
              <button
                onClick={() => setAlign('left')}
                title="Align left"
                className={alignment === 'left' ? 'active' : ''}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAlign('center')}
                title="Align center"
                className={alignment === 'center' || !alignment ? 'active' : ''}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAlign('right')}
                title="Align right"
                className={alignment === 'right' ? 'active' : ''}
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <div className="media-toolbar-divider" />
              <button onClick={handleReplace} title="Replace video">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                title="Delete"
                className="media-toolbar-delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen &&
        createPortal(
          <div className="media-fullscreen-overlay" onClick={closeFullscreen}>
            <button
              className="media-fullscreen-close"
              onClick={closeFullscreen}
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={src}
              controls
              autoPlay
              className="media-fullscreen-content"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </NodeViewWrapper>
  );
}
