import { useCallback, useEffect, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { List, RefreshCw, Trash2 } from 'lucide-react';

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
  id: string;
}

export function TableOfContentsComponent({ editor, deleteNode, selected }: NodeViewProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const extractHeadings = useCallback(() => {
    if (!editor) return;

    const items: HeadingItem[] = [];
    const { doc } = editor.state;

    doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const text = node.textContent;
        if (text) {
          items.push({
            level: node.attrs.level as number,
            text,
            pos,
            id: `heading-${pos}`,
          });
        }
      }
    });

    setHeadings(items);
  }, [editor]);

  // Extract headings on mount and on document changes
  useEffect(() => {
    extractHeadings();

    if (!editor) return;

    // Listen for editor updates
    const handler = () => extractHeadings();
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, extractHeadings]);

  const scrollToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;

      // Focus the editor at the heading position
      editor.chain().focus().setTextSelection(pos + 1).run();

      // Scroll the heading into view
      const { view } = editor;
      const domAtPos = view.domAtPos(pos + 1);
      const element = domAtPos.node instanceof HTMLElement
        ? domAtPos.node
        : domAtPos.node.parentElement;

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [editor]
  );

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  // Minimum heading level for indent calculation
  const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`toc-wrapper ${selected ? 'ring-2 ring-blue-500' : ''}`}
      >
        {/* Header */}
        <div className="toc-header">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <List className="w-4 h-4" />
            Table of Contents
            <span className="text-xs text-gray-400 font-normal">
              ({headings.length} heading{headings.length !== 1 ? 's' : ''})
            </span>
          </button>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={extractHeadings}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-50 rounded transition-colors"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* TOC list */}
        {!isCollapsed && (
          <div className="toc-body">
            {headings.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                No headings found. Add headings to your document to generate a table of contents.
              </p>
            ) : (
              <nav>
                <ul className="toc-list">
                  {headings.map((heading) => (
                    <li
                      key={heading.id}
                      style={{ paddingLeft: `${(heading.level - minLevel) * 16}px` }}
                    >
                      <button
                        onClick={() => scrollToHeading(heading.pos)}
                        className={`toc-item toc-item-h${heading.level}`}
                      >
                        <span className="toc-item-indicator" />
                        <span className="toc-item-text">{heading.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
