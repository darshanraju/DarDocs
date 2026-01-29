import { create } from 'zustand';
import type { JSONContent } from '@tiptap/react';
import type { OpenDocsDocument, DocumentMetadata } from '../lib/documentSchema';
import { createNewDocument } from '../lib/documentSchema';

interface DocumentStore {
  // Current document state
  document: OpenDocsDocument | null;
  hasUnsavedChanges: boolean;

  // Document operations
  createDocument: (title?: string) => void;
  loadDocument: (doc: OpenDocsDocument) => void;
  updateContent: (content: JSONContent) => void;
  updateMetadata: (metadata: Partial<DocumentMetadata>) => void;
  markSaved: () => void;

  // Getters
  getDocument: () => OpenDocsDocument | null;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: null,
  hasUnsavedChanges: false,

  createDocument: (title?: string) => {
    const doc = createNewDocument(title);
    set({
      document: doc,
      hasUnsavedChanges: false,
    });
  },

  loadDocument: (doc: OpenDocsDocument) => {
    set({
      document: doc,
      hasUnsavedChanges: false,
    });
  },

  updateContent: (content: JSONContent) => {
    const current = get().document;
    if (!current) return;

    set({
      document: {
        ...current,
        content,
        metadata: {
          ...current.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      hasUnsavedChanges: true,
    });
  },

  updateMetadata: (metadata: Partial<DocumentMetadata>) => {
    const current = get().document;
    if (!current) return;

    set({
      document: {
        ...current,
        metadata: {
          ...current.metadata,
          ...metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      hasUnsavedChanges: true,
    });
  },

  markSaved: () => {
    set({ hasUnsavedChanges: false });
  },

  getDocument: () => get().document,
}));
