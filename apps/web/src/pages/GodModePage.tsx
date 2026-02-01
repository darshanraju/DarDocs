import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { JSONContent } from '@tiptap/react';
import {
  GodModeTemplate,
  useWorkspaceStore,
  useDocumentStore,
  useGodModeStore,
} from '@dardocs/editor';

export function GodModePage() {
  const navigate = useNavigate();
  const { createDocument, setActiveDocId, saveDocument } = useWorkspaceStore();
  const { loadDocument, updateContent, updateMetadata } = useDocumentStore();

  const handleComplete = useCallback(
    async (content: JSONContent, title: string) => {
      // Create a new document via the workspace API
      const doc = await createDocument(title, null);
      setActiveDocId(doc.metadata.id);

      // Load the document into the document store and set the generated content
      loadDocument(doc);
      updateMetadata({ title, icon: '🔮' });
      updateContent(content);

      // Save the document with the generated content
      const updatedDoc = useDocumentStore.getState().document;
      if (updatedDoc) {
        await saveDocument(updatedDoc);
      }

      // Reset God Mode state
      useGodModeStore.getState().reset();

      // Navigate to the new document
      navigate(`/doc/${doc.metadata.id}`);
    },
    [createDocument, setActiveDocId, loadDocument, updateContent, updateMetadata, saveDocument, navigate]
  );

  const handleCancel = useCallback(() => {
    useGodModeStore.getState().reset();
    navigate('/');
  }, [navigate]);

  return (
    <GodModeTemplate onCreateDocument={handleComplete} onCancel={handleCancel} />
  );
}
