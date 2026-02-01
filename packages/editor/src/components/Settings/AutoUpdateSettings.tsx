import { useState } from 'react';
import { getRoadmapForBlock } from '@dardocs/core';
import type { RoadmapItem } from '@dardocs/core';

/* ------------------------------------------------------------------ */
/*  Mock data — simulates what a configured auto-update would show     */
/* ------------------------------------------------------------------ */

interface MockWatchRule {
  id: string;
  docTitle: string;
  watchPaths: string[];
  branch: string;
  lastChecked: string;
  status: 'current' | 'stale' | 'updating';
}

interface MockUpdateEvent {
  id: string;
  docTitle: string;
  timestamp: string;
  trigger: string;
  filesChanged: number;
  status: 'applied' | 'pending-review' | 'dismissed';
  summary: string;
}

const MOCK_WATCH_RULES: MockWatchRule[] = [
  {
    id: '1',
    docTitle: 'API Reference',
    watchPaths: ['apps/api/src/routes/**', 'packages/core/src/**/*.ts'],
    branch: 'main',
    lastChecked: '2 minutes ago',
    status: 'stale',
  },
  {
    id: '2',
    docTitle: 'Architecture Overview',
    watchPaths: ['packages/**', 'apps/**'],
    branch: 'main',
    lastChecked: '2 minutes ago',
    status: 'current',
  },
  {
    id: '3',
    docTitle: 'Runbook: Deploy Guide',
    watchPaths: ['apps/api/src/**', 'apps/agent/src/**'],
    branch: 'main',
    lastChecked: '15 minutes ago',
    status: 'updating',
  },
];

const MOCK_EVENTS: MockUpdateEvent[] = [
  {
    id: 'e1',
    docTitle: 'API Reference',
    timestamp: '10 min ago',
    trigger: 'Merge PR #42 → main',
    filesChanged: 3,
    status: 'pending-review',
    summary: 'New endpoint POST /api/runbooks/:id/execute added; updated request schema for GET /api/documents.',
  },
  {
    id: 'e2',
    docTitle: 'Architecture Overview',
    timestamp: '2 hours ago',
    trigger: 'Merge PR #39 → main',
    filesChanged: 7,
    status: 'applied',
    summary: 'Agent package restructured — ReasoningEngine moved to new module path.',
  },
  {
    id: 'e3',
    docTitle: 'Runbook: Deploy Guide',
    timestamp: '1 day ago',
    trigger: 'Merge PR #35 → main',
    filesChanged: 1,
    status: 'dismissed',
    summary: 'Minor env variable rename (PORT → API_PORT) in deployment config.',
  },
];

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

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function AutoUpdateSettings() {
  const [activeSection, setActiveSection] = useState<'config' | 'activity' | 'roadmap'>('config');
  const roadmapItems = getRoadmapForBlock('autoUpdate');

  return (
    <div className="settings-section">
      <div className="autoupdate-coming-soon-banner">
        <div className="autoupdate-coming-soon-badge">Coming Soon</div>
        <div className="autoupdate-coming-soon-text">
          Auto-update will automatically detect when source code changes affect your
          documents, and use AI to suggest targeted updates. Below is a preview of
          how the configuration and activity feed will work.
        </div>
      </div>

      <div className="autoupdate-section-tabs">
        <button
          className={`autoupdate-section-tab ${activeSection === 'config' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('config')}
        >
          Configuration
        </button>
        <button
          className={`autoupdate-section-tab ${activeSection === 'activity' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('activity')}
        >
          Activity
        </button>
        <button
          className={`autoupdate-section-tab ${activeSection === 'roadmap' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('roadmap')}
        >
          Roadmap
          <span className="autoupdate-roadmap-count">{roadmapItems.length}</span>
        </button>
      </div>

      {activeSection === 'config' && <ConfigSection />}
      {activeSection === 'activity' && <ActivitySection />}
      {activeSection === 'roadmap' && <RoadmapSection items={roadmapItems} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Configuration section                                               */
/* ------------------------------------------------------------------ */

function ConfigSection() {
  return (
    <div className="autoupdate-config">
      {/* Global settings */}
      <div className="autoupdate-global-settings">
        <div className="settings-form-group">
          <label className="settings-label">Watched branch</label>
          <input
            className="settings-input autoupdate-disabled-input"
            value="main"
            readOnly
            tabIndex={-1}
          />
        </div>

        <div className="settings-form-group">
          <label className="settings-label">Trigger</label>
          <div className="autoupdate-trigger-options">
            <label className="autoupdate-checkbox is-checked">
              <span className="autoupdate-checkbox-box is-checked" />
              On merge to branch
            </label>
            <label className="autoupdate-checkbox">
              <span className="autoupdate-checkbox-box" />
              On push to branch
            </label>
            <label className="autoupdate-checkbox">
              <span className="autoupdate-checkbox-box" />
              Scheduled (daily)
            </label>
          </div>
        </div>

        <div className="settings-form-group">
          <label className="settings-label">Update mode</label>
          <div className="settings-radio-group">
            <label className="settings-radio is-selected">
              <input type="radio" name="mock-mode" readOnly checked />
              Suggest for review
            </label>
            <label className="settings-radio">
              <input type="radio" name="mock-mode" readOnly />
              Auto-apply
            </label>
            <label className="settings-radio">
              <input type="radio" name="mock-mode" readOnly />
              Notify only
            </label>
          </div>
        </div>
      </div>

      {/* Watch rules */}
      <div className="autoupdate-watch-rules">
        <div className="autoupdate-watch-rules-header">
          <span className="settings-label">Document watch rules</span>
        </div>
        {MOCK_WATCH_RULES.map((rule) => (
          <WatchRuleCard key={rule.id} rule={rule} />
        ))}
        <button className="settings-add-btn autoupdate-disabled-btn" tabIndex={-1}>
          + Add watch rule
        </button>
      </div>
    </div>
  );
}

function WatchRuleCard({ rule }: { rule: MockWatchRule }) {
  const statusClass =
    rule.status === 'stale'
      ? 'is-stale'
      : rule.status === 'updating'
      ? 'is-updating'
      : 'is-current';

  const statusLabel =
    rule.status === 'stale'
      ? 'Stale'
      : rule.status === 'updating'
      ? 'Updating...'
      : 'Current';

  return (
    <div className={`autoupdate-watch-card ${statusClass}`}>
      <div className="autoupdate-watch-card-top">
        <span className="autoupdate-watch-card-title">{rule.docTitle}</span>
        <span className={`autoupdate-status-badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="autoupdate-watch-card-paths">
        {rule.watchPaths.map((p) => (
          <code key={p} className="autoupdate-path-chip">{p}</code>
        ))}
      </div>
      <div className="autoupdate-watch-card-meta">
        Branch: <code>{rule.branch}</code> &middot; Checked {rule.lastChecked}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity section                                                    */
/* ------------------------------------------------------------------ */

function ActivitySection() {
  return (
    <div className="autoupdate-activity">
      <div className="settings-section-desc" style={{ marginBottom: '0.5rem' }}>
        Recent auto-update events from watched documents.
      </div>
      {MOCK_EVENTS.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: MockUpdateEvent }) {
  const statusClass =
    event.status === 'pending-review'
      ? 'is-pending'
      : event.status === 'applied'
      ? 'is-applied'
      : 'is-dismissed';

  const statusLabel =
    event.status === 'pending-review'
      ? 'Pending Review'
      : event.status === 'applied'
      ? 'Applied'
      : 'Dismissed';

  return (
    <div className={`autoupdate-event-card ${statusClass}`}>
      <div className="autoupdate-event-card-top">
        <span className="autoupdate-event-doc">{event.docTitle}</span>
        <span className={`autoupdate-event-status ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="autoupdate-event-trigger">
        {event.trigger} &middot; {event.filesChanged} file{event.filesChanged > 1 ? 's' : ''} changed
      </div>
      <div className="autoupdate-event-summary">{event.summary}</div>
      <div className="autoupdate-event-time">{event.timestamp}</div>
      {event.status === 'pending-review' && (
        <div className="autoupdate-event-actions">
          <button className="autoupdate-action-btn autoupdate-action-review" tabIndex={-1}>
            Review Changes
          </button>
          <button className="autoupdate-action-btn autoupdate-action-dismiss" tabIndex={-1}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Roadmap section                                                     */
/* ------------------------------------------------------------------ */

function RoadmapSection({ items }: { items: RoadmapItem[] }) {
  return (
    <div className="autoupdate-roadmap">
      <div className="settings-section-desc" style={{ marginBottom: '0.5rem' }}>
        Planned features for the auto-update system.
      </div>
      <ul className="autoupdate-roadmap-list">
        {items.map((item) => (
          <li key={item.id} className="roadmap-entry">
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
        ))}
      </ul>
    </div>
  );
}
