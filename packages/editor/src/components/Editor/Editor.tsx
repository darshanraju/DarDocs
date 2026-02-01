import { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent, Editor as TiptapEditor } from '@tiptap/react';
import { getExtensions } from './extensions';
import { SlashCommandMenu } from './SlashCommandMenu';
import { WikiLinkMenu } from './WikiLinkMenu';
import { FloatingToolbar } from './FloatingToolbar';
import { TableEdgeControls } from '../Blocks/TableBlock/TableEdgeControls';
import { useDocumentStore } from '../../stores/documentStore';
import { useCommentStore } from '../../stores/commentStore';
import { debounce } from 'lodash-es';
import { EDITOR_SAVE_DEBOUNCE_MS, EDITOR_PLACEHOLDER } from '@dardocs/core';

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

  // Wiki-link state
  const [wikiLinkMenuOpen, setWikiLinkMenuOpen] = useState(false);
  const [wikiLinkQuery, setWikiLinkQuery] = useState('');
  const [wikiLinkMenuPosition, setWikiLinkMenuPosition] = useState({ top: 0, left: 0 });

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
          class: 'prose prose-sm focus:outline-none max-w-none',
          'data-placeholder': EDITOR_PLACEHOLDER,
        },
        handleKeyDown: (view, event) => {
          // Detect [[ for wiki-link trigger
          if (event.key === '[' && !wikiLinkMenuOpen) {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

            if (textBefore.endsWith('[')) {
              // Second [ typed — trigger wiki-link menu
              setTimeout(() => {
                setWikiLinkMenuOpen(true);
                setWikiLinkQuery('');
              }, 0);
            }
          }
          return false;
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
      onUpdate: ({ editor: ed }) => {
        if (!isViewMode) {
          debouncedUpdateContent(ed.getJSON());
        }

        // Update wiki-link query if menu is open
        if (wikiLinkMenuOpen) {
          const { state } = ed;
          const { selection } = state;
          const { $from } = selection;
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
          const bracketIndex = textBefore.lastIndexOf('[[');

          if (bracketIndex !== -1) {
            const query = textBefore.slice(bracketIndex + 2);
            setWikiLinkQuery(query);
          } else {
            // [[ was deleted, close menu
            setWikiLinkMenuOpen(false);
            setWikiLinkQuery('');
          }
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

  // Helper to get cursor position for menus
  const getCursorPosition = useCallback(() => {
    if (!editor) return { top: 0, left: 0 };

    const { view } = editor;
    const { state } = view;
    const { selection } = state;
    const coords = view.coordsAtPos(selection.from);
    const editorRect = editorContainerRef.current?.getBoundingClientRect();

    if (editorRect) {
      return {
        top: coords.bottom + 8,
        left: Math.max(coords.left, editorRect.left),
      };
    }
    return { top: coords.bottom + 8, left: coords.left };
  }, [editor]);

  // Update slash menu position based on cursor
  useEffect(() => {
    if (!editor || !slashMenuOpen) return;
    setSlashMenuPosition(getCursorPosition());
  }, [editor, slashMenuOpen, slashQuery, getCursorPosition]);

  // Update wiki-link menu position based on cursor
  useEffect(() => {
    if (!editor || !wikiLinkMenuOpen) return;
    setWikiLinkMenuPosition(getCursorPosition());
  }, [editor, wikiLinkMenuOpen, wikiLinkQuery, getCursorPosition]);

  const handleWikiLinkClose = useCallback(() => {
    setWikiLinkMenuOpen(false);
    setWikiLinkQuery('');
  }, []);

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
      <WikiLinkMenu
        editor={editor}
        isOpen={wikiLinkMenuOpen}
        onClose={handleWikiLinkClose}
        position={wikiLinkMenuPosition}
        query={wikiLinkQuery}
      />
      {editor && !isViewMode && (
        <>
          <FloatingToolbar editor={editor} />
          <TableEdgeControls
            editor={editor}
            editorContainerRef={editorContainerRef}
          />
        </>
      )}
    </div>
  );
}
