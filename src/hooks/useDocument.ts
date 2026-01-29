import { useCallback } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useBoardStore } from '../stores/boardStore';
import { downloadDocument } from '../lib/serialization';
import type { OpenDocsDocument } from '../lib/documentSchema';

export function useDocument() {
  const {
    document,
    hasUnsavedChanges,
    createDocument,
    loadDocument,
    updateContent,
    updateMetadata,
    markSaved,
  } = useDocumentStore();

  const { getAllBoards, loadBoards, clearBoards } = useBoardStore();

  const newDocument = useCallback(
    (title?: string) => {
      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Create a new document anyway?');
        if (!confirmed) return false;
      }

      clearBoards();
      createDocument(title);
      return true;
    },
    [hasUnsavedChanges, createDocument, clearBoards]
  );

  const openDocument = useCallback(
    (doc: OpenDocsDocument) => {
      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Open another document anyway?');
        if (!confirmed) return false;
      }

      clearBoards();
      loadDocument(doc);
      if (doc.boards) {
        loadBoards(doc.boards);
      }
      return true;
    },
    [hasUnsavedChanges, loadDocument, loadBoards, clearBoards]
  );

  const saveDocument = useCallback(() => {
    if (!document) return false;

    try {
      const fullDocument: OpenDocsDocument = {
        ...document,
        boards: getAllBoards(),
        metadata: {
          ...document.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      downloadDocument(fullDocument);
      markSaved();
      return true;
    } catch (error) {
      console.error('Failed to save document:', error);
      return false;
    }
  }, [document, getAllBoards, markSaved]);

  const setTitle = useCallback(
    (title: string) => {
      updateMetadata({ title });
    },
    [updateMetadata]
  );

  return {
    document,
    hasUnsavedChanges,
    newDocument,
    openDocument,
    saveDocument,
    setTitle,
    updateContent,
  };
}
