import { useState, useCallback, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, MoreHorizontalIcon, Delete01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useCommentStore } from '../../stores/commentStore';
import type { Comment } from '@dardocs/core';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="comment-item">
      <div className="comment-avatar">
        {comment.author.avatarUrl ? (
          <img src={comment.author.avatarUrl} alt={comment.author.name} />
        ) : (
          <span>{getInitials(comment.author.name)}</span>
        )}
      </div>
      <div className="comment-body">
        <div className="comment-header">
          <span className="comment-author">{comment.author.name}</span>
          <span className="comment-time">{formatTimestamp(comment.createdAt)}</span>
          <div className="comment-actions" ref={menuRef}>
            <button
              className="comment-action-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
            </button>
            {menuOpen && (
              <div className="comment-action-menu">
                <button
                  onClick={() => {
                    onDelete(comment.id);
                    setMenuOpen(false);
                  }}
                >
                  <HugeiconsIcon icon={Delete01Icon} size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="comment-text">{comment.text}</div>
        {comment.imageUrl && (
          <div className="comment-image">
            <img src={comment.imageUrl} alt="Comment attachment" />
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection() {
  const { comments, addDocumentComment, deleteComment } = useCommentStore();
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const documentComments = comments.filter((c) => c.type === 'document');

  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text && !attachedImage) return;

    addDocumentComment(text, attachedImage || undefined);

    setInputText('');
    setAttachedImage(null);
  }, [inputText, attachedImage, addDocumentComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    []
  );

  const removeAttachedImage = useCallback(() => {
    setAttachedImage(null);
  }, []);

  return (
    <div className="comment-section">
      <div className="comment-section-header">
        <h2>Comments</h2>
      </div>
      <div className="comment-section-divider" />

      <div className="comment-list">
        {documentComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onDelete={deleteComment}
          />
        ))}
      </div>

      {/* Attached image preview */}
      {attachedImage && (
        <div className="comment-input-preview">
          <img src={attachedImage} alt="Attachment preview" />
          <button className="comment-input-preview-remove" onClick={removeAttachedImage}>
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="comment-input-wrapper">
        <textarea
          ref={textInputRef}
          className="comment-input"
          placeholder="Add a comment"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <div className="comment-input-actions">
          <button
            className="comment-input-action-btn"
            onClick={handleImageUpload}
            title="Add image"
          >
            <HugeiconsIcon icon={Image01Icon} size={18} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
