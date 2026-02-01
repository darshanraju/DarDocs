import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MinusSignIcon, Delete01Icon, ArrowUp01Icon, ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, ToggleOffIcon } from '@hugeicons/core-free-icons';
import { Button, Tooltip } from '../../UI';

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
          <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
        </Button>
      </Tooltip>
      <Tooltip content="Add row below">
        <Button variant="ghost" size="sm" onClick={addRowAfter}>
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
        </Button>
      </Tooltip>
      <Tooltip content="Add column left">
        <Button variant="ghost" size="sm" onClick={addColumnBefore}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        </Button>
      </Tooltip>
      <Tooltip content="Add column right">
        <Button variant="ghost" size="sm" onClick={addColumnAfter}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </Button>
      </Tooltip>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Tooltip content="Delete row">
        <Button variant="ghost" size="sm" onClick={deleteRow}>
          <span className="text-red-500"><HugeiconsIcon icon={MinusSignIcon} size={16} /></span>
        </Button>
      </Tooltip>
      <Tooltip content="Delete column">
        <Button variant="ghost" size="sm" onClick={deleteColumn}>
          <span className="text-red-500 rotate-90"><HugeiconsIcon icon={MinusSignIcon} size={16} /></span>
        </Button>
      </Tooltip>
      <Tooltip content="Toggle header row">
        <Button variant="ghost" size="sm" onClick={toggleHeaderRow}>
          <HugeiconsIcon icon={ToggleOffIcon} size={16} />
        </Button>
      </Tooltip>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Tooltip content="Delete table">
        <Button variant="ghost" size="sm" onClick={deleteTable}>
          <span className="text-red-500"><HugeiconsIcon icon={Delete01Icon} size={16} /></span>
        </Button>
      </Tooltip>
    </div>
  );
}
