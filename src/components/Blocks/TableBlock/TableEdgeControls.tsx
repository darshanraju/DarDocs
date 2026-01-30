import { useEffect, useState, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';

interface TableEdgeControlsProps {
  editor: Editor;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface TableInfo {
  rect: DOMRect;
  colBoundaries: number[]; // x positions between columns
  rowBoundaries: number[]; // y positions between rows
}

export function TableEdgeControls({ editor, editorContainerRef }: TableEdgeControlsProps) {
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeTableInfo = useCallback((table: HTMLTableElement): TableInfo => {
    const rect = table.getBoundingClientRect();

    // Column boundaries: right edge of each cell in the first row (except last)
    const firstRow = table.querySelector('tr');
    const cells = firstRow?.querySelectorAll('th, td');
    const colBoundaries: number[] = [];
    if (cells) {
      for (let i = 0; i < cells.length - 1; i++) {
        colBoundaries.push(cells[i].getBoundingClientRect().right);
      }
    }

    // Row boundaries: bottom edge of each row (except last)
    const rows = table.querySelectorAll('tr');
    const rowBoundaries: number[] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      rowBoundaries.push(rows[i].getBoundingClientRect().bottom);
    }

    return { rect, colBoundaries, rowBoundaries };
  }, []);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredTable(null);
      setTableInfo(null);
      setVisible(false);
    }, 200);
  }, [clearHideTimeout]);

  // Detect table hover
  useEffect(() => {
    const editorEl = editorContainerRef.current;
    if (!editorEl) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table') as HTMLTableElement | null;

      if (table && editorEl.contains(table)) {
        clearHideTimeout();
        setHoveredTable(table);
        setTableInfo(computeTableInfo(table));
        setVisible(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related && (controlsRef.current?.contains(related) || related.closest('table'))) {
        return;
      }
      scheduleHide();
    };

    editorEl.addEventListener('mouseover', handleMouseOver);
    editorEl.addEventListener('mouseout', handleMouseOut);

    return () => {
      editorEl.removeEventListener('mouseover', handleMouseOver);
      editorEl.removeEventListener('mouseout', handleMouseOut);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [editorContainerRef, clearHideTimeout, scheduleHide, computeTableInfo]);

  // Update positions on scroll/resize
  useEffect(() => {
    if (!hoveredTable) return;

    const update = () => {
      if (hoveredTable.isConnected) {
        setTableInfo(computeTableInfo(hoveredTable));
      }
    };

    const scrollContainer = editorContainerRef.current?.closest('.overflow-y-auto');
    scrollContainer?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      scrollContainer?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [hoveredTable, editorContainerRef, computeTableInfo]);

  // Insert column after a specific column index
  const insertColumnAfterIndex = useCallback((colIndex: number) => {
    if (!hoveredTable || !editor) return;
    const firstRow = hoveredTable.querySelector('tr');
    const cell = firstRow?.querySelectorAll('th, td')[colIndex];
    if (cell) {
      const pos = editor.view.posAtDOM(cell, 0);
      editor.chain().focus(pos).addColumnAfter().run();
    }
  }, [hoveredTable, editor]);

  // Insert row after a specific row index
  const insertRowAfterIndex = useCallback((rowIndex: number) => {
    if (!hoveredTable || !editor) return;
    const rows = hoveredTable.querySelectorAll('tr');
    const firstCell = rows[rowIndex]?.querySelector('th, td');
    if (firstCell) {
      const pos = editor.view.posAtDOM(firstCell, 0);
      editor.chain().focus(pos).addRowAfter().run();
    }
  }, [hoveredTable, editor]);

  // Add column at the end
  const addColumnAtEnd = useCallback(() => {
    if (!hoveredTable || !editor) return;
    const firstRow = hoveredTable.querySelector('tr');
    const cells = firstRow?.querySelectorAll('th, td');
    const lastCell = cells?.[cells.length - 1];
    if (lastCell) {
      const pos = editor.view.posAtDOM(lastCell, 0);
      editor.chain().focus(pos).addColumnAfter().run();
    }
  }, [hoveredTable, editor]);

  // Add row at the end
  const addRowAtEnd = useCallback(() => {
    if (!hoveredTable || !editor) return;
    const rows = hoveredTable.querySelectorAll('tr');
    const lastRow = rows[rows.length - 1];
    const lastCell = lastRow?.querySelector('td:last-child, th:last-child');
    if (lastCell) {
      const pos = editor.view.posAtDOM(lastCell, 0);
      editor.chain().focus(pos).addRowAfter().run();
    }
  }, [hoveredTable, editor]);

  const handleControlsMouseEnter = useCallback(() => {
    clearHideTimeout();
  }, [clearHideTimeout]);

  const handleControlsMouseLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  if (!tableInfo || !visible) return null;

  const { rect, colBoundaries, rowBoundaries } = tableInfo;

  return (
    <div
      ref={controlsRef}
      onMouseEnter={handleControlsMouseEnter}
      onMouseLeave={handleControlsMouseLeave}
      style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 40 }}
    >
      {/* Top edge dots: between columns */}
      {colBoundaries.map((x, i) => (
        <button
          key={`col-${i}`}
          className="table-dot"
          style={{
            position: 'fixed',
            top: rect.top - 5,
            left: x - 4,
            pointerEvents: 'auto',
          }}
          onClick={() => insertColumnAfterIndex(i)}
          title="Insert column"
        />
      ))}

      {/* Left edge dots: between rows */}
      {rowBoundaries.map((y, i) => (
        <button
          key={`row-${i}`}
          className="table-dot"
          style={{
            position: 'fixed',
            top: y - 4,
            left: rect.left - 5,
            pointerEvents: 'auto',
          }}
          onClick={() => insertRowAfterIndex(i)}
          title="Insert row"
        />
      ))}

      {/* Right edge: + button to add column at end */}
      <button
        className="table-edge-btn table-edge-btn-column"
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.right - 1,
          height: rect.height,
          pointerEvents: 'auto',
        }}
        onClick={addColumnAtEnd}
        title="Insert column"
      >
        <div className="table-edge-line table-edge-line-vertical" />
        <div className="table-edge-plus">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </button>

      {/* Bottom edge: + button to add row at end */}
      <button
        className="table-edge-btn table-edge-btn-row"
        style={{
          position: 'fixed',
          top: rect.bottom - 1,
          left: rect.left,
          width: rect.width,
          pointerEvents: 'auto',
        }}
        onClick={addRowAtEnd}
        title="Insert row"
      >
        <div className="table-edge-line table-edge-line-horizontal" />
        <div className="table-edge-plus">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </button>
    </div>
  );
}
