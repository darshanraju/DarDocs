import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { JSONContent } from '@tiptap/react';
import {
  TechDocsTemplate,
  useWorkspaceStore,
  useDocumentStore,
  useTechDocsStore,
} from '@dardocs/editor';

export function TechDocsPage() {
  const navigate = useNavigate();
  const { createDocument, setActiveDocId, saveDocument } = useWorkspaceStore();
  const { loadDocument, updateContent, updateMetadata } = useDocumentStore();

  const handleComplete = useCallback(
    async (content: JSONContent, title: string) => {
      const doc = await createDocument(title, null);
      setActiveDocId(doc.metadata.id);

      loadDocument(doc);
      updateMetadata({ title, icon: '📐' });
      updateContent(content);

      const updatedDoc = useDocumentStore.getState().document;
      if (updatedDoc) {
        await saveDocument(updatedDoc);
      }

      useTechDocsStore.getState().reset();
      navigate(`/doc/${doc.metadata.id}`);
    },
    [createDocument, setActiveDocId, loadDocument, updateContent, updateMetadata, saveDocument, navigate],
  );

  const handleCancel = useCallback(() => {
    useTechDocsStore.getState().reset();
    navigate('/');
  }, [navigate]);

  return (
    <TechDocsTemplate onCreateDocument={handleComplete} onCancel={handleCancel} />
  );
}
