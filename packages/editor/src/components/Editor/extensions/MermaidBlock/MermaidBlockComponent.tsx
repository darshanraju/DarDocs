import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, Drag01Icon, PencilEdit01Icon, EyeIcon } from '@hugeicons/core-free-icons';
import mermaid from 'mermaid';
import { RoadmapTooltip } from '../../../UI/RoadmapTooltip';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
});

export function MermaidBlockComponent({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { code } = node.attrs;
  const [isEditing, setIsEditing] = useState(!code);
  const [editCode, setEditCode] = useState(code || '');
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(`mermaid-${crypto.randomUUID()}`);

  const renderDiagram = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvg('');
      setRenderError('');
      return;
    }
    try {
      // Generate a fresh ID each render to avoid stale DOM elements
      const renderId = `mermaid-${crypto.randomUUID()}`;
      idRef.current = renderId;
      const { svg: rendered } = await mermaid.render(renderId, source);
      setSvg(rendered);
      setRenderError('');
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Failed to render diagram');
      // Clean up the failed render element from the DOM
      const failedEl = document.getElementById(idRef.current);
      if (failedEl) failedEl.remove();
    }
  }, []);

  useEffect(() => {
    if (code) {
      renderDiagram(code);
    }
  }, [code, renderDiagram]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ code: editCode });
    setIsEditing(false);
  }, [editCode, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditCode(code);
    setIsEditing(false);
  }, [code]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = editCode.substring(0, start) + '    ' + editCode.substring(end);
        setEditCode(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        });
      }
    },
    [handleCancel, handleSave, editCode]
  );

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  return (
    <NodeViewWrapper className="my-4 relative">
      <RoadmapTooltip blockName="mermaidBlock" />
      <div className={`mermaid-block-wrapper ${selected ? 'is-selected' : ''}`}>
        {/* Drag handle */}
        <div className="embed-drag-handle" data-drag-handle>
          <HugeiconsIcon icon={Drag01Icon} size={16} className="text-gray-400" />
        </div>

        {/* Header */}
        <div className="embed-block-header">
          <span className="embed-block-label" style={{ color: '#ff6b6b' }}>
            Mermaid Diagram
          </span>
          <div className="embed-block-actions">
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              className="embed-action-btn"
              title={isEditing ? 'Preview' : 'Edit'}
            >
              {isEditing ? (
                <>
                  <HugeiconsIcon icon={EyeIcon} size={14} />
                  <span>Preview</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
                  <span>Edit</span>
                </>
              )}
            </button>
            <button
              onClick={handleDelete}
              className="embed-action-btn embed-action-delete"
              title="Remove diagram"
            >
              <HugeiconsIcon icon={Delete01Icon} size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mermaid-editor">
            <textarea
              ref={textareaRef}
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mermaid-textarea"
              placeholder="Enter Mermaid diagram code..."
              spellCheck={false}
            />
            <div className="mermaid-editor-hint">Ctrl+Enter to save · Escape to cancel</div>
          </div>
        ) : (
          <div className="mermaid-preview">
            {renderError ? (
              <div className="mermaid-error">
                <p>Failed to render diagram</p>
                <pre>{renderError}</pre>
              </div>
            ) : svg ? (
              <div
                className="mermaid-svg"
                dangerouslySetInnerHTML={{ __html: svg }}
                onClick={() => setIsEditing(true)}
              />
            ) : (
              <div className="mermaid-empty" onClick={() => setIsEditing(true)}>
                Click to add a diagram
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
