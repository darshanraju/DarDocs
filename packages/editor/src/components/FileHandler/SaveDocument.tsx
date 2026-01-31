import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Tooltip } from '../UI';
import { useDocument } from '../../hooks/useDocument';

export function SaveDocument() {
  const { document, hasUnsavedChanges, saveDocument } = useDocument();

  const handleSave = async () => {
    if (!document) {
      toast.error('No document to save');
      return;
    }

    const success = await saveDocument();
    if (success) {
      toast.success('Document saved');
    } else {
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
