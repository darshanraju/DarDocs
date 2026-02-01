import { create } from 'zustand';
import type { JSONContent } from '@tiptap/react';
import type { DarDocsDocument, DocumentMetadata, Comment } from '@dardocs/core';
import { createNewDocument } from '@dardocs/core';

interface DocumentStore {
  // Current document state
  document: DarDocsDocument | null;
  hasUnsavedChanges: boolean;

  // Document operations
  createDocument: (title?: string) => void;
  loadDocument: (doc: DarDocsDocument) => void;
  updateContent: (content: JSONContent) => void;
  updateMetadata: (metadata: Partial<DocumentMetadata>) => void;
  markSaved: () => void;

  // Comment operations
  addComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  deleteComment: (commentId: string) => void;

  // Getters
  getDocument: () => DarDocsDocument | null;
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

  loadDocument: (doc: DarDocsDocument) => {
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

  addComment: (comment) => {
    const current = get().document;
    if (!current) return;

    const newComment: Comment = {
      ...comment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    set({
      document: {
        ...current,
        comments: [...(current.comments || []), newComment],
        metadata: {
          ...current.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      hasUnsavedChanges: true,
    });
  },

  deleteComment: (commentId) => {
    const current = get().document;
    if (!current) return;

    set({
      document: {
        ...current,
        comments: (current.comments || []).filter((c) => c.id !== commentId),
        metadata: {
          ...current.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      hasUnsavedChanges: true,
    });
  },

  getDocument: () => get().document,
}));
