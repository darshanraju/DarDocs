import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { FileText, Search } from 'lucide-react';
import { useWorkspaceStore, type TreeNode } from '../../stores/workspaceStore';

interface WikiLinkMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  query: string;
}

interface DocItem {
  id: string;
  title: string;
}

function flattenTree(nodes: TreeNode[]): DocItem[] {
  const results: DocItem[] = [];
  const walk = (items: TreeNode[]) => {
    for (const item of items) {
      results.push({ id: item.id, title: item.title });
      if (item.children.length > 0) walk(item.children);
    }
  };
  walk(nodes);
  return results;
}

export function WikiLinkMenu({ editor, isOpen, onClose, position, query }: WikiLinkMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const tree = useWorkspaceStore((s) => s.tree);

  const allDocs = useMemo(() => flattenTree(tree), [tree]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return allDocs.slice(0, 10);
    }
    const lower = query.toLowerCase();
    return allDocs
      .filter((doc) => doc.title.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [query, allDocs]);

  const remaining = useMemo(() => {
    if (!query.trim()) {
      return Math.max(0, allDocs.length - 10);
    }
    const lower = query.toLowerCase();
    const total = allDocs.filter((doc) => doc.title.toLowerCase().includes(lower)).length;
    return Math.max(0, total - 10);
  }, [query, allDocs]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const insertLink = useCallback(
    (doc: DocItem) => {
      if (!editor) return;

      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // Find and delete the [[ trigger and query
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const bracketIndex = textBefore.lastIndexOf('[[');

      if (bracketIndex !== -1) {
        const from = $from.start() + bracketIndex;
        const to = $from.pos;

        editor
          .chain()
          .deleteRange({ from, to })
          .insertContent({
            type: 'text',
            text: doc.title,
            marks: [
              {
                type: 'wikiLink',
                attrs: {
                  docId: doc.id,
                  docTitle: doc.title,
                },
              },
            ],
          })
          .run();
      }

      onClose();
    },
    [editor, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => (prev - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (results[selectedIndex]) {
            insertLink(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        case ']':
          // If user types ]] to close, just close the menu
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, results, insertLink, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="wiki-link-menu fixed"
      style={{ top: position.top, left: position.left }}
    >
      <div className="wiki-link-menu-header">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">
          {query ? `Searching: "${query}"` : 'Link to page'}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="wiki-link-menu-empty">
          <p className="text-xs text-gray-400">
            {query ? 'No documents found' : 'No documents in workspace'}
          </p>
        </div>
      ) : (
        <>
          {results.map((doc, index) => (
            <div
              key={doc.id}
              className={`wiki-link-menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
              onClick={() => insertLink(doc)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {doc.title || 'Untitled'}
                </div>
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <div className="wiki-link-menu-footer">
              <span className="text-xs text-gray-400">... {remaining} more results</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
