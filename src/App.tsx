import React, { useEffect, useState, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { FilePlus, Eye, Edit2 } from 'lucide-react';
import { Editor } from './components/Editor/Editor';
import { DocumentViewer } from './components/Viewer/DocumentViewer';
import { SaveDocument, LoadDocument, ImportDocx } from './components/FileHandler';
import { Button, Tooltip } from './components/UI';
import { useDocumentStore } from './stores/documentStore';
import { useBoardStore } from './stores/boardStore';
import { APP_NAME } from './lib/constants';

function App() {
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { document, hasUnsavedChanges, createDocument, updateMetadata } = useDocumentStore();
  const { getAllBoards } = useBoardStore();

  // Create a new document on first load
  useEffect(() => {
    if (!document) {
      createDocument('Untitled Document');
    }
  }, [document, createDocument]);

  // Handle new document
  const handleNewDocument = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Create a new document anyway?');
      if (!confirmed) return;
    }

    useBoardStore.getState().clearBoards();
    createDocument('Untitled Document');
    setIsViewMode(false);
    toast.success('New document created');
  }, [hasUnsavedChanges, createDocument]);

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateMetadata({ title: e.target.value });
    },
    [updateMetadata]
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setIsEditingTitle(false);
      }
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+S: Save
      if (ctrlKey && e.key === 's') {
        e.preventDefault();
        if (document) {
          const fullDocument = {
            ...document,
            boards: getAllBoards(),
            metadata: {
              ...document.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          const json = JSON.stringify(fullDocument, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const a = window.document.createElement('a');
          a.href = url;
          const filename = document.metadata.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
          a.download = `${filename || 'untitled'}.opendocs.json`;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);

          useDocumentStore.getState().markSaved();
          toast.success('Document saved');
        }
      }

      // Ctrl+O: Open (handled by LoadDocument component, but prevent default)
      if (ctrlKey && e.key === 'o') {
        e.preventDefault();
        // Trigger file input click
        const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement;
        fileInput?.click();
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [document, getAllBoards]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        {/* Left side: Logo and document title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">{APP_NAME}</h1>
          <div className="h-6 w-px bg-gray-200" />
          {isEditingTitle ? (
            <input
              type="text"
              value={document?.metadata.title || ''}
              onChange={handleTitleChange}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={handleTitleKeyDown}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              {document?.metadata.title || 'Untitled'}
              {hasUnsavedChanges && <span className="text-yellow-500">*</span>}
            </button>
          )}
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          <Tooltip content="New document">
            <Button variant="secondary" size="sm" onClick={handleNewDocument}>
              <FilePlus className="w-4 h-4 mr-1.5" />
              New
            </Button>
          </Tooltip>
          <LoadDocument />
          <SaveDocument />
          <ImportDocx />

          <div className="h-6 w-px bg-gray-200 mx-2" />

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-md p-0.5">
            <Tooltip content="Edit mode">
              <button
                onClick={() => setIsViewMode(false)}
                className={`px-3 py-1 text-sm rounded ${
                  !isViewMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="View mode">
              <button
                onClick={() => setIsViewMode(true)}
                className={`px-3 py-1 text-sm rounded ${
                  isViewMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {isViewMode ? <DocumentViewer /> : <Editor isViewMode={false} />}
      </main>

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
