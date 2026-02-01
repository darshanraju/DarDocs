import { create } from 'zustand';

// Document index entry (lightweight metadata for search/linking)
export interface DocumentIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  headings: string[];
  textPreview: string; // first ~200 chars of plain text
  textContent: string; // full plain text for search
  links: string[]; // IDs of documents this doc links to
}

interface LibraryStore {
  documents: Record<string, DocumentIndexEntry>;

  // Index operations
  indexDocument: (entry: DocumentIndexEntry) => void;
  removeDocument: (id: string) => void;
  getDocument: (id: string) => DocumentIndexEntry | undefined;
  getAllDocuments: () => DocumentIndexEntry[];

  // Link operations
  getBacklinks: (docId: string) => DocumentIndexEntry[];
  updateLinks: (docId: string, linkedDocIds: string[]) => void;

  // Search
  search: (query: string) => DocumentIndexEntry[];

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const LIBRARY_STORAGE_KEY = 'dardocs-library';

// Simple tokenizer for search
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// Compute relevance score for search
function computeRelevance(entry: DocumentIndexEntry, queryTokens: string[]): number {
  let score = 0;
  const titleLower = entry.title.toLowerCase();
  const textLower = entry.textContent.toLowerCase();
  const headingsLower = entry.headings.map((h) => h.toLowerCase());

  for (const token of queryTokens) {
    // Title match (highest weight)
    if (titleLower.includes(token)) {
      score += 10;
      if (titleLower.startsWith(token)) score += 5;
    }

    // Heading match (high weight)
    for (const heading of headingsLower) {
      if (heading.includes(token)) {
        score += 5;
        break;
      }
    }

    // Content match
    if (textLower.includes(token)) {
      score += 2;
      // Bonus for multiple occurrences (up to 5)
      const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        score += Math.min(matches.length, 5);
      }
    }
  }

  // Bonus for phrase match (all tokens appear together)
  const queryJoined = queryTokens.join(' ');
  if (titleLower.includes(queryJoined)) score += 15;
  if (textLower.includes(queryJoined)) score += 8;

  // Recency bonus (newer docs slightly preferred)
  const daysSinceUpdate = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 7) score += 2;
  else if (daysSinceUpdate < 30) score += 1;

  return score;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  documents: {},

  indexDocument: (entry: DocumentIndexEntry) => {
    set((state) => ({
      documents: { ...state.documents, [entry.id]: entry },
    }));
    // Auto-save to localStorage
    setTimeout(() => get().saveToStorage(), 0);
  },

  removeDocument: (id: string) => {
    set((state) => {
      const { [id]: _, ...rest } = state.documents;
      return { documents: rest };
    });
    setTimeout(() => get().saveToStorage(), 0);
  },

  getDocument: (id: string) => get().documents[id],

  getAllDocuments: () => Object.values(get().documents),

  getBacklinks: (docId: string) => {
    const allDocs = Object.values(get().documents);
    return allDocs.filter((doc) => doc.links.includes(docId));
  },

  updateLinks: (docId: string, linkedDocIds: string[]) => {
    const doc = get().documents[docId];
    if (!doc) return;
    set((state) => ({
      documents: {
        ...state.documents,
        [docId]: { ...doc, links: linkedDocIds },
      },
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },

  search: (query: string) => {
    if (!query.trim()) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const allDocs = Object.values(get().documents);
    const scored = allDocs
      .map((doc) => ({
        doc,
        score: computeRelevance(doc, queryTokens),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((item) => item.doc);
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ documents: parsed });
      }
    } catch (e) {
      console.warn('Failed to load library from storage:', e);
    }
  },

  saveToStorage: () => {
    try {
      const docs = get().documents;
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('Failed to save library to storage:', e);
    }
  },
}));

// Extract plain text from Tiptap JSON content
export function extractTextFromContent(content: Record<string, unknown>): string {
  let text = '';

  function walk(node: Record<string, unknown>) {
    if (node.text && typeof node.text === 'string') {
      text += node.text + ' ';
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content);
  return text.trim();
}

// Extract headings from Tiptap JSON content
export function extractHeadingsFromContent(content: Record<string, unknown>): string[] {
  const headings: string[] = [];

  function walk(node: Record<string, unknown>) {
    if (node.type === 'heading' && Array.isArray(node.content)) {
      const headingText = node.content
        .map((c: Record<string, unknown>) => (c.text as string) || '')
        .join('');
      if (headingText) headings.push(headingText);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content);
  return headings;
}
