import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronsLeft, AlignLeft } from 'lucide-react';

interface TocHeading {
  domIndex: number;
  text: string;
  level: number;
}

export function TableOfContents() {
  // null = user hasn't manually toggled, so auto-derive from content
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const observedElRef = useRef<Element | null>(null);
  const extractingRef = useRef(false);

  const hasHeadings = headings.length > 0;
  // If user manually toggled, respect that; otherwise follow content
  const isExpanded = userOverride !== null ? userOverride : hasHeadings;

  const getHeadingElements = useCallback((): NodeListOf<Element> | null => {
    const editorEl = window.document.querySelector('.ProseMirror');
    if (!editorEl) return null;
    return editorEl.querySelectorAll('h1, h2, h3');
  }, []);

  const extractHeadings = useCallback(() => {
    // Guard against re-entrant calls from MutationObserver
    if (extractingRef.current) return;
    extractingRef.current = true;

    try {
      const headingEls = getHeadingElements();
      if (!headingEls) {
        extractingRef.current = false;
        return;
      }

      const extracted: TocHeading[] = [];

      headingEls.forEach((el, index) => {
        const level = parseInt(el.tagName[1]);
        const text = el.textContent?.trim() || '';
        if (!text) return;
        extracted.push({ domIndex: index, text, level });
      });

      setHeadings(extracted);
    } finally {
      extractingRef.current = false;
    }
  }, [getHeadingElements]);

  // Set up MutationObserver with re-attachment when the editor element changes
  useEffect(() => {
    const attachObserver = () => {
      const editorEl = window.document.querySelector('.ProseMirror');

      if (editorEl === observedElRef.current) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!editorEl) {
        observedElRef.current = null;
        return;
      }

      observedElRef.current = editorEl;

      observerRef.current = new MutationObserver(() => {
        extractHeadings();
      });

      observerRef.current.observe(editorEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      extractHeadings();
    };

    attachObserver();

    const interval = setInterval(() => {
      const currentEl = window.document.querySelector('.ProseMirror');
      if (currentEl !== observedElRef.current) {
        attachObserver();
      }
      extractHeadings();
    }, 800);

    return () => {
      clearInterval(interval);
      observerRef.current?.disconnect();
    };
  }, [extractHeadings]);

  // Track active heading via scroll position
  useEffect(() => {
    if (headings.length === 0) return;

    const scrollContainer = window.document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const headingEls = getHeadingElements();
      if (!headingEls) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      let currentActive: number | null = null;

      for (const heading of headings) {
        const el = headingEls[heading.domIndex];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= containerTop + 120) {
            currentActive = heading.domIndex;
          }
        }
      }

      setActiveIndex(currentActive);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [headings, getHeadingElements]);

  const scrollToHeading = useCallback((heading: TocHeading) => {
    const headingEls = getHeadingElements();
    if (!headingEls) return;
    const el = headingEls[heading.domIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [getHeadingElements]);

  // Nothing to show and not manually expanded — render nothing
  if (!isExpanded && !hasHeadings) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="toc-inline-collapsed">
        <button
          onClick={() => setUserOverride(true)}
          className="toc-toggle-btn"
          title="Show table of contents"
        >
          <AlignLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="toc-inline">
      <div className="toc-inline-header">
        <button
          onClick={() => setUserOverride(false)}
          className="toc-collapse-btn"
          title="Hide table of contents"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>
      </div>

      <nav className="toc-nav">
        {headings.map((heading) => (
          <button
            key={`${heading.domIndex}-${heading.text}`}
            onClick={() => scrollToHeading(heading)}
            className={`toc-item ${activeIndex === heading.domIndex ? 'toc-item-active' : ''}`}
            style={{ paddingLeft: `${(heading.level - 1) * 16 + 8}px` }}
          >
            {heading.text}
          </button>
        ))}
      </nav>
    </div>
  );
}
