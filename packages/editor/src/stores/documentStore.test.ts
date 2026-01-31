import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './documentStore';

describe('Document Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDocumentStore.setState({
      document: null,
      hasUnsavedChanges: false,
    });
  });

  describe('createDocument', () => {
    it('should create a new document with default title', () => {
      const { createDocument, getDocument } = useDocumentStore.getState();

      createDocument();

      const doc = getDocument();
      expect(doc).not.toBeNull();
      expect(doc?.metadata.title).toBe('Untitled Document');
      expect(doc?.version).toBe('1.0');
      expect(doc?.content.type).toBe('doc');
      expect(doc?.boards).toEqual({});
    });

    it('should create a new document with custom title', () => {
      const { createDocument, getDocument } = useDocumentStore.getState();

      createDocument('My Custom Document');

      const doc = getDocument();
      expect(doc?.metadata.title).toBe('My Custom Document');
    });

    it('should reset hasUnsavedChanges to false', () => {
      const store = useDocumentStore.getState();

      // First create and modify
      store.createDocument();
      store.updateContent({ type: 'doc', content: [{ type: 'paragraph' }] });
      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(true);

      // Create new document should reset
      store.createDocument();
      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(false);
    });

    it('should generate unique document IDs', () => {
      const { createDocument, getDocument } = useDocumentStore.getState();

      createDocument();
      const firstId = getDocument()?.metadata.id;

      createDocument();
      const secondId = getDocument()?.metadata.id;

      expect(firstId).toBeDefined();
      expect(secondId).toBeDefined();
      expect(firstId).not.toBe(secondId);
    });
  });

  describe('loadDocument', () => {
    it('should load an existing document', () => {
      const { loadDocument, getDocument } = useDocumentStore.getState();

      const mockDoc = {
        version: '1.0' as const,
        metadata: {
          id: 'test-id-123',
          title: 'Loaded Document',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
        },
        boards: {},
        comments: [],
      };

      loadDocument(mockDoc);

      const doc = getDocument();
      expect(doc).toEqual(mockDoc);
      expect(doc?.metadata.id).toBe('test-id-123');
    });

    it('should reset hasUnsavedChanges when loading', () => {
      const store = useDocumentStore.getState();

      store.createDocument();
      store.updateContent({ type: 'doc', content: [] });
      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(true);

      store.loadDocument({
        version: '1.0',
        metadata: {
          id: 'test',
          title: 'Test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        content: { type: 'doc', content: [] },
        boards: {},
        comments: [],
      });

      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  describe('updateContent', () => {
    it('should update document content', () => {
      const store = useDocumentStore.getState();
      store.createDocument();

      const newContent = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        ],
      };

      store.updateContent(newContent);

      const doc = useDocumentStore.getState().getDocument();
      expect(doc?.content).toEqual(newContent);
    });

    it('should set hasUnsavedChanges to true', () => {
      const store = useDocumentStore.getState();
      store.createDocument();

      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(false);

      store.updateContent({ type: 'doc', content: [] });

      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(true);
    });

    it('should update the updatedAt timestamp', () => {
      const store = useDocumentStore.getState();
      store.createDocument();

      const originalUpdatedAt = useDocumentStore.getState().getDocument()?.metadata.updatedAt;

      // Small delay to ensure different timestamp
      const now = new Date();
      store.updateContent({ type: 'doc', content: [] });

      const newUpdatedAt = useDocumentStore.getState().getDocument()?.metadata.updatedAt;
      expect(newUpdatedAt).toBeDefined();
      expect(new Date(newUpdatedAt!).getTime()).toBeGreaterThanOrEqual(new Date(originalUpdatedAt!).getTime());
    });

    it('should not update if no document exists', () => {
      const store = useDocumentStore.getState();

      // Don't create document first
      store.updateContent({ type: 'doc', content: [] });

      expect(useDocumentStore.getState().getDocument()).toBeNull();
    });
  });

  describe('updateMetadata', () => {
    it('should update document title', () => {
      const store = useDocumentStore.getState();
      store.createDocument();

      store.updateMetadata({ title: 'New Title' });

      expect(useDocumentStore.getState().getDocument()?.metadata.title).toBe('New Title');
    });

    it('should preserve other metadata fields', () => {
      const store = useDocumentStore.getState();
      store.createDocument();

      const originalId = useDocumentStore.getState().getDocument()?.metadata.id;
      const originalCreatedAt = useDocumentStore.getState().getDocument()?.metadata.createdAt;

      store.updateMetadata({ title: 'Updated Title' });

      const doc = useDocumentStore.getState().getDocument();
      expect(doc?.metadata.id).toBe(originalId);
      expect(doc?.metadata.createdAt).toBe(originalCreatedAt);
    });

    it('should set hasUnsavedChanges to true', () => {
      const store = useDocumentStore.getState();
      store.createDocument();

      store.updateMetadata({ title: 'Changed' });

      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(true);
    });
  });

  describe('markSaved', () => {
    it('should set hasUnsavedChanges to false', () => {
      const store = useDocumentStore.getState();
      store.createDocument();
      store.updateContent({ type: 'doc', content: [] });

      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(true);

      store.markSaved();

      expect(useDocumentStore.getState().hasUnsavedChanges).toBe(false);
    });
  });
});
