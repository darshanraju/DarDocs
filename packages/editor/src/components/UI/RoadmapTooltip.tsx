import { useState, useRef, useEffect } from 'react';
import { getRoadmapForBlock } from '@dardocs/core';
import type { RoadmapItem } from '@dardocs/core';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'roadmap-priority-high',
  medium: 'roadmap-priority-medium',
  low: 'roadmap-priority-low',
};

const EFFORT_LABELS: Record<string, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

interface RoadmapTooltipProps {
  /** The Tiptap node name, e.g. "boardBlock" */
  blockName: string;
}

export function RoadmapTooltip({ blockName }: RoadmapTooltipProps) {
  const items = getRoadmapForBlock(blockName);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);

  // No roadmap entries — render nothing
  if (items.length === 0) return null;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        badgeRef.current &&
        !badgeRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="roadmap-tooltip-anchor">
      <button
        ref={badgeRef}
        className="roadmap-badge"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        title={`${items.length} planned feature${items.length > 1 ? 's' : ''}`}
      >
        {items.length}
      </button>

      {open && (
        <div ref={panelRef} className="roadmap-panel" onClick={(e) => e.stopPropagation()}>
          <div className="roadmap-panel-header">
            Planned features
          </div>
          <ul className="roadmap-panel-list">
            {items.map((item) => (
              <RoadmapEntry key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoadmapEntry({ item }: { item: RoadmapItem }) {
  return (
    <li className="roadmap-entry">
      <div className="roadmap-entry-header">
        <span className={`roadmap-priority ${PRIORITY_COLORS[item.priority]}`}>
          {item.priority}
        </span>
        <span className="roadmap-effort" title={`Effort: ${item.effort}`}>
          {EFFORT_LABELS[item.effort]}
        </span>
      </div>
      <div className="roadmap-entry-title">{item.title}</div>
      <div className="roadmap-entry-desc">{item.description}</div>
      {item.tags.length > 0 && (
        <div className="roadmap-entry-tags">
          {item.tags.map((tag) => (
            <span key={tag} className="roadmap-tag">{tag}</span>
          ))}
        </div>
      )}
    </li>
  );
}
