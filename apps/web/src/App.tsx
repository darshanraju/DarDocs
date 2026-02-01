import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { createNewDocument } from '@dardocs/core';
import type { DarDocsDocument } from '@dardocs/core';
import { DarDocsEditor, TableOfContents } from '@dardocs/editor';
import '@dardocs/editor/styles';

function App() {
  const [doc, setDoc] = useState<DarDocsDocument | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Create a new document on first load
  useEffect(() => {
    if (!doc) {
      setDoc(createNewDocument(''));
    }
  }, [doc]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!doc) return;
      setDoc({
        ...doc,
        metadata: {
          ...doc.metadata,
          title: e.target.value,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [doc]
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Focus the editor — the ProseMirror element
        const pm = document.querySelector('.ProseMirror') as HTMLElement;
        pm?.focus();
      }
    },
    []
  );

  const handleDocChange = useCallback((updatedDoc: DarDocsDocument) => {
    setDoc(updatedDoc);
  }, []);

  if (!doc) return null;

  return (
    <div className="flex h-screen bg-white">
      <TableOfContents />

      <main className="flex-1 overflow-hidden bg-white">
        <div id="main-scroll-container" className="h-full overflow-y-auto overflow-x-hidden">
          <div className="max-w-[720px] mx-auto px-6 py-8">
            <input
              ref={titleInputRef}
              type="text"
              value={doc.metadata.title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Enter title here"
              className="doc-title-input"
            />

            <DarDocsEditor
              document={doc}
              onChange={handleDocChange}
              editable={true}
            />
          </div>
        </div>
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
