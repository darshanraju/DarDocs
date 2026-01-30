import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Editor } from './components/Editor/Editor';
import { DocumentViewer } from './components/Viewer/DocumentViewer';
import { TableOfContents } from './components/TableOfContents/TableOfContents';
import { CommentSection } from './components/Comments/CommentSection';
import { CommentsSidebar } from './components/Comments/CommentsSidebar';
import { useDocumentStore } from './stores/documentStore';

function App() {
  const [isViewMode] = useState(false);
  const { document, createDocument, updateMetadata } = useDocumentStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
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

      {/* Main content + Comments sidebar */}
      <main className="flex-1 overflow-hidden bg-white">
        <div id="main-scroll-container" className="h-full overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full">
            {/* Document content */}
            <div className="flex-1 min-w-0">
              <div className="max-w-[720px] mx-auto px-6 py-8">
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

                {/* Comments */}
                <CommentSection />
              </div>
            </div>

            {/* Comments sidebar (right column) */}
            <CommentsSidebar editor={editorInstance} />
          </div>
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
