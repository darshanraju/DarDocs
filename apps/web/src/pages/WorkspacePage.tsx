import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, FileText, Clock } from 'lucide-react';
import { useWorkspaceStore } from '@dardocs/editor';

export function WorkspacePage() {
  const { tree, createDocument, setActiveDocId } = useWorkspaceStore();
  const navigate = useNavigate();

  const handleCreate = useCallback(async () => {
    const doc = await createDocument('Untitled', null);
    setActiveDocId(doc.metadata.id);
    navigate(`/doc/${doc.metadata.id}`);
  }, [createDocument, setActiveDocId, navigate]);

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
          <Plus className="w-5 h-5" />
          New document
        </button>
      </div>

      {recentDocs.length > 0 && (
        <div className="workspace-recent">
          <h2 className="workspace-section-title">
            <Clock className="w-4 h-4" />
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
                <FileText className="w-5 h-5 text-[var(--color-accent)]" />
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
  updatedAt: string;
}

function flattenTree(nodes: { id: string; title: string; updatedAt: string; children: any[] }[]): FlatDoc[] {
  const result: FlatDoc[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, title: node.title, updatedAt: node.updatedAt });
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
