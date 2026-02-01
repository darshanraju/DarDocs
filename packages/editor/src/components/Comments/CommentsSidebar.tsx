import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useCommentStore, type Comment } from '../../stores/commentStore';
import { CommentPanel, formatTime, UserAvatar } from './CommentPanel';

function CompactCommentCard({
  comment,
  onClick,
}: {
  comment: Comment;
  onClick: () => void;
}) {
  return (
    <div className="comment-card" onClick={onClick}>
      <div className="comment-card-quote">{comment.quotedText}</div>
      <div className="comment-card-body">
        <UserAvatar user={comment.author} size={28} />
        <div className="comment-card-meta">
          <span className="comment-card-author">{comment.author.name}</span>
          <span className="comment-card-time">
            {formatTime(comment.createdAt)}
          </span>
        </div>
      </div>
      {comment.text && <div className="comment-card-text">{comment.text}</div>}
      {comment.replies.length > 0 && (
        <div className="comment-card-replies">
          {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
        </div>
      )}
    </div>
  );
}

interface CommentsSidebarProps {
  editor: Editor | null;
}

export function CommentsSidebar({ editor }: CommentsSidebarProps) {
  const { comments, activeCommentId, setActiveComment, deleteComment } =
    useCommentStore();
  // null = user hasn't manually toggled, auto-derive from content
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const [cardPositions, setCardPositions] = useState<Record<string, number>>(
    {}
  );
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  const unresolvedComments = comments.filter((c) => c.type === 'inline' && !c.resolved);
  const hasComments = unresolvedComments.length > 0;

  // Derive collapsed: if user hasn't toggled, collapse when empty
  const collapsed = userOverride !== null ? !userOverride : !hasComments;

  // Auto-expand when a comment becomes active
  useEffect(() => {
    if (activeCommentId && collapsed) {
      setUserOverride(true);
    }
  }, [activeCommentId, collapsed]);

  // Calculate Y positions of comment cards to match their text in the editor
  const updatePositions = useCallback(() => {
    if (!sidebarContentRef.current) return;

    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    const scrollRect = scrollContainer.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop;
    const contentRect = sidebarContentRef.current.getBoundingClientRect();
    const contentAbsTop = contentRect.top - scrollRect.top + scrollTop;

    const newPositions: Record<string, number> = {};

    for (const comment of unresolvedComments) {
      const markEl = document.querySelector(
        `span[data-comment-id="${comment.id}"]`
      );
      if (markEl) {
        const markRect = markEl.getBoundingClientRect();
        const markAbsTop = markRect.top - scrollRect.top + scrollTop;
        newPositions[comment.id] = markAbsTop - contentAbsTop;
      }
    }

    // Prevent overlap: sort by target Y and push cards down when needed
    const sorted = [...unresolvedComments].sort(
      (a, b) => (newPositions[a.id] ?? 0) - (newPositions[b.id] ?? 0)
    );

    let lastBottom = 0;
    for (const comment of sorted) {
      const targetTop = newPositions[comment.id] ?? 0;
      const adjustedTop = Math.max(targetTop, lastBottom + 8);
      newPositions[comment.id] = adjustedTop;
      const isActive = comment.id === activeCommentId;
      // Estimate card heights for overlap prevention
      lastBottom = adjustedTop + (isActive ? 280 : 110);
    }

    setCardPositions(newPositions);
  }, [unresolvedComments, activeCommentId]);

  useEffect(() => {
    updatePositions();
    const timer = setTimeout(updatePositions, 100);

    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePositions);
    }
    window.addEventListener('resize', updatePositions);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePositions);
      }
      window.removeEventListener('resize', updatePositions);
      clearTimeout(timer);
    };
  }, [updatePositions]);

  // Click outside sidebar to deselect active comment
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        !target?.closest?.('.comments-sidebar') &&
        !target?.closest?.('.comment-highlight') &&
        !target?.closest?.('.add-comment-bubble') &&
        !target?.closest?.('.floating-toolbar')
      ) {
        if (activeCommentId) {
          const activeComment = comments.find(
            (c) => c.id === activeCommentId
          );
          if (activeComment && activeComment.text === '' && editor) {
            editor.chain().focus().unsetComment(activeCommentId).run();
            deleteComment(activeCommentId);
          }
          setActiveComment(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCommentId, comments, editor, setActiveComment, deleteComment]);

  // No comments and not manually expanded — render nothing
  if (collapsed && !hasComments) {
    return null;
  }

  // Collapsed state: thin strip with expand button
  if (collapsed) {
    return (
      <div className="comments-sidebar-collapsed">
        <button
          className="comments-sidebar-expand-btn"
          onClick={() => setUserOverride(true)}
          title="Show comments"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
          {unresolvedComments.length > 0 && (
            <span className="comments-sidebar-badge">
              {unresolvedComments.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Calculate the minimum height for the sidebar content area
  // so it can contain all positioned cards
  const maxCardBottom = Object.values(cardPositions).reduce((max, top) => {
    return Math.max(max, top + 300);
  }, 0);

  return (
    <div className="comments-sidebar">
      <div className="comments-sidebar-header">
        <span className="comments-sidebar-title">
          Comments ({unresolvedComments.length})
        </span>
        <button
          className="comments-sidebar-collapse-btn"
          onClick={() => setUserOverride(false)}
          title="Hide comments"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
        </button>
      </div>
      <div
        ref={sidebarContentRef}
        className="comments-sidebar-content"
        style={{ minHeight: maxCardBottom }}
      >
        {unresolvedComments.map((comment) => {
          const top = cardPositions[comment.id] ?? 0;
          const isActive = comment.id === activeCommentId;

          return (
            <div
              key={comment.id}
              className="comments-sidebar-card-wrapper"
              style={{ position: 'absolute', top, left: 0, right: 0 }}
            >
              {isActive ? (
                <CommentPanel editor={editor} />
              ) : (
                <CompactCommentCard
                  comment={comment}
                  onClick={() => setActiveComment(comment.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
