import { useEffect, useCallback, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { DarDocsDocument } from '@dardocs/core';
import { Editor } from './Editor';
import { TableOfContents } from './toc/TableOfContents';
import { CommentSection } from './comments/CommentSection';
import { CommentsSidebar } from './comments/CommentsSidebar';
import { useDocumentStore } from './stores/documentStore';
import { useBoardStore } from './stores/boardStore';

export interface DarDocsEditorProps {
  /** The document to edit */
  document: DarDocsDocument;
  /** Called when the document changes (debounced) */
  onChange?: (doc: DarDocsDocument) => void;
  /** Additional CSS class for the outer wrapper */
  className?: string;
  /** Show in read-only mode */
  editable?: boolean;
}

export function DarDocsEditor({
  document: doc,
  onChange,
  className,
  editable = true,
}: DarDocsEditorProps) {
  const { loadDocument, document: storeDoc } = useDocumentStore();
  const { loadBoards } = useBoardStore();
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Load document into stores on mount or when doc changes
  useEffect(() => {
    loadDocument(doc);
    if (doc.boards) {
      loadBoards(doc.boards);
    }
  }, [doc, loadDocument, loadBoards]);

  // Sync store changes back to parent
  useEffect(() => {
    return useDocumentStore.subscribe((state) => {
      if (onChangeRef.current && state.document && state.hasUnsavedChanges) {
        const boards = useBoardStore.getState().getAllBoards();
        onChangeRef.current({
          ...state.document,
          boards,
        });
      }
    });
  }, []);

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    setEditorInstance(editor);
  }, []);

  if (!storeDoc) return null;

  return (
    <div className={`flex min-h-full ${className ?? ''}`}>
      <div className="flex-1 min-w-0">
        <Editor isViewMode={!editable} onEditorReady={handleEditorReady} />
        <CommentSection />
      </div>
      {editable && <CommentsSidebar editor={editorInstance} />}
    </div>
  );
}
