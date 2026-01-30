import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Editor } from './components/Editor/Editor';
import { DocumentViewer } from './components/Viewer/DocumentViewer';
import { TableOfContents } from './components/TableOfContents/TableOfContents';
import { CommentPanel } from './components/Comments/CommentPanel';
import { useDocumentStore } from './stores/documentStore';

function App() {
  const [isViewMode] = useState(false);
  const { document, createDocument, updateMetadata } = useDocumentStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);

  // Create a new document on first load
  useEffect(() => {
    if (!document) {
      createDocument('');
    }
  }, [document, createDocument]);

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateMetadata({ title: e.target.value });
    },
    [updateMetadata]
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleInputRef.current?.blur();
      }
    },
    []
  );

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    setEditorInstance(editor);
  }, []);

  return (
    <div className="flex h-screen bg-white">
      {/* Table of Contents sidebar */}
      <TableOfContents />

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-white">
        <div id="main-scroll-container" className="h-full overflow-y-auto">
          <div
            ref={contentAreaRef}
            className="max-w-[720px] mx-auto px-6 py-8"
          >
            {/* Title */}
            <input
              ref={titleInputRef}
              type="text"
              value={document?.metadata.title || ''}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Enter title here"
              className="doc-title-input"
            />

            {/* Editor */}
            {isViewMode ? (
              <DocumentViewer />
            ) : (
              <Editor isViewMode={false} onEditorReady={handleEditorReady} />
            )}
          </div>
        </div>
      </main>

      {/* Comment Panel (fixed position, floats to the right of content) */}
      <CommentPanel editor={editorInstance} contentAreaRef={contentAreaRef} />

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
