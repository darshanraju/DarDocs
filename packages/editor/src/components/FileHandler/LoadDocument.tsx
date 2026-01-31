import React, { useRef } from 'react';
import { FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Tooltip } from '../UI';
import { useDocument } from '../../hooks/useDocument';
import { deserializeDocument, readFileAsText } from '@dardocs/core';
import { ACCEPTED_FILE_TYPES } from '@dardocs/core';

export function LoadDocument() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openDocument } = useDocument();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const doc = deserializeDocument(text);

      const opened = openDocument(doc);
      if (opened) {
        toast.success(`Opened: ${doc.metadata.title}`);
      }
    } catch (error) {
      console.error('Failed to open document:', error);
      toast.error('Failed to open document. Invalid file format.');
    } finally {
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
