import { useCallback, useEffect, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Trash2 } from 'lucide-react';

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
  id: string;
}

export function TableOfContentsComponent({ editor, deleteNode, selected }: NodeViewProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

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

    const handler = () => extractHeadings();
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, extractHeadings]);

  const scrollToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;

      editor.chain().focus().setTextSelection(pos + 1).run();

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

  // Minimum heading level for indent calculation
  const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;

  return (
    <NodeViewWrapper className="my-4">
      <div className={`toc-notion group ${selected ? 'ring-2 ring-blue-200 rounded-md' : ''}`}>
        {headings.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">
            No headings found. Add headings to generate a table of contents.
          </p>
        ) : (
          <nav>
            <ul className="toc-notion-list">
              {headings.map((heading) => (
                <li
                  key={heading.id}
                  style={{ paddingLeft: `${(heading.level - minLevel) * 24}px` }}
                >
                  <button
                    onClick={() => scrollToHeading(heading.pos)}
                    className={`toc-notion-link toc-notion-h${heading.level}`}
                  >
                    {heading.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <button
          onClick={() => deleteNode()}
          className="toc-notion-delete"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </NodeViewWrapper>
  );
}
