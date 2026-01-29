import { useEffect, useState, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';

interface TableEdgeControlsProps {
  editor: Editor;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface TableRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export function TableEdgeControls({ editor, editorContainerRef }: TableEdgeControlsProps) {
  const [tableRect, setTableRect] = useState<TableRect | null>(null);
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);
  const [showColumnButton, setShowColumnButton] = useState(false);
  const [showRowButton, setShowRowButton] = useState(false);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const rowButtonRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTableRect = useCallback((table: HTMLTableElement) => {
    const rect = table.getBoundingClientRect();
    setTableRect({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
    });
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
      setTableRect(null);
      setShowColumnButton(false);
      setShowRowButton(false);
    }, 200);
  }, [clearHideTimeout]);

  // Detect table hover via mouse events on the editor DOM
  useEffect(() => {
    const editorEl = editorContainerRef.current;
    if (!editorEl) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table') as HTMLTableElement | null;

      if (table && editorEl.contains(table)) {
        clearHideTimeout();
        if (hoveredTable !== table) {
          setHoveredTable(table);
          updateTableRect(table);
        }
        setShowColumnButton(true);
        setShowRowButton(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;

      // Don't hide if moving to the control buttons
      if (relatedTarget) {
        if (
          columnButtonRef.current?.contains(relatedTarget) ||
          rowButtonRef.current?.contains(relatedTarget) ||
          relatedTarget.closest('table')
        ) {
          return;
        }
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
  }, [editorContainerRef, hoveredTable, clearHideTimeout, scheduleHide, updateTableRect]);

  // Update rect on scroll
  useEffect(() => {
    if (!hoveredTable) return;

    const scrollContainer = editorContainerRef.current?.closest('.overflow-y-auto');
    const handleScroll = () => {
      if (hoveredTable) {
        updateTableRect(hoveredTable);
      }
    };

    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [hoveredTable, editorContainerRef, updateTableRect]);

  const handleAddColumn = useCallback(() => {
    if (!hoveredTable || !editor) return;

    // Find the last cell in the first row to position cursor in the rightmost column
    const lastRow = hoveredTable.querySelector('tr:last-child');
    const lastCell = lastRow?.querySelector('td:last-child, th:last-child');

    if (lastCell) {
      // Get ProseMirror position from DOM
      const pos = editor.view.posAtDOM(lastCell, 0);
      editor.chain().focus(pos).addColumnAfter().run();
    }
  }, [hoveredTable, editor]);

  const handleAddRow = useCallback(() => {
    if (!hoveredTable || !editor) return;

    // Find the last cell in the last row
    const lastRow = hoveredTable.querySelector('tr:last-child');
    const lastCell = lastRow?.querySelector('td:last-child, th:last-child');

    if (lastCell) {
      const pos = editor.view.posAtDOM(lastCell, 0);
      editor.chain().focus(pos).addRowAfter().run();
    }
  }, [hoveredTable, editor]);

  const handleButtonMouseEnter = useCallback(() => {
    clearHideTimeout();
  }, [clearHideTimeout]);

  const handleButtonMouseLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  if (!tableRect || !hoveredTable) return null;

  return (
    <>
      {/* Right edge: Insert column button */}
      {showColumnButton && (
        <button
          ref={columnButtonRef}
          className="table-edge-btn table-edge-btn-column group"
          style={{
            position: 'fixed',
            top: tableRect.top,
            left: tableRect.right - 1,
            height: tableRect.height,
          }}
          onClick={handleAddColumn}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          title="Insert column"
        >
          <div className="table-edge-line table-edge-line-vertical" />
          <div className="table-edge-plus">
            <Plus className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Bottom edge: Insert row button */}
      {showRowButton && (
        <button
          ref={rowButtonRef}
          className="table-edge-btn table-edge-btn-row group"
          style={{
            position: 'fixed',
            top: tableRect.bottom - 1,
            left: tableRect.left,
            width: tableRect.width,
          }}
          onClick={handleAddRow}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          title="Insert row"
        >
          <div className="table-edge-line table-edge-line-horizontal" />
          <div className="table-edge-plus">
            <Plus className="w-3.5 h-3.5" />
          </div>
        </button>
      )}
    </>
  );
}
