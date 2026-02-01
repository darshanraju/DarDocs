import { Editor } from '@tiptap/react';

export function isInTable(editor: Editor): boolean {
  return editor.isActive('table');
}

export function getTablePosition(editor: Editor): { top: number; left: number } | null {
  if (!isInTable(editor)) return null;

  const { view } = editor;
  const { state } = view;
  const { selection } = state;

  // Find the table node
  let tablePos: number | null = null;
  state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (node.type.name === 'table') {
      tablePos = pos;
      return false;
    }
  });

  if (tablePos === null) return null;

  const coords = view.coordsAtPos(tablePos);
  return {
    top: coords.top - 40, // Position above the table
    left: coords.left,
  };
}

export function createEmptyTable(rows: number, cols: number, withHeaderRow: boolean = true) {
  const headerCells = Array(cols)
    .fill(null)
    .map(() => ({
      type: 'tableHeader',
      content: [{ type: 'paragraph' }],
    }));

  const dataCells = Array(cols)
    .fill(null)
    .map(() => ({
      type: 'tableCell',
      content: [{ type: 'paragraph' }],
    }));

  const tableRows = [];

  if (withHeaderRow) {
    tableRows.push({
      type: 'tableRow',
      content: headerCells,
    });
  }

  for (let i = withHeaderRow ? 1 : 0; i < rows; i++) {
    tableRows.push({
      type: 'tableRow',
      content: [...dataCells],
    });
  }

  return {
    type: 'table',
    content: tableRows,
  };
}
