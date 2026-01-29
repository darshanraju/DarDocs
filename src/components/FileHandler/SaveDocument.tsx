import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Tooltip } from '../UI';
import { useDocumentStore } from '../../stores/documentStore';
import { useBoardStore } from '../../stores/boardStore';
import { downloadDocument } from '../../lib/serialization';
import type { OpenDocsDocument } from '../../lib/documentSchema';

export function SaveDocument() {
  const { document, hasUnsavedChanges, markSaved } = useDocumentStore();
  const { getAllBoards } = useBoardStore();

  const handleSave = () => {
    if (!document) {
      toast.error('No document to save');
      return;
    }

    try {
      // Combine document with board states
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
      toast.success('Document saved');
    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error('Failed to save document');
    }
  };

  return (
    <Tooltip content="Save document (Ctrl+S)">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleSave}
        disabled={!document}
        className={hasUnsavedChanges ? 'border-yellow-500' : ''}
      >
        <Save className="w-4 h-4 mr-1.5" />
        Save
        {hasUnsavedChanges && <span className="ml-1 text-yellow-500">*</span>}
      </Button>
    </Tooltip>
  );
}
