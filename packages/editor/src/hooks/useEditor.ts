import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useDocumentStore } from '../stores/documentStore';
import { useBoardStore } from '../stores/boardStore';

export function useEditorActions(editor: Editor | null) {
  const { updateContent } = useDocumentStore();
  const { createBoard } = useBoardStore();

  const insertTable = useCallback(
    (rows: number = 3, cols: number = 3) => {
      if (!editor) return;
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    },
    [editor]
  );

  const insertBoard = useCallback(() => {
    if (!editor) return;
    const boardId = crypto.randomUUID();
    createBoard(boardId);
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'boardBlock',
        attrs: {
          boardId,
          width: 100,
          height: 400,
        },
      })
      .run();
  }, [editor, createBoard]);

  const saveContent = useCallback(() => {
    if (!editor) return;
    updateContent(editor.getJSON());
  }, [editor, updateContent]);

  return {
    insertTable,
    insertBoard,
    saveContent,
  };
}
