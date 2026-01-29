import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { Editor } from './components/Editor/Editor';
import { DocumentViewer } from './components/Viewer/DocumentViewer';
import { useDocumentStore } from './stores/documentStore';

function App() {
  const [isViewMode] = useState(false);
  const { document, createDocument, updateMetadata } = useDocumentStore();
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-white">
        <div className="h-full overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-8">
            {/* Title */}
            <input
              ref={titleInputRef}
              type="text"
              value={document?.metadata.title || ''}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Enter title here"
              className="w-full text-4xl font-semibold text-gray-900 placeholder-gray-300 border-none outline-none mb-4 bg-transparent"
            />

            {/* Editor */}
            {isViewMode ? <DocumentViewer /> : <Editor isViewMode={false} />}
          </div>
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
