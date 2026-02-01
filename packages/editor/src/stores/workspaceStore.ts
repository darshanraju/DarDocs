import { create } from 'zustand';
import type { DocTreeNode, DarDocsDocument } from '@dardocs/core';
import { IndexedDBPersistence } from '@dardocs/core';

const persistence = new IndexedDBPersistence();

export interface TreeNode extends DocTreeNode {
  children: TreeNode[];
  isExpanded: boolean;
}

interface WorkspaceStore {
  tree: TreeNode[];
  loading: boolean;
  activeDocId: string | null;

  // Init
  loadTree: () => Promise<void>;

  // Document CRUD
  createDocument: (title: string, parentId: string | null) => Promise<DarDocsDocument>;
  deleteDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, title: string) => Promise<void>;

  // Tree operations
  toggleExpanded: (id: string) => void;
  moveDocument: (id: string, newParentId: string | null, newPosition: number) => Promise<void>;
  updateDocumentIcon: (id: string, icon: string | undefined) => Promise<void>;

  // Active document
  setActiveDocId: (id: string | null) => void;

  // Save document content
  saveDocument: (doc: DarDocsDocument) => Promise<void>;
  loadDocument: (id: string) => Promise<DarDocsDocument>;
}

function buildTree(nodes: DocTreeNode[], expandedIds: Set<string>): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create TreeNode wrappers
  for (const node of nodes) {
    map.set(node.id, {
      ...node,
      children: [],
      isExpanded: expandedIds.has(node.id),
    });
  }

  // Build parent-child relationships
  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parentId === null || node.parentId === '__root__') {
      roots.push(treeNode);
    } else {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      } else {
        // Orphan — treat as root
        roots.push(treeNode);
      }
    }
  }

  // Sort children by position
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

function collectExpandedIds(tree: TreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.isExpanded) ids.add(node.id);
      walk(node.children);
    }
  };
  walk(tree);
  return ids;
}

function toggleInTree(tree: TreeNode[], id: string): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, isExpanded: !node.isExpanded };
    }
    if (node.children.length > 0) {
      return { ...node, children: toggleInTree(node.children, id) };
    }
    return node;
  });
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  tree: [],
  loading: true,
  activeDocId: null,

  loadTree: async () => {
    set({ loading: true });
    const flatNodes = await persistence.getTree();
    const expandedIds = collectExpandedIds(get().tree);
    const tree = buildTree(flatNodes, expandedIds);
    set({ tree, loading: false });
  },

  createDocument: async (title, parentId) => {
    const doc = await persistence.createDocument(title, parentId);
    // If creating under a parent, auto-expand it
    if (parentId) {
      const current = get().tree;
      const expanded = collectExpandedIds(current);
      expanded.add(parentId);
      const flatNodes = await persistence.getTree();
      set({ tree: buildTree(flatNodes, expanded) });
    } else {
      await get().loadTree();
    }
    return doc;
  },

  deleteDocument: async (id) => {
    await persistence.delete(id);
    const state = get();
    if (state.activeDocId === id) {
      set({ activeDocId: null });
    }
    await get().loadTree();
  },

  renameDocument: async (id, title) => {
    await persistence.updateTreeNodeTitle(id, title);
    // Also update the document metadata
    try {
      const doc = await persistence.load(id);
      doc.metadata.title = title;
      doc.metadata.updatedAt = new Date().toISOString();
      await persistence.save(doc);
    } catch {
      // Document might not be saved yet
    }
    await get().loadTree();
  },

  toggleExpanded: (id) => {
    set((state) => ({
      tree: toggleInTree(state.tree, id),
    }));
  },

  moveDocument: async (id, newParentId, newPosition) => {
    await persistence.moveNode(id, newParentId, newPosition);
    await get().loadTree();
  },

  updateDocumentIcon: async (id, icon) => {
    await persistence.updateTreeNodeIcon(id, icon);
    // Also update the document metadata
    try {
      const doc = await persistence.load(id);
      doc.metadata.icon = icon;
      doc.metadata.updatedAt = new Date().toISOString();
      await persistence.save(doc);
    } catch {
      // Document might not be saved yet
    }
    await get().loadTree();
  },

  setActiveDocId: (id) => {
    set({ activeDocId: id });
  },

  saveDocument: async (doc) => {
    await persistence.save(doc);
    // Sync tree title if changed
    const node = get().tree;
    const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
      for (const n of nodes) {
        if (n.id === doc.metadata.id) return n;
        const found = findNode(n.children);
        if (found) return found;
      }
      return undefined;
    };
    const existing = findNode(node);
    if (existing && (existing.title !== doc.metadata.title || existing.icon !== doc.metadata.icon)) {
      await persistence.updateTreeNodeTitle(
        doc.metadata.id,
        doc.metadata.title
      );
      if (existing.icon !== doc.metadata.icon) {
        await persistence.updateTreeNodeIcon(
          doc.metadata.id,
          doc.metadata.icon
        );
      }
      await get().loadTree();
    }
  },

  loadDocument: async (id) => {
    return persistence.load(id);
  },
}));
