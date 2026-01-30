import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { MessageSquarePlus } from 'lucide-react';
import { useCommentStore } from '../../stores/commentStore';

interface AddCommentBubbleProps {
  editor: Editor | null;
}

export function AddCommentBubble({ editor }: AddCommentBubbleProps) {
  const { addComment, setActiveComment } = useCommentStore();
  const [bubblePosition, setBubblePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const updateBubble = useCallback(() => {
    if (!editor) {
      setBubblePosition(null);
      setHasSelection(false);
      return;
    }

    const { state } = editor;
    const { selection } = state;
    const { from, to } = selection;

    // Only show if there's a text selection (not just a cursor)
    if (from === to || !editor.isFocused) {
      setHasSelection(false);
      return;
    }

    // Don't show if selection is inside a code block
    const $from = state.doc.resolve(from);
    if ($from.parent.type.name === 'codeBlock') {
      setHasSelection(false);
      return;
    }

    // Check if selection already has a comment mark
    const hasCommentMark = state.doc.rangeHasMark(
      from,
      to,
      state.schema.marks.comment
    );
    if (hasCommentMark) {
      setHasSelection(false);
      return;
    }

    setHasSelection(true);

    // Position the bubble above the end of the selection
    const coords = editor.view.coordsAtPos(to);
    setBubblePosition({
      top: coords.top - 40,
      left: coords.left,
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    editor.on('selectionUpdate', updateBubble);
    editor.on('blur', () => {
      // Delay to allow click on bubble before hiding
      setTimeout(() => {
        if (!editor.isFocused) {
          setHasSelection(false);
        }
      }, 200);
    });
    editor.on('focus', updateBubble);

    return () => {
      editor.off('selectionUpdate', updateBubble);
    };
  }, [editor, updateBubble]);

  const handleAddComment = useCallback(() => {
    if (!editor) return;

    const { state } = editor;
    const { from, to } = state.selection;

    if (from === to) return;

    // Get the selected text
    const quotedText = state.doc.textBetween(from, to, ' ');

    // Generate a comment ID
    const commentId = crypto.randomUUID();

    // Apply the comment mark to the selection
    editor.chain().focus().setComment(commentId).run();

    // Create a draft comment (empty text, will be filled in the panel)
    addComment(commentId, '', quotedText);
    setActiveComment(commentId);
  }, [editor, addComment, setActiveComment]);

  if (!hasSelection || !bubblePosition) return null;

  return (
    <button
      className="add-comment-bubble"
      style={{
        position: 'fixed',
        top: bubblePosition.top,
        left: bubblePosition.left,
        zIndex: 99,
      }}
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent editor blur
        handleAddComment();
      }}
      title="Add comment"
    >
      <MessageSquarePlus size={16} />
    </button>
  );
}
