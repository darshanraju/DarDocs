import { useCallback } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useBoardStore } from '../stores/boardStore';
import { useCommentStore } from '../stores/commentStore';
import { LocalFilePersistence } from '@dardocs/core';
import type { DocumentPersistence } from '@dardocs/core';
import type { DarDocsDocument } from '@dardocs/core';

const defaultPersistence = new LocalFilePersistence();

export function useDocument(persistence: DocumentPersistence = defaultPersistence) {
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
  const { loadComments, getComments, clearComments } = useCommentStore();

  const newDocument = useCallback(
    (title?: string) => {
      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Create a new document anyway?');
        if (!confirmed) return false;
      }

      clearBoards();
      clearComments();
      createDocument(title);
      return true;
    },
    [hasUnsavedChanges, createDocument, clearBoards, clearComments]
  );

  const openDocument = useCallback(
    (doc: DarDocsDocument) => {
      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Open another document anyway?');
        if (!confirmed) return false;
      }

      clearBoards();
      clearComments();
      loadDocument(doc);
      if (doc.boards) {
        loadBoards(doc.boards);
      }
      if (doc.comments) {
        loadComments(doc.comments);
      }
      return true;
    },
    [hasUnsavedChanges, loadDocument, loadBoards, clearBoards, loadComments, clearComments]
  );

  const saveDocument = useCallback(async () => {
    if (!document) return false;

    try {
      const fullDocument: DarDocsDocument = {
        ...document,
        boards: getAllBoards(),
        comments: getComments(),
        metadata: {
          ...document.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      await persistence.save(fullDocument);
      markSaved();
      return true;
    } catch (error) {
      console.error('Failed to save document:', error);
      return false;
    }
  }, [document, getAllBoards, getComments, markSaved, persistence]);

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
    persistence,
  };
}
