import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { Editor as TiptapEditor } from '@tiptap/react';
import {
  Editor,
  DocumentViewer,
  CommentSection,
  CommentsSidebar,
  SearchBar,
  useDocumentStore,
  useCommentStore,
  useBoardStore,
  useWorkspaceStore,
} from '@dardocs/editor';

export function DocumentPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [isViewMode] = useState(false);
  const {
    document,
    loadDocument,
    updateMetadata,
    updateContent,
  } = useDocumentStore();
  const { loadComments } = useCommentStore();
  const { loadBoards } = useBoardStore();
  const { saveDocument, setActiveDocId, loadDocument: loadFromDB } =
    useWorkspaceStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
    null
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load document from IndexedDB when docId changes
  useEffect(() => {
    if (!docId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadError(null);
        const doc = await loadFromDB(docId);
        if (cancelled) return;
        loadDocument(doc);
        loadComments(doc.comments || []);
        loadBoards(doc.boards || {});
        setActiveDocId(docId);
      } catch {
        if (!cancelled) {
          setLoadError('Document not found');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [docId, loadFromDB, loadDocument, loadComments, loadBoards, setActiveDocId]);

  // Auto-save: debounce saves to IndexedDB
  useEffect(() => {
    if (!document || !docId || document.metadata.id !== docId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveDocument(document);
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [document, docId, saveDocument]);

  // Save immediately on unmount
  useEffect(() => {
    return () => {
      const doc = useDocumentStore.getState().document;
      if (doc && docId && doc.metadata.id === docId) {
        // Fire-and-forget save
        saveDocument(doc);
      }
    };
    // Only run cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

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

  if (loadError) {
    return (
      <div className="document-error">
        <p>{loadError}</p>
        <button onClick={() => navigate('/')}>Back to workspace</button>
      </div>
    );
  }

  if (!document || document.metadata.id !== docId) {
    return (
      <div className="document-loading">
        <div className="document-loading-skeleton" />
      </div>
    );
  }

  return (
    <main className="app-main">
      {isSearchOpen && (
        <SearchBar editor={editorInstance} onClose={handleSearchClose} />
      )}
      <div
        id="main-scroll-container"
        className="h-full overflow-y-auto overflow-x-hidden"
      >
        <div className="flex min-h-full">
          <div className="flex-1 min-w-0">
            <div className="max-w-[720px] mx-auto px-6 py-8">
              <input
                ref={titleInputRef}
                type="text"
                value={document?.metadata.title || ''}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled"
                className="doc-title-input"
              />

              {isViewMode ? (
                <DocumentViewer />
              ) : (
                <Editor isViewMode={false} onEditorReady={handleEditorReady} />
              )}

              <CommentSection />
            </div>
          </div>

          <CommentsSidebar editor={editorInstance} />
        </div>
      </div>
    </main>
  );
}
