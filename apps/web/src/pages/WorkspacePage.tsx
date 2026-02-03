import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, File01Icon, Clock01Icon, Rocket01Icon, Upload01Icon } from '@hugeicons/core-free-icons';
import { useWorkspaceStore, useDocumentStore, useBoardStore } from '@dardocs/editor';
import { convertDocxToTipTap, convertMarkdownToTipTap, createNewDocument, ACCEPTED_FILE_TYPES } from '@dardocs/core';
import { toast } from 'sonner';

export function WorkspacePage() {
  const { tree, createDocument, setActiveDocId, saveDocument } = useWorkspaceStore();
  const { loadDocument } = useDocumentStore();
  const { clearBoards } = useBoardStore();
  const navigate = useNavigate();
  const mdInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleCreate = useCallback(async () => {
    const doc = await createDocument('Untitled', null);
    setActiveDocId(doc.metadata.id);
    navigate(`/doc/${doc.metadata.id}`);
  }, [createDocument, setActiveDocId, navigate]);

  const handleImportFile = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isDocx = ext === 'docx';

      const result = isDocx
        ? await convertDocxToTipTap(file)
        : convertMarkdownToTipTap(await file.text());

      const title = file.name.replace(/\.(docx|md|markdown|mdown|mkd|mdx)$/i, '');
      const doc = await createDocument(title, null);
      setActiveDocId(doc.metadata.id);

      // Load into editor stores
      const newDoc = createNewDocument(title);
      newDoc.metadata.id = doc.metadata.id;
      newDoc.content = result.content;
      clearBoards();
      loadDocument(newDoc);
      await saveDocument(newDoc);

      if (result.warnings.length > 0) {
        const msg = result.warnings.slice(0, 3).join(', ');
        const more = result.warnings.length - 3;
        toast.warning(`Imported with ${result.warnings.length} warnings: ${msg}${more > 0 ? ` and ${more} more...` : ''}`);
      } else {
        toast.success(`Imported: ${title}`);
      }

      navigate(`/doc/${doc.metadata.id}`);
    } catch (error) {
      console.error('Failed to import file:', error);
      toast.error('Failed to import file');
    } finally {
      setImporting(false);
    }
  }, [createDocument, setActiveDocId, loadDocument, clearBoards, saveDocument, navigate]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
    e.target.value = '';
  }, [handleImportFile]);

  // Flatten tree for recent docs display
  const allDocs = flattenTree(tree);
  const recentDocs = allDocs
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 12);

  return (
    <div className="workspace-page">
      <div className="workspace-hero">
        <h1 className="workspace-hero-title">Welcome to DarDocs</h1>
        <p className="workspace-hero-subtitle">
          Create a new document or pick up where you left off.
        </p>
        <button className="workspace-create-btn" onClick={handleCreate}>
          <HugeiconsIcon icon={PlusSignIcon} size={20} />
          New document
        </button>
      </div>

      <div className="workspace-templates">
        <h2 className="workspace-section-title">
          <HugeiconsIcon icon={Rocket01Icon} size={16} />
          Templates
        </h2>
        <div className="workspace-grid">
          <button
            className="workspace-card workspace-card-template"
            onClick={() => navigate('/templates/god-mode')}
          >
            <span className="workspace-card-icon">🔮</span>
            <span className="workspace-card-title">God Mode</span>
            <span className="workspace-card-desc">
              Auto-generate system docs from your repos
            </span>
          </button>
        </div>
      </div>

      <div className="workspace-templates">
        <h2 className="workspace-section-title">
          <HugeiconsIcon icon={Upload01Icon} size={16} />
          Import
        </h2>
        <input ref={mdInputRef} type="file" accept={ACCEPTED_FILE_TYPES.markdown} onChange={handleFileChange} className="hidden" />
        <input ref={docxInputRef} type="file" accept={ACCEPTED_FILE_TYPES.docx} onChange={handleFileChange} className="hidden" />
        <div className="workspace-grid">
          <button
            className="workspace-card workspace-card-template"
            onClick={() => mdInputRef.current?.click()}
            disabled={importing}
          >
            <span className="workspace-card-icon">
              <HugeiconsIcon icon={Upload01Icon} size={20} color="var(--color-accent)" />
            </span>
            <span className="workspace-card-title">Markdown</span>
            <span className="workspace-card-desc">
              Import .md files into DarDocs
            </span>
          </button>
          <button
            className="workspace-card workspace-card-template"
            onClick={() => docxInputRef.current?.click()}
            disabled={importing}
          >
            <span className="workspace-card-icon">
              <HugeiconsIcon icon={Upload01Icon} size={20} color="var(--color-accent)" />
            </span>
            <span className="workspace-card-title">Word (.docx)</span>
            <span className="workspace-card-desc">
              Import Word documents into DarDocs
            </span>
          </button>
        </div>
      </div>

      {recentDocs.length > 0 && (
        <div className="workspace-recent">
          <h2 className="workspace-section-title">
            <HugeiconsIcon icon={Clock01Icon} size={16} />
            Recent documents
          </h2>
          <div className="workspace-grid">
            {recentDocs.map((doc) => (
              <button
                key={doc.id}
                className="workspace-card"
                onClick={() => {
                  setActiveDocId(doc.id);
                  navigate(`/doc/${doc.id}`);
                }}
              >
                {doc.icon ? (
                  <span className="workspace-card-icon">{doc.icon}</span>
                ) : (
                  <HugeiconsIcon icon={File01Icon} size={20} color="var(--color-accent)" />
                )}
                <span className="workspace-card-title">
                  {doc.title || 'Untitled'}
                </span>
                <span className="workspace-card-date">
                  {formatRelative(doc.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FlatDoc {
  id: string;
  title: string;
  icon?: string;
  updatedAt: string;
}

function flattenTree(nodes: { id: string; title: string; icon?: string; updatedAt: string; children: any[] }[]): FlatDoc[] {
  const result: FlatDoc[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, title: node.title, icon: node.icon, updatedAt: node.updatedAt });
    result.push(...flattenTree(node.children));
  }
  return result;
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
