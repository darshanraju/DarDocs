import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ToggleLeft,
} from 'lucide-react';
import { Button, Tooltip } from '../../ui';

interface TableControlsProps {
  editor: Editor;
  position: { top: number; left: number };
}

export function TableControls({ editor, position }: TableControlsProps) {
  const addRowBefore = useCallback(() => {
    editor.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowAfter = useCallback(() => {
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const addColumnBefore = useCallback(() => {
    editor.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    if (confirm('Delete this table?')) {
      editor.chain().focus().deleteTable().run();
    }
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    editor.chain().focus().toggleHeaderRow().run();
  }, [editor]);

  return (
    <div
      className="table-controls"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
      }}
    >
      <Tooltip content="Add row above">
        <Button variant="ghost" size="sm" onClick={addRowBefore}>
          <ArrowUp className="w-4 h-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Add row below">
        <Button variant="ghost" size="sm" onClick={addRowAfter}>
          <ArrowDown className="w-4 h-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Add column left">
        <Button variant="ghost" size="sm" onClick={addColumnBefore}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Add column right">
        <Button variant="ghost" size="sm" onClick={addColumnAfter}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Tooltip>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Tooltip content="Delete row">
        <Button variant="ghost" size="sm" onClick={deleteRow}>
          <Minus className="w-4 h-4 text-red-500" />
        </Button>
      </Tooltip>
      <Tooltip content="Delete column">
        <Button variant="ghost" size="sm" onClick={deleteColumn}>
          <Minus className="w-4 h-4 text-red-500 rotate-90" />
        </Button>
      </Tooltip>
      <Tooltip content="Toggle header row">
        <Button variant="ghost" size="sm" onClick={toggleHeaderRow}>
          <ToggleLeft className="w-4 h-4" />
        </Button>
      </Tooltip>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Tooltip content="Delete table">
        <Button variant="ghost" size="sm" onClick={deleteTable}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </Tooltip>
    </div>
  );
}
