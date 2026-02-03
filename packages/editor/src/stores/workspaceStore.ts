import { create } from 'zustand';
import type { DocTreeNode, DarDocsDocument } from '@dardocs/core';
import type { JSONContent } from '@tiptap/react';
import type { TLEditorSnapshot } from 'tldraw';
import { workspacesApi, documentsApi, teamsApi } from '../lib/api.js';
import type { DocFull, Team } from '../lib/api.js';

export interface TreeNode extends DocTreeNode {
  teamId: string | null;
  children: TreeNode[];
  isExpanded: boolean;
}

interface WorkspaceStore {
  tree: TreeNode[];
  teams: Team[];
  loading: boolean;
  activeDocId: string | null;
  workspaceId: string | null;

  // Init
  loadTree: () => Promise<void>;

  // Document CRUD
  createDocument: (title: string, parentId: string | null, teamId?: string | null) => Promise<DarDocsDocument>;
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

function buildTree(nodes: (DocTreeNode & { teamId: string | null })[], expandedIds: Set<string>): TreeNode[] {
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

function updateNodeInTree(tree: TreeNode[], id: string, updates: Partial<Pick<TreeNode, 'title' | 'icon'>>): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, ...updates };
    }
    if (node.children.length > 0) {
      return { ...node, children: updateNodeInTree(node.children, id, updates) };
    }
    return node;
  });
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

/** Convert API DocFull to the client-side DarDocsDocument format */
function toDocument(doc: DocFull): DarDocsDocument {
  return {
    version: '1.0',
    metadata: {
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    content: (doc.content as JSONContent) || {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
    boards: (doc.boards as Record<string, TLEditorSnapshot>) || {},
    comments: [],
  };
}

/** Map API tree items to tree node shape (with teamId) */
function toTreeNodes(
  items: { id: string; parentId: string; teamId?: string | null; position: number; title: string; createdAt: string; updatedAt: string }[]
): (DocTreeNode & { teamId: string | null })[] {
  return items.map((n) => ({
    id: n.id,
    parentId: n.parentId,
    teamId: n.teamId ?? null,
    position: n.position,
    title: n.title,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  tree: [],
  teams: [],
  loading: true,
  activeDocId: null,
  workspaceId: null,

  loadTree: async () => {
    set({ loading: true });
    try {
      // Ensure we have a workspace
      let wsId = get().workspaceId;
      if (!wsId) {
        const workspaces = await workspacesApi.list();
        if (workspaces.length > 0) {
          wsId = workspaces[0].id;
        } else {
          const ws = await workspacesApi.create('Personal');
          wsId = ws.id;
        }
        set({ workspaceId: wsId });
      }

      // Load documents and teams in parallel
      const [flatNodes, teamsList] = await Promise.all([
        documentsApi.tree(wsId),
        teamsApi.list(wsId),
      ]);

      const expandedIds = collectExpandedIds(get().tree);
      const tree = buildTree(toTreeNodes(flatNodes), expandedIds);
      set({ tree, teams: teamsList, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createDocument: async (title, parentId, teamId) => {
    const wsId = get().workspaceId;
    if (!wsId) throw new Error('No workspace loaded');

    const docFull = await documentsApi.create(wsId, title, parentId, teamId);
    const doc = toDocument(docFull);

    // If creating under a parent, auto-expand it
    if (parentId) {
      const current = get().tree;
      const expanded = collectExpandedIds(current);
      expanded.add(parentId);
      const flatNodes = await documentsApi.tree(wsId);
      set({ tree: buildTree(toTreeNodes(flatNodes), expanded) });
    } else {
      await get().loadTree();
    }
    return doc;
  },

  deleteDocument: async (id) => {
    // Snapshot current tree so we can roll back on failure
    const prevTree = get().tree;
    const prevActiveDocId = get().activeDocId;

    // Optimistically remove from local tree immediately
    const removeNode = (nodes: TreeNode[]): TreeNode[] =>
      nodes.filter((n) => n.id !== id).map((n) => ({
        ...n,
        children: removeNode(n.children),
      }));
    set((state) => ({
      tree: removeNode(state.tree),
      activeDocId: state.activeDocId === id ? null : state.activeDocId,
    }));

    try {
      await documentsApi.delete(id);
      await get().loadTree();
    } catch {
      // Roll back optimistic removal — the API call failed
      set({ tree: prevTree, activeDocId: prevActiveDocId });
      throw new Error('Failed to delete document');
    }
  },

  renameDocument: async (id, title) => {
    await documentsApi.update(id, { title });
    await get().loadTree();
  },

  toggleExpanded: (id) => {
    set((state) => ({
      tree: toggleInTree(state.tree, id),
    }));
  },

  moveDocument: async (id, newParentId, newPosition) => {
    await documentsApi.update(id, {
      parentId: newParentId,
      position: newPosition,
    });
    await get().loadTree();
  },

  updateDocumentIcon: async (id, icon) => {
    // Update the tree node locally; the icon is persisted as part of
    // document metadata when the auto-save triggers saveDocument().
    set((state) => ({
      tree: updateNodeInTree(state.tree, id, { icon }),
    }));
  },

  setActiveDocId: (id) => {
    set({ activeDocId: id });
  },

  saveDocument: async (doc) => {
    await documentsApi.update(doc.metadata.id, {
      title: doc.metadata.title,
      content: doc.content,
      boards: doc.boards,
    });
    // Sync sidebar tree title/icon locally if changed
    const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
      for (const n of nodes) {
        if (n.id === doc.metadata.id) return n;
        const found = findNode(n.children);
        if (found) return found;
      }
      return undefined;
    };
    const existing = findNode(get().tree);
    if (existing && (existing.title !== doc.metadata.title || existing.icon !== doc.metadata.icon)) {
      set((state) => ({
        tree: updateNodeInTree(state.tree, doc.metadata.id, {
          title: doc.metadata.title,
          icon: doc.metadata.icon,
        }),
      }));
    }
  },

  loadDocument: async (id) => {
    const docFull = await documentsApi.get(id);
    return toDocument(docFull);
  },
}));
