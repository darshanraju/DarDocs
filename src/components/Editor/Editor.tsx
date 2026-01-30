import { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent, Editor as TiptapEditor } from '@tiptap/react';
import { getExtensions } from './extensions';
import { SlashCommandMenu } from './SlashCommandMenu';
import { AddCommentBubble } from '../Comments/AddCommentBubble';
import { TableEdgeControls } from '../Blocks/TableBlock/TableEdgeControls';
import { useDocumentStore } from '../../stores/documentStore';
import { useCommentStore } from '../../stores/commentStore';
import { debounce } from 'lodash-es';
import { EDITOR_SAVE_DEBOUNCE_MS, EDITOR_PLACEHOLDER } from '../../lib/constants';

interface EditorProps {
  isViewMode?: boolean;
  onEditorReady?: (editor: TiptapEditor) => void;
}

export function Editor({ isViewMode = false, onEditorReady }: EditorProps) {
  const { document, updateContent } = useDocumentStore();
  const { setActiveComment } = useCommentStore();
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const handleSlashCommand = useCallback((query: string) => {
    setSlashQuery(query);
    setSlashMenuOpen(true);
  }, []);

  const handleSlashCommandClose = useCallback(() => {
    setSlashMenuOpen(false);
    setSlashQuery('');
  }, []);

  const editor = useEditor(
    {
      extensions: getExtensions(handleSlashCommand, handleSlashCommandClose),
      content: document?.content || { type: 'doc', content: [{ type: 'paragraph' }] },
      editable: !isViewMode,
      editorProps: {
        attributes: {
          class: 'prose prose-sm focus:outline-none max-w-none min-h-[300px]',
          'data-placeholder': EDITOR_PLACEHOLDER,
        },
        handleClick: (view, pos) => {
          // Check if clicked position has a comment mark
          const $pos = view.state.doc.resolve(pos);
          const marks = $pos.marks();
          const commentMark = marks.find((m) => m.type.name === 'comment');

          if (commentMark) {
            setActiveComment(commentMark.attrs.commentId);
            return false;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (!isViewMode) {
          debouncedUpdateContent(editor.getJSON());
        }
      },
    },
    [document?.metadata?.id, isViewMode]
  );

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Debounced content update
  const debouncedUpdateContent = useCallback(
    debounce((content: JSONContent) => {
      updateContent(content);
    }, EDITOR_SAVE_DEBOUNCE_MS),
    [updateContent]
  );

  // Update editor content when document changes (e.g., when loading a file)
  useEffect(() => {
    if (editor && document?.content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(document.content);

      if (currentContent !== newContent) {
        editor.commands.setContent(document.content);
      }
    }
  }, [editor, document?.content]);

  // Update editable state when view mode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isViewMode);
    }
  }, [editor, isViewMode]);

  // Update slash menu position based on cursor
  useEffect(() => {
    if (!editor || !slashMenuOpen) return;

    const updatePosition = () => {
      const { view } = editor;
      const { state } = view;
      const { selection } = state;

      // Get cursor coordinates
      const coords = view.coordsAtPos(selection.from);
      const editorRect = editorContainerRef.current?.getBoundingClientRect();

      if (editorRect) {
        setSlashMenuPosition({
          top: coords.bottom + 8,
          left: Math.max(coords.left, editorRect.left),
        });
      }
    };

    updatePosition();
  }, [editor, slashMenuOpen, slashQuery]);

  return (
    <div ref={editorContainerRef} className="relative">
      <EditorContent editor={editor} />
      <SlashCommandMenu
        editor={editor}
        query={slashQuery}
        isOpen={slashMenuOpen}
        onClose={handleSlashCommandClose}
        position={slashMenuPosition}
      />
      {editor && !isViewMode && (
        <>
          <AddCommentBubble editor={editor} />
          <TableEdgeControls
            editor={editor}
            editorContainerRef={editorContainerRef}
          />
        </>
      )}
    </div>
  );
}
