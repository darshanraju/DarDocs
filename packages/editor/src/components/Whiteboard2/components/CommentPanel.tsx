/**
 * CommentPanel — Right-hand panel displaying comments for selected objects.
 *
 * Behavior matches Lark:
 *   - Panel slides in from the right when a commented object is selected
 *   - Shows all comments for the selected object(s)
 *   - Input field at bottom for adding new comments
 *   - Comments show author, timestamp, resolve button
 */
import { useCallback, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Comment01Icon, Tick01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import type { ICommentSystem, ISceneGraph, SelectionState } from '../types';

interface CommentPanelProps {
  comments: ICommentSystem;
  scene: ISceneGraph;
  selection: SelectionState;
}

export function CommentPanel({ comments, scene, selection }: CommentPanelProps) {
  const [newText, setNewText] = useState('');
  const selectedIds = [...selection.selectedIds];

  // Get comments for all selected objects
  const relevantComments = selectedIds.flatMap((id) =>
    comments.getCommentsForObject(id),
  );

  const handleAdd = useCallback(() => {
    if (!newText.trim() || selectedIds.length === 0) return;
    comments.addComment(selectedIds[0], newText.trim(), 'You');
    setNewText('');
  }, [newText, selectedIds, comments]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAdd();
      }
      e.stopPropagation();
    },
    [handleAdd],
  );

  if (selectedIds.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 280,
        background: '#ffffff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <HugeiconsIcon icon={Comment01Icon} size={16} />
        Comments ({relevantComments.length})
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {relevantComments.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 13,
            }}
          >
            No comments yet
          </div>
        )}
        {relevantComments.map((comment) => (
          <div
            key={comment.id}
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #f3f4f6',
              opacity: comment.resolved ? 0.5 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 13 }}>
                {comment.author}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {!comment.resolved && (
                  <button
                    onClick={() => comments.resolveComment(comment.id)}
                    title="Resolve"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: '#9ca3af',
                    }}
                  >
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                  </button>
                )}
                <button
                  onClick={() => comments.removeComment(comment.id)}
                  title="Delete"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    color: '#9ca3af',
                  }}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              {comment.text}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              {new Date(comment.createdAt).toLocaleString()}
              {comment.resolved && ' · Resolved'}
            </div>
          </div>
        ))}
      </div>

      {/* Add comment */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          style={{
            padding: '8px 12px',
            background: newText.trim() ? '#3370ff' : '#e5e7eb',
            color: newText.trim() ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: newText.trim() ? 'pointer' : 'default',
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
