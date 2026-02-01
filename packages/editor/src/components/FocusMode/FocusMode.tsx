import { useEffect, useRef } from 'react';
import { X, Focus } from 'lucide-react';
import { PomodoroTimer } from './PomodoroTimer';
import { AmbientSounds } from './AmbientSounds';

interface FocusModeProps {
  isActive: boolean;
  onExit: () => void;
  children: React.ReactNode;
}

export function FocusMode({ isActive, onExit, children }: FocusModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Exit on Escape
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onExit]);

  // Typewriter scrolling: keep cursor vertically centered
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const middleOfContainer = containerRect.top + containerRect.height / 2;
      const offset = rect.top - middleOfContainer;

      if (Math.abs(offset) > 50) {
        container.scrollBy({
          top: offset,
          behavior: 'smooth',
        });
      }
    };

    let rafId: number;
    const debouncedHandler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleSelectionChange);
    };

    document.addEventListener('selectionchange', debouncedHandler);
    container.addEventListener('input', debouncedHandler);

    return () => {
      document.removeEventListener('selectionchange', debouncedHandler);
      container.removeEventListener('input', debouncedHandler);
      cancelAnimationFrame(rafId);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="focus-mode-overlay">
      {/* Top toolbar */}
      <div className="focus-mode-toolbar">
        <div className="flex items-center gap-2 text-gray-400">
          <Focus className="w-4 h-4" />
          <span className="text-xs font-medium">Focus Mode</span>
        </div>

        <div className="flex items-center gap-3">
          <AmbientSounds />
          <PomodoroTimer />
          <button
            onClick={onExit}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Exit focus mode (Esc)"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
          </button>
        </div>
      </div>

      {/* Content area with typewriter scrolling */}
      <div ref={containerRef} className="focus-mode-content">
        <div className="focus-mode-editor">
          {children}
        </div>
      </div>
    </div>
  );
}
