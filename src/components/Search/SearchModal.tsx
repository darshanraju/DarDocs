import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Clock, ArrowRight } from 'lucide-react';
import { useLibraryStore, type DocumentIndexEntry } from '../../stores/libraryStore';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument?: (doc: DocumentIndexEntry) => void;
}

export function SearchModal({ isOpen, onClose, onOpenDocument }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, getAllDocuments } = useLibraryStore();

  const results = query.trim()
    ? search(query)
    : getAllDocuments()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (doc: DocumentIndexEntry) => {
      onOpenDocument?.(doc);
      onClose();
    },
    [onOpenDocument, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, handleSelect, onClose]);

  if (!isOpen) return null;

  // Highlight matching text in results
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="search-modal-input-wrapper">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents... (try natural language like 'how does auth work?')"
            className="search-modal-input"
          />
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="search-modal-results">
          {!query.trim() && results.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Recent documents
            </div>
          )}

          {query.trim() && results.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 font-medium">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
          )}

          {results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                {query.trim()
                  ? 'No documents match your search'
                  : 'No documents in your library yet'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {query.trim()
                  ? 'Try different keywords or a broader search'
                  : 'Save documents to start building your knowledge base'}
              </p>
            </div>
          )}

          {results.map((doc, index) => (
            <div
              key={doc.id}
              className={`search-result-item ${index === selectedIndex ? 'is-selected' : ''}`}
              onClick={() => handleSelect(doc)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {highlightMatch(doc.title || 'Untitled', query)}
                </div>
                {doc.textPreview && (
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                    {highlightMatch(doc.textPreview, query)}
                  </div>
                )}
                {doc.headings.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {doc.headings.slice(0, 3).map((h, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                      >
                        {h}
                      </span>
                    ))}
                    {doc.headings.length > 3 && (
                      <span className="text-xs text-gray-300">
                        +{doc.headings.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="search-modal-footer">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span><kbd className="search-kbd">↑↓</kbd> navigate</span>
            <span><kbd className="search-kbd">↵</kbd> open</span>
            <span><kbd className="search-kbd">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
