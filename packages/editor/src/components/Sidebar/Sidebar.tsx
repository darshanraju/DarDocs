import { useState, useEffect, useCallback, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  File01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
  Delete01Icon,
  PencilEdit01Icon,
  FileAddIcon,
  ArrowLeft01Icon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { TreeNode } from '../../stores/workspaceStore';
import { DarkModeToggle } from '../TableOfContents/DarkModeToggle';
import { useNavigate, useParams } from 'react-router';

export function Sidebar() {
  const {
    tree,
    loading,
    activeDocId,
    loadTree,
    createDocument,
    deleteDocument,
    renameDocument,
    toggleExpanded,
    setActiveDocId,
  } = useWorkspaceStore();

  const navigate = useNavigate();
  const params = useParams<{ docId: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Sync activeDocId with route
  useEffect(() => {
    if (params.docId && params.docId !== activeDocId) {
      setActiveDocId(params.docId);
    }
  }, [params.docId, activeDocId, setActiveDocId]);

  const handleCreateDocument = useCallback(
    async (parentId: string | null = null) => {
      const doc = await createDocument('Untitled', parentId);
      setActiveDocId(doc.metadata.id);
      navigate(`/doc/${doc.metadata.id}`);
      // Start renaming immediately
      setRenamingId(doc.metadata.id);
      setRenameValue('Untitled');
    },
    [createDocument, setActiveDocId, navigate]
  );

  const handleDocClick = useCallback(
    (id: string) => {
      setActiveDocId(id);
      navigate(`/doc/${id}`);
      setContextMenu(null);
    },
    [setActiveDocId, navigate]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ id, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setContextMenu(null);
      await deleteDocument(id);
      if (activeDocId === id) {
        navigate('/');
      }
    },
    [deleteDocument, activeDocId, navigate]
  );

  const handleStartRename = useCallback(
    (id: string, currentTitle: string) => {
      setContextMenu(null);
      setRenamingId(id);
      setRenameValue(currentTitle);
    },
    []
  );

  const handleRenameSubmit = useCallback(
    async (id: string) => {
      if (renameValue.trim()) {
        await renameDocument(id, renameValue.trim());
      }
      setRenamingId(null);
    },
    [renameValue, renameDocument]
  );

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isActive = node.id === activeDocId;
    const hasChildren = node.children.length > 0;
    const isRenaming = renamingId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleDocClick(node.id)}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
        >
          <button
            className="sidebar-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
          >
            {hasChildren ? (
              node.isExpanded ? (
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              ) : (
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              )
            ) : (
              <span className="w-3.5 h-3.5" />
            )}
          </button>

          {node.icon ? (
            <span className="sidebar-item-icon">{node.icon}</span>
          ) : (
            <HugeiconsIcon icon={File01Icon} size={16} className="flex-shrink-0 text-[var(--color-text-muted)]" />
          )}

          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="sidebar-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameSubmit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(node.id);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="sidebar-item-title">{node.title || 'Untitled'}</span>
          )}

          <button
            className="sidebar-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, node.id);
            }}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
          </button>
        </div>

        {hasChildren && node.isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button
          onClick={() => setIsCollapsed(false)}
          className="toc-toggle-btn"
          title="Show sidebar"
        >
          <HugeiconsIcon icon={SidebarLeft01Icon} size={20} />
        </button>
        <DarkModeToggle />
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">DarDocs</span>
        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <button
            onClick={() => setIsCollapsed(true)}
            className="toc-collapse-btn"
            title="Collapse sidebar"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          </button>
        </div>
      </div>

      <div className="sidebar-actions">
        <button
          className="sidebar-new-btn"
          onClick={() => handleCreateDocument(null)}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          <span>New page</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {loading ? (
          <div className="sidebar-empty">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="sidebar-empty">
            No documents yet. Create one to get started.
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </nav>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="sidebar-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const node = findNodeById(tree, contextMenu.id);
              if (node) handleStartRename(node.id, node.title);
            }}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
            Rename
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              handleCreateDocument(contextMenu.id);
            }}
          >
            <HugeiconsIcon icon={FileAddIcon} size={14} />
            Add sub-page
          </button>
          <button
            className="sidebar-context-delete"
            onClick={() => handleDelete(contextMenu.id)}
          >
            <HugeiconsIcon icon={Delete01Icon} size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return undefined;
}
