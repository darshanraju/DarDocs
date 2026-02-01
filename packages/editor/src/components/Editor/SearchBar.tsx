import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface SearchBarProps {
  editor: Editor | null;
  onClose: () => void;
}

export function SearchBar({ editor, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [matchInfo, setMatchInfo] = useState({ current: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Update search term when query changes
  useEffect(() => {
    if (!editor) return;

    if (query) {
      editor.commands.setSearchTerm(query);
    } else {
      editor.commands.clearSearch();
    }

    // Read match info from storage after a tick (decorations need to be applied)
    requestAnimationFrame(() => {
      const storage = editor.storage.searchHighlight;
      if (storage) {
        setMatchInfo({
          current: storage.results.length > 0 ? storage.currentIndex + 1 : 0,
          total: storage.results.length,
        });
      }
    });
  }, [query, editor]);

  const updateMatchInfo = useCallback(() => {
    if (!editor) return;
    const storage = editor.storage.searchHighlight;
    if (storage) {
      setMatchInfo({
        current: storage.results.length > 0 ? storage.currentIndex + 1 : 0,
        total: storage.results.length,
      });
    }
  }, [editor]);

  const handleNext = useCallback(() => {
    if (!editor) return;
    editor.commands.goToNextSearchResult();
    requestAnimationFrame(updateMatchInfo);
  }, [editor, updateMatchInfo]);

  const handlePrev = useCallback(() => {
    if (!editor) return;
    editor.commands.goToPrevSearchResult();
    requestAnimationFrame(updateMatchInfo);
  }, [editor, updateMatchInfo]);

  const handleClose = useCallback(() => {
    if (editor) {
      editor.commands.clearSearch();
    }
    onClose();
  }, [editor, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    },
    [handleClose, handleNext, handlePrev]
  );

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="text"
        className="search-bar-input"
        placeholder="Find in document..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="search-bar-count">
        {query ? `${matchInfo.current} of ${matchInfo.total}` : ''}
      </span>
      <div className="search-bar-divider" />
      <button
        className="search-bar-btn"
        onClick={handlePrev}
        disabled={matchInfo.total === 0}
        title="Previous match (Shift+Enter)"
      >
        <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
      </button>
      <button
        className="search-bar-btn"
        onClick={handleNext}
        disabled={matchInfo.total === 0}
        title="Next match (Enter)"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
      </button>
      <button
        className="search-bar-btn"
        onClick={handleClose}
        title="Close (Escape)"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} />
      </button>
    </div>
  );
}
