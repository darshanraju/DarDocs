import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useDocumentStore } from '../stores/documentStore';
import { useBoardStore } from '../stores/boardStore';
import { deserializeDocument, readFileAsText } from '../lib/serialization';
import { ACCEPTED_FILE_TYPES } from '../lib/constants';

export function useFileSystem() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { loadDocument, hasUnsavedChanges } = useDocumentStore();
  const { loadBoards, clearBoards } = useBoardStore();

  const openFilePicker = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ACCEPTED_FILE_TYPES.dardocs;
      fileInputRef.current = input;
    }

    fileInputRef.current.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (hasUnsavedChanges) {
        const confirmed = confirm('You have unsaved changes. Open another document?');
        if (!confirmed) return;
      }

      try {
        const text = await readFileAsText(file);
        const doc = deserializeDocument(text);

        clearBoards();
        loadDocument(doc);
        if (doc.boards) {
          loadBoards(doc.boards);
        }

        toast.success(`Opened: ${doc.metadata.title}`);
      } catch (error) {
        console.error('Failed to open document:', error);
        toast.error('Failed to open document');
      }
    };

    fileInputRef.current.click();
  }, [hasUnsavedChanges, loadDocument, loadBoards, clearBoards]);

  return {
    openFilePicker,
  };
}
