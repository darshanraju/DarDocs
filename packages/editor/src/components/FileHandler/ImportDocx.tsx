import React, { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Tooltip } from '../UI';
import { useDocumentStore } from '../../stores/documentStore';
import { useBoardStore } from '../../stores/boardStore';
import { convertDocxToTipTap } from '@dardocs/core';
import { createNewDocument } from '@dardocs/core';
import { ACCEPTED_FILE_TYPES } from '@dardocs/core';

export function ImportDocx() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { loadDocument, hasUnsavedChanges } = useDocumentStore();
  const { clearBoards } = useBoardStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Confirm if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to import a document?');
      if (!confirmed) {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }

    setIsLoading(true);

    try {
      const result = await convertDocxToTipTap(file);

      // Create new document with converted content
      const title = file.name.replace(/\.docx$/i, '');
      const doc = createNewDocument(title);
      doc.content = result.content;

      // Load document
      clearBoards();
      loadDocument(doc);

      // Show warnings if any
      if (result.warnings.length > 0) {
        const warningMessage = result.warnings.slice(0, 3).join(', ');
        const moreCount = result.warnings.length - 3;
        toast.warning(
          `Imported with ${result.warnings.length} warnings: ${warningMessage}${moreCount > 0 ? ` and ${moreCount} more...` : ''}`
        );
        console.warn('DOCX Import warnings:', result.warnings);
      } else {
        toast.success(`Imported: ${title}`);
      }
    } catch (error) {
      console.error('Failed to import DOCX:', error);
      toast.error('Failed to import DOCX file');
    } finally {
      setIsLoading(false);
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
        accept={ACCEPTED_FILE_TYPES.docx}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Tooltip content="Import DOCX file">
        <Button variant="secondary" size="sm" onClick={handleClick} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <FileUp className="w-4 h-4 mr-1.5" />
          )}
          Import
        </Button>
      </Tooltip>
    </>
  );
}
