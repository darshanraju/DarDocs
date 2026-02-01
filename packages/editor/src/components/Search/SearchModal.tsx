import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { useLibraryStore, type DocumentIndexEntry } from '../../stores/libraryStore';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument: (doc: DocumentIndexEntry) => void;
}

export function SearchModal({ isOpen, onClose, onOpenDocument }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, getAllDocuments } = useLibraryStore();

  const results = useMemo(() => {
    if (!query.trim()) {
      return getAllDocuments().slice(0, 15);
    }
    return search(query).slice(0, 15);
  }, [query, search, getAllDocuments]);

  // Focus input when opened
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
  }, [results]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onOpenDocument(results[selectedIndex]);
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, onClose, onOpenDocument]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={handleOverlayClick}>
      <div className="search-modal">
        {/* Search input */}
        <div className="search-modal-input-wrapper">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-modal-input"
            placeholder="Search documents..."
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="search-modal-results">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">
                {query ? `No results for "${query}"` : 'No documents in library'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Save documents to build your searchable library
              </p>
            </div>
          ) : (
            results.map((doc, index) => (
              <div
                key={doc.id}
                className={`search-result-item ${index === selectedIndex ? 'is-selected' : ''}`}
                onClick={() => {
                  onOpenDocument(doc);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {doc.title || 'Untitled'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.headings.slice(0, 3).map((h, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {h}
                      </span>
                    ))}
                  </div>
                  {doc.textPreview && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {doc.textPreview}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-300 flex-shrink-0">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="search-modal-footer">
          <span className="text-xs text-gray-400">
            <span className="search-kbd">Esc</span> to close
            <span className="mx-2">|</span>
            <span className="search-kbd">Enter</span> to open
          </span>
        </div>
      </div>
    </div>
  );
}
