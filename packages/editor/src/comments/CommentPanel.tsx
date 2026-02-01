import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronUp, ChevronDown, Link2, Check, Send, X } from 'lucide-react';
import { useCommentStore, type MockUser } from '../stores/commentStore';

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function UserAvatar({ user, size = 32 }: { user: MockUser; size?: number }) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: user.color,
        fontSize: size * 0.375,
      }}
    >
      {initials}
    </div>
  );
}

interface CommentPanelProps {
  editor: Editor | null;
}

export function CommentPanel({ editor }: CommentPanelProps) {
  const {
    comments,
    activeCommentId,
    setActiveComment,
    addReply,
    resolveComment,
    deleteComment,
    updateCommentText,
  } = useCommentStore();

  const [replyText, setReplyText] = useState('');
  const [draftText, setDraftText] = useState('');
  const replyInputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);

  const activeComment = comments.find(
    (c) => c.id === activeCommentId && !c.resolved
  );
  const isDraft = activeComment && activeComment.text === '';

  // Navigate between comments
  const unresolvedComments = comments.filter((c) => !c.resolved);
  const activeIndex = unresolvedComments.findIndex(
    (c) => c.id === activeCommentId
  );

  const navigateComment = (direction: 'prev' | 'next') => {
    if (unresolvedComments.length === 0) return;
    let newIndex;
    if (direction === 'next') {
      newIndex =
        activeIndex + 1 >= unresolvedComments.length ? 0 : activeIndex + 1;
    } else {
      newIndex =
        activeIndex - 1 < 0 ? unresolvedComments.length - 1 : activeIndex - 1;
    }
    setActiveComment(unresolvedComments[newIndex].id);
  };

  // Focus input when active
  useEffect(() => {
    if (!activeComment) return;
    if (isDraft) {
      setTimeout(() => draftInputRef.current?.focus(), 50);
    } else {
      setTimeout(() => replyInputRef.current?.focus(), 50);
    }
  }, [activeComment?.id, isDraft]);

  // Reset text on switch
  useEffect(() => {
    setReplyText('');
    setDraftText('');
  }, [activeCommentId]);

  const handleReplySubmit = () => {
    if (!replyText.trim() || !activeCommentId) return;
    addReply(activeCommentId, replyText.trim());
    setReplyText('');
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReplySubmit();
    }
  };

  const handleDraftSubmit = () => {
    if (!draftText.trim() || !activeCommentId) return;
    updateCommentText(activeCommentId, draftText.trim());
    setDraftText('');
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDraftSubmit();
    }
    if (e.key === 'Escape') {
      if (activeCommentId && editor) {
        editor.chain().focus().unsetComment(activeCommentId).run();
        deleteComment(activeCommentId);
      }
      setActiveComment(null);
    }
  };

  const handleResolve = () => {
    if (!activeCommentId || !editor) return;
    editor.chain().focus().unsetComment(activeCommentId).run();
    resolveComment(activeCommentId);
  };

  const handleDelete = () => {
    if (!activeCommentId || !editor) return;
    editor.chain().focus().unsetComment(activeCommentId).run();
    deleteComment(activeCommentId);
  };

  if (!activeComment) return null;

  return (
    <div className="comment-panel">
      {/* Quoted text + actions header */}
      <div className="comment-panel-header">
        <div className="comment-panel-quote">
          <span className="comment-panel-quote-text">
            {activeComment.quotedText}
          </span>
        </div>
        <div className="comment-panel-actions">
          <div className="comment-panel-nav">
            <button
              onClick={() => navigateComment('next')}
              className="comment-panel-action-btn"
              title="Next comment"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => navigateComment('prev')}
              className="comment-panel-action-btn"
              title="Previous comment"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          <div className="comment-panel-nav">
            <button className="comment-panel-action-btn" title="Copy link">
              <Link2 size={16} />
            </button>
            <button
              onClick={handleResolve}
              className="comment-panel-action-btn"
              title="Resolve"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Draft input (new comment without text yet) */}
      {isDraft ? (
        <div className="comment-panel-draft">
          <div className="comment-panel-draft-row">
            <UserAvatar user={activeComment.author} size={28} />
            <input
              ref={draftInputRef}
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="Add a comment..."
              className="comment-panel-draft-input"
            />
          </div>
          <div className="comment-panel-draft-actions">
            <button onClick={handleDelete} className="comment-panel-cancel-btn">
              <X size={14} />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleDraftSubmit}
              className="comment-panel-submit-btn"
              disabled={!draftText.trim()}
            >
              <span>Comment</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Comment thread */}
          <div className="comment-panel-thread">
            {/* Original comment */}
            <div className="comment-panel-message">
              <div className="comment-panel-message-header">
                <UserAvatar user={activeComment.author} />
                <div className="comment-panel-message-meta">
                  <span className="comment-panel-author">
                    {activeComment.author.name}
                  </span>
                  <span className="comment-panel-time">
                    {formatTime(activeComment.createdAt)}
                  </span>
                </div>
              </div>
              <div className="comment-panel-text">{activeComment.text}</div>
            </div>

            {/* Replies */}
            {activeComment.replies.map((reply) => (
              <div
                key={reply.id}
                className="comment-panel-message comment-panel-reply-msg"
              >
                <div className="comment-panel-message-header">
                  <UserAvatar user={reply.author} size={28} />
                  <div className="comment-panel-message-meta">
                    <span className="comment-panel-author">
                      {reply.author.name}
                    </span>
                    <span className="comment-panel-time">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="comment-panel-text">{reply.text}</div>
              </div>
            ))}
          </div>

          {/* Reply input */}
          <div className="comment-panel-reply">
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              placeholder="Reply"
              className="comment-panel-reply-input"
            />
            <button
              onClick={handleReplySubmit}
              className="comment-panel-reply-btn"
              disabled={!replyText.trim()}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
