import { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import { getExtensions } from './extensions';
import { EditorToolbar } from './EditorToolbar';
import { SlashCommandMenu } from './SlashCommandMenu';
import { useDocumentStore } from '../../stores/documentStore';
import { debounce } from 'lodash-es';
import { EDITOR_SAVE_DEBOUNCE_MS } from '../../lib/constants';

interface EditorProps {
  isViewMode?: boolean;
}

export function Editor({ isViewMode = false }: EditorProps) {
  const { document, updateContent } = useDocumentStore();
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
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
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

  // Keyboard shortcut: Ctrl+K for link
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Link modal is handled in EditorToolbar
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  return (
    <div ref={editorContainerRef} className="flex flex-col h-full">
      {!isViewMode && <EditorToolbar editor={editor} />}
      <div
        className={`flex-1 overflow-y-auto ${isViewMode ? 'bg-gray-50' : 'bg-white'}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <EditorContent editor={editor} className="min-h-[500px]" />
        </div>
      </div>
      <SlashCommandMenu
        editor={editor}
        query={slashQuery}
        isOpen={slashMenuOpen}
        onClose={handleSlashCommandClose}
        position={slashMenuPosition}
      />
    </div>
  );
}
