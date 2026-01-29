import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronsLeft, AlignLeft } from 'lucide-react';

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const extractHeadings = useCallback(() => {
    const editorEl = window.document.querySelector('.ProseMirror');
    if (!editorEl) return;

    const headingEls = editorEl.querySelectorAll('h1, h2, h3');
    const extracted: TocHeading[] = [];

    headingEls.forEach((el, index) => {
      const level = parseInt(el.tagName[1]);
      const text = el.textContent?.trim() || '';
      if (!text) return;

      const id = `toc-heading-${index}`;
      if (!el.id) el.id = id;
      extracted.push({ id: el.id, text, level });
    });

    setHeadings(extracted);
  }, []);

  useEffect(() => {
    const timer = setTimeout(extractHeadings, 100);

    const setupObserver = () => {
      const editorEl = window.document.querySelector('.ProseMirror');
      if (!editorEl) {
        setTimeout(setupObserver, 200);
        return;
      }

      observerRef.current = new MutationObserver(() => {
        extractHeadings();
      });

      observerRef.current.observe(editorEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    };

    setupObserver();

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [extractHeadings]);

  // Track active heading via scroll position
  useEffect(() => {
    if (headings.length === 0) return;

    const scrollContainer = window.document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      let currentActive: string | null = null;

      for (const heading of headings) {
        const el = window.document.getElementById(heading.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= containerTop + 120) {
            currentActive = heading.id;
          }
        }
      }

      setActiveId(currentActive);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const scrollToHeading = useCallback((heading: TocHeading) => {
    const el = window.document.getElementById(heading.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (headings.length === 0) return null;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="toc-toggle-btn"
        title="Show table of contents"
      >
        <AlignLeft className="w-5 h-5 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="toc-sidebar">
      <button
        onClick={() => setIsExpanded(false)}
        className="toc-collapse-btn"
        title="Hide table of contents"
      >
        <ChevronsLeft className="w-5 h-5 text-gray-400" />
      </button>

      <nav className="toc-nav">
        {headings.map((heading) => (
          <button
            key={heading.id}
            onClick={() => scrollToHeading(heading)}
            className={`toc-item ${activeId === heading.id ? 'toc-item-active' : ''}`}
            style={{ paddingLeft: `${(heading.level - 1) * 16 + 8}px` }}
          >
            {heading.text}
          </button>
        ))}
      </nav>
    </div>
  );
}
