import React, { useRef } from 'react';
import { FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Tooltip } from '../UI';
import { useDocumentStore } from '../../stores/documentStore';
import { useBoardStore } from '../../stores/boardStore';
import { deserializeDocument, readFileAsText } from '../../lib/serialization';
import { ACCEPTED_FILE_TYPES } from '../../lib/constants';

export function LoadDocument() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadDocument, hasUnsavedChanges } = useDocumentStore();
  const { loadBoards, clearBoards } = useBoardStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const doc = deserializeDocument(text);

      // Confirm if there are unsaved changes
      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Are you sure you want to open another document?');
        if (!confirmed) return;
      }

      // Load document
      loadDocument(doc);

      // Load boards
      clearBoards();
      if (doc.boards) {
        loadBoards(doc.boards);
      }

      toast.success(`Opened: ${doc.metadata.title}`);
    } catch (error) {
      console.error('Failed to open document:', error);
      toast.error('Failed to open document. Invalid file format.');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.dardocs}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Tooltip content="Open document (Ctrl+O)">
        <Button variant="secondary" size="sm" onClick={handleClick}>
          <FolderOpen className="w-4 h-4 mr-1.5" />
          Open
        </Button>
      </Tooltip>
    </>
  );
}
