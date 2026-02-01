import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { FileText, Search } from 'lucide-react';
import { useLibraryStore } from '../../stores/libraryStore';

interface WikiLinkMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  query: string;
}

export function WikiLinkMenu({ editor, isOpen, onClose, position, query }: WikiLinkMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { getAllDocuments, search } = useLibraryStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) {
      return getAllDocuments().slice(0, 10);
    }
    return search(query).slice(0, 10);
  }, [query, getAllDocuments, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const insertLink = useCallback(
    (doc: { id: string; title: string }) => {
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
          {query ? `Searching: "${query}"` : 'Link to document'}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="wiki-link-menu-empty">
          <p className="text-xs text-gray-400">
            {query ? 'No documents found' : 'No documents in library'}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Save documents to build your library
          </p>
        </div>
      ) : (
        results.map((doc, index) => (
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
              {doc.textPreview && (
                <div className="text-xs text-gray-400 truncate">{doc.textPreview}</div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
