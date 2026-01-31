/**
 * OverlayLayer — DOM container positioned over the canvas for overlays.
 *
 * Contains:
 *   - TextEditOverlay (textarea for text editing)
 *   - Comment anchor badges (positioned per-object)
 *   - Accessibility labels
 *
 * All child elements are positioned absolutely within the canvas bounds.
 * Uses pointer-events: none on the container, pointer-events: auto on children.
 */
import { TextEditOverlay } from './TextEditOverlay';
import type {
  ICommentSystem,
  ISceneGraph,
  ITextEditBridge,
  IViewTransform,
} from '../types';

interface OverlayLayerProps {
  textBridge: ITextEditBridge;
  comments: ICommentSystem;
  view: IViewTransform;
  scene: ISceneGraph;
}

export function OverlayLayer({ textBridge, comments, view, scene }: OverlayLayerProps) {
  const isEditing = textBridge.isEditing();
  const allComments = comments.getAllComments().filter((c) => !c.resolved);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 5,
      }}
    >
      {/* Text editing overlay */}
      {isEditing && (
        <div style={{ pointerEvents: 'auto' }}>
          <TextEditOverlay bridge={textBridge} view={view} />
        </div>
      )}

      {/* Comment anchor badges */}
      {allComments.map((comment) => {
        const pos = comments.getAnchorScreenPos(comment.id, view, scene);
        if (!pos) return null;
        return (
          <div
            key={comment.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              pointerEvents: 'auto',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#3370ff',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              transform: 'translate(-50%, -50%)',
            }}
            title={`${comment.author}: ${comment.text}`}
          >
            💬
          </div>
        );
      })}

      {/* Accessibility: screen reader description */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
        }}
      >
        Whiteboard canvas. Use keyboard shortcuts: V for select, R for rectangle,
        O for ellipse, L for arrow, P for pencil, T for text. Delete to remove
        selected objects. Ctrl+Z to undo, Ctrl+Shift+Z to redo.
      </div>
    </div>
  );
}
