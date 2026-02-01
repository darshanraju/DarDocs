import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import type { Editor as TiptapEditor } from '@tiptap/react';
import {
  Editor,
  DocumentViewer,
  TableOfContents,
  CommentSection,
  CommentsSidebar,
  SearchBar,
  useDocumentStore,
} from '@dardocs/editor';

function App() {
  const [isViewMode] = useState(false);
  const { document, createDocument, updateMetadata } = useDocumentStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Ctrl+F / Cmd+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

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
        if (editorInstance) {
          const { doc, schema } = editorInstance.state;
          const firstChild = doc.firstChild;

          if (firstChild && !firstChild.isTextblock) {
            // First node is a block (table, image, etc.) — insert a paragraph above it
            editorInstance
              .chain()
              .command(({ tr }) => {
                tr.insert(0, schema.nodes.paragraph.create());
                return true;
              })
              .focus('start')
              .run();
          } else {
            editorInstance.commands.focus('start');
          }
        }
      }
    },
    [editorInstance]
  );

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    setEditorInstance(editor);
  }, []);

  return (
    <div className="flex h-screen bg-white">
      {/* Table of Contents sidebar */}
      <TableOfContents />

      {/* Main content + Comments sidebar */}
      <main className="flex-1 overflow-hidden bg-white relative">
        {isSearchOpen && (
          <SearchBar editor={editorInstance} onClose={handleSearchClose} />
        )}
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
