import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Menu, Home, ChevronRight, Pin, Share2, ChevronDown, Bell, MoreHorizontal, Search, Plus, Smile, Image, FileText, Focus } from 'lucide-react';
import { Editor } from './components/Editor/Editor';
import { DocumentViewer } from './components/Viewer/DocumentViewer';
import { SearchModal } from './components/Search/SearchModal';
import { BacklinksPanel } from './components/Backlinks/BacklinksPanel';
import { FocusMode } from './components/FocusMode/FocusMode';
import { useDocumentStore } from './stores/documentStore';
import { useBoardStore } from './stores/boardStore';
import { useLibraryStore, extractTextFromContent, extractHeadingsFromContent } from './stores/libraryStore';
import type { DocumentIndexEntry } from './stores/libraryStore';
import { APP_NAME, DARDOCS_EXTENSION } from './lib/constants';

function App() {
  const [isViewMode, setIsViewMode] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const { document, hasUnsavedChanges, createDocument, updateMetadata, markSaved } = useDocumentStore();
  const { getAllBoards } = useBoardStore();
  const { indexDocument, loadFromStorage } = useLibraryStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load library from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Create a new document on first load
  useEffect(() => {
    if (!document) {
      createDocument('');
    }
  }, [document, createDocument]);

  // Index current document in library whenever it changes
  useEffect(() => {
    if (!document?.metadata?.id || !document.content) return;

    const text = extractTextFromContent(document.content as Record<string, unknown>);
    const headings = extractHeadingsFromContent(document.content as Record<string, unknown>);

    const entry: DocumentIndexEntry = {
      id: document.metadata.id,
      title: document.metadata.title,
      createdAt: document.metadata.createdAt,
      updatedAt: document.metadata.updatedAt,
      headings,
      textPreview: text.slice(0, 200),
      textContent: text,
      links: [],
    };

    indexDocument(entry);
  }, [document?.metadata?.id, document?.metadata?.title, document?.content, document?.metadata?.updatedAt, indexDocument]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle file load
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const doc = JSON.parse(text);

      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Open another document?');
        if (!confirmed) return;
      }

      useBoardStore.getState().clearBoards();
      useDocumentStore.getState().loadDocument(doc);
      if (doc.boards) {
        useBoardStore.getState().loadBoards(doc.boards);
      }
      toast.success(`Opened: ${doc.metadata.title || 'Untitled'}`);
    } catch {
      toast.error('Failed to open document');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+S: Save
      if (ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Ctrl+O: Open
      if (ctrlKey && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }

      // Ctrl+N: New
      if (ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNew();
      }

      // Ctrl+K: Search
      if (ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Ctrl+Shift+F: Focus mode
      if (ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [document, getAllBoards, hasUnsavedChanges]);

  const handleSave = useCallback(() => {
    const doc = useDocumentStore.getState().document;
    if (!doc) return;

    const fullDocument = {
      ...doc,
      boards: getAllBoards(),
      metadata: {
        ...doc.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    const json = JSON.stringify(fullDocument, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = window.document.createElement('a');
    a.href = url;
    const filename = (doc.metadata.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    a.download = `${filename || 'untitled'}${DARDOCS_EXTENSION}`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);

    markSaved();
    toast.success('Document saved');
  }, [getAllBoards, markSaved]);

  const handleNew = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Create a new document?');
      if (!confirmed) return;
    }
    useBoardStore.getState().clearBoards();
    createDocument('');
    toast.success('New document created');
  }, [hasUnsavedChanges, createDocument]);

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

  // Handle opening a document from search
  const handleOpenDocumentFromSearch = useCallback((_doc: DocumentIndexEntry) => {
    toast.info(`Document "${_doc.title}" found — full navigation requires cloud storage`);
  }, []);

  const mainContent = (
    <>
      {/* Document options */}
      <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
        <button className="flex items-center gap-1.5 hover:text-gray-600">
          <Smile className="w-4 h-4" />
          Add Icon
        </button>
        <button className="flex items-center gap-1.5 hover:text-gray-600">
          <Image className="w-4 h-4" />
          Add Cover
        </button>
        <button className="flex items-center gap-1.5 hover:text-gray-600">
          <FileText className="w-4 h-4" />
          Show Document Details
        </button>
      </div>

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

      {/* Backlinks panel */}
      <BacklinksPanel />
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dardocs.json,.json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Minimal Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        {/* Left side: Navigation */}
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
            <Menu className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
            <Home className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center ml-2 text-sm">
            <span className="text-gray-600 hover:text-gray-900 cursor-pointer">{APP_NAME}</span>
            <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
            <span className="text-gray-600 hover:text-gray-900 cursor-pointer">Documents</span>
            <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
            <span className="text-gray-900 font-medium flex items-center gap-1">
              {document?.metadata.title || 'Untitled document'}
              {hasUnsavedChanges && <span className="text-gray-400">*</span>}
              <Pin className="w-3.5 h-3.5 text-[#00b386] ml-1" />
            </span>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#3370ff] hover:bg-[#2860e0] text-white text-sm font-medium rounded"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          {/* Focus Mode toggle */}
          <button
            onClick={() => setIsFocusMode(true)}
            className="p-2 hover:bg-gray-100 rounded text-gray-500"
            title="Focus mode (Ctrl+Shift+F)"
          >
            <Focus className="w-5 h-5" />
          </button>

          {/* Mode dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
            >
              {isViewMode ? 'Viewing' : 'Editing'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showModeDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => { setIsViewMode(false); setShowModeDropdown(false); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!isViewMode ? 'text-[#3370ff] bg-blue-50' : 'text-gray-700'}`}
                >
                  Editing
                </button>
                <button
                  onClick={() => { setIsViewMode(true); setShowModeDropdown(false); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${isViewMode ? 'text-[#3370ff] bg-blue-50' : 'text-gray-700'}`}
                >
                  Viewing
                </button>
              </div>
            )}
          </div>

          <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 hover:bg-gray-100 rounded text-gray-500"
            title="Search (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={handleNew}
            className="p-2 hover:bg-gray-100 rounded text-gray-500"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Secondary bar */}
      <div className="flex items-center gap-3 px-4 py-1 text-xs text-gray-500 border-b border-gray-100">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="hover:text-[#3370ff] cursor-pointer"
        >
          Open File
        </button>
        <span className="text-gray-300">|</span>
        <span>{hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}</span>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="hover:text-[#3370ff] cursor-pointer"
        >
          Search docs (Ctrl+K)
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setIsFocusMode(true)}
          className="hover:text-[#3370ff] cursor-pointer"
        >
          Focus mode
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-white">
        <div className="h-full overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-8">
            {mainContent}
          </div>
        </div>
      </main>

      {/* Focus Mode overlay */}
      <FocusMode isActive={isFocusMode} onExit={() => setIsFocusMode(false)}>
        <div className="max-w-[720px] mx-auto px-6">
          <input
            type="text"
            value={document?.metadata.title || ''}
            onChange={handleTitleChange}
            placeholder="Enter title here"
            className="w-full text-4xl font-semibold text-gray-100 placeholder-gray-600 border-none outline-none mb-4 bg-transparent"
          />
          <Editor isViewMode={false} />
        </div>
      </FocusMode>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenDocument={handleOpenDocumentFromSearch}
      />

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
