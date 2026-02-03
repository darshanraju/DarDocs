import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { Editor as TiptapEditor } from '@tiptap/react';
import {
  Editor,
  DocumentViewer,
  CommentSection,
  CommentsSidebar,
  SearchBar,
  SearchModal,
  TableOfContents,
  DocumentIcon,
  useDocumentStore,
  useCommentStore,
  useBoardStore,
  useWorkspaceStore,
  useAuthStore,
} from '@dardocs/editor';
import type { SearchResult } from '@dardocs/editor';
import { convertDocxToTipTap, convertMarkdownToTipTap, ACCEPTED_FILE_TYPES, DOCUMENT_TEMPLATES } from '@dardocs/core';
import type { DocumentTemplate } from '@dardocs/core';
import { toast } from 'sonner';

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
  const { loadFromApi: loadCommentsFromApi, setCurrentUser } = useCommentStore();
  const { loadBoards } = useBoardStore();
  const { saveDocument, setActiveDocId, loadDocument: loadFromDB } =
    useWorkspaceStore();
  const authUser = useAuthStore((s) => s.user);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
    null
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDocSearchOpen, setIsDocSearchOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+F / Cmd+F to open in-doc search, Ctrl+K / Cmd+K to open doc search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsDocSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleDocSearchClose = useCallback(() => {
    setIsDocSearchOpen(false);
  }, []);

  const handleOpenDocument = useCallback(
    (doc: SearchResult) => {
      navigate(`/doc/${doc.id}`);
    },
    [navigate]
  );

  // Set comment author from auth user
  useEffect(() => {
    if (authUser) {
      setCurrentUser({ id: authUser.id, name: authUser.name });
    }
  }, [authUser, setCurrentUser]);

  // Load document from API when docId changes
  useEffect(() => {
    if (!docId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadError(null);
        const doc = await loadFromDB(docId);
        if (cancelled) return;
        loadDocument(doc);
        loadCommentsFromApi(docId);
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
  }, [docId, loadFromDB, loadDocument, loadCommentsFromApi, loadBoards, setActiveDocId]);

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

  const handleIconChange = useCallback(
    (icon: string | undefined) => {
      updateMetadata({ icon });
    },
    [updateMetadata]
  );

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
              .setTextSelection(1)
              .focus()
              .run();
          } else {
            editorInstance.chain().setTextSelection(1).focus().run();
          }
        }
      }
    },
    [editorInstance]
  );

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    setEditorInstance(editor);
  }, []);

  // ── Drag-and-drop file import ─────────────────────────────
  // Use the live editor instance as the source of truth for emptiness.
  // editorInstance is null until onEditorReady fires, so we also check
  // the raw document content as a fallback for the first render.
  const isDocEmpty = useMemo(() => {
    if (editorInstance) {
      return editorInstance.isEmpty;
    }
    // Fallback before editor mounts: check raw content
    if (!document) return false;
    const c = document.content;
    if (!c || !c.content || c.content.length === 0) return true;
    if (c.content.length === 1) {
      const node = c.content[0];
      if (node.type === 'paragraph') {
        if (!node.content || node.content.length === 0) return true;
        // TipTap sometimes stores empty text nodes
        if (node.content.every((n: any) => n.type === 'text' && (!n.text || n.text.trim() === ''))) return true;
      }
    }
    return false;
    // Re-evaluate when the editor updates the document
  }, [editorInstance, document]);

  const IMPORT_EXTENSIONS = ['md', 'markdown', 'mdown', 'mkd', 'mdx', 'docx'];

  const isImportableFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return IMPORT_EXTENSIONS.includes(ext);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file || !isImportableFile(file)) {
      toast.error('Unsupported file type. Drop a .md or .docx file.');
      return;
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isDocx = ext === 'docx';
      const result = isDocx
        ? await convertDocxToTipTap(file)
        : convertMarkdownToTipTap(await file.text());

      updateContent(result.content);
      const title = file.name.replace(/\.(docx|md|markdown|mdown|mkd|mdx)$/i, '');
      updateMetadata({ title });

      if (result.warnings.length > 0) {
        toast.warning(`Imported with ${result.warnings.length} warning(s)`);
      } else {
        toast.success(`Imported: ${title}`);
      }
    } catch (err) {
      console.error('Drop import failed:', err);
      toast.error('Failed to import dropped file');
    }
  }, [isImportableFile, updateContent, updateMetadata]);

  const handleApplyTemplate = useCallback((template: DocumentTemplate) => {
    updateContent(template.content);
    updateMetadata({ title: template.title });
    toast.success(`Applied template: ${template.title}`);
  }, [updateContent, updateMetadata]);

  const handleFilePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isDocx = ext === 'docx';
      const result = isDocx
        ? await convertDocxToTipTap(file)
        : convertMarkdownToTipTap(await file.text());

      updateContent(result.content);
      const title = file.name.replace(/\.(docx|md|markdown|mdown|mkd|mdx)$/i, '');
      updateMetadata({ title });

      if (result.warnings.length > 0) {
        toast.warning(`Imported with ${result.warnings.length} warning(s)`);
      } else {
        toast.success(`Imported: ${title}`);
      }
    } catch (err) {
      console.error('File import failed:', err);
      toast.error('Failed to import file');
    }
  }, [updateContent, updateMetadata]);

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
    <main
      className="app-main"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="doc-drop-overlay">
          <div className="doc-drop-overlay-inner">
            <div className="doc-drop-overlay-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div className="doc-drop-overlay-label">Drop .md or .docx to import</div>
          </div>
        </div>
      )}
      {isSearchOpen && (
        <SearchBar editor={editorInstance} onClose={handleSearchClose} />
      )}
      <SearchModal
        isOpen={isDocSearchOpen}
        onClose={handleDocSearchClose}
        onOpenDocument={handleOpenDocument}
      />
      <div
        id="main-scroll-container"
        className="h-full overflow-y-auto overflow-x-hidden"
      >
        <div className="flex min-h-full">
          <TableOfContents />
          <div className="flex-1 min-w-0">
            <div className="max-w-[720px] mx-auto px-6 py-8">
              <div className="doc-title-area">
                <DocumentIcon
                  icon={document?.metadata.icon}
                  onIconChange={handleIconChange}
                />
                <input
                  ref={titleInputRef}
                  type="text"
                  value={document?.metadata.title || ''}
                  onChange={handleTitleChange}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="Untitled"
                  className="doc-title-input"
                />
              </div>

              <div className="relative">
                {isViewMode ? (
                  <DocumentViewer />
                ) : (
                  <Editor isViewMode={false} onEditorReady={handleEditorReady} />
                )}

                {isDocEmpty && !isViewMode && (
                  <div className="doc-empty-state">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={`${ACCEPTED_FILE_TYPES.markdown},${ACCEPTED_FILE_TYPES.docx}`}
                      onChange={handleFilePick}
                      className="hidden"
                    />

                    <div className="doc-empty-state-section">
                      <span className="doc-empty-state-label">Start from a template</span>
                      <div className="doc-empty-state-templates">
                        <button
                          className="doc-template-card doc-template-card-accent"
                          onClick={() => navigate('/templates/god-mode')}
                        >
                          <span className="doc-template-card-icon">{'\uD83D\uDD2E'}</span>
                          <span className="doc-template-card-title">God Mode</span>
                          <span className="doc-template-card-desc">Auto-generate system docs from repos</span>
                        </button>
                        {DOCUMENT_TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            className="doc-template-card"
                            onClick={() => handleApplyTemplate(t)}
                          >
                            <span className="doc-template-card-icon">{t.icon}</span>
                            <span className="doc-template-card-title">{t.title}</span>
                            <span className="doc-template-card-desc">{t.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="doc-empty-state-divider">
                      <span>or</span>
                    </div>

                    <div className="doc-empty-state-section">
                      <span className="doc-empty-state-label">Import a file</span>
                      <p className="doc-empty-state-text">
                        Drag a <strong>.md</strong> or <strong>.docx</strong> file anywhere on the page
                      </p>
                      <button
                        className="doc-empty-state-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose a file
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <CommentSection />
            </div>
          </div>

          <CommentsSidebar editor={editorInstance} />
        </div>
      </div>
    </main>
  );
}
