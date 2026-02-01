import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ExternalLink, Trash2, GripVertical, Link, ChevronLeft, Activity } from 'lucide-react';
import {
  MONITOR_PROVIDERS,
  MONITOR_PROVIDER_LIST,
} from '@dardocs/core';
import type { MonitorProviderId, MonitorProviderConfig } from '@dardocs/core';

// Provider icon components (inline SVGs for brand accuracy)
function GrafanaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

function SentryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.91 2.33c-.46-.8-1.6-.8-2.06 0L9.28 6.71a12.42 12.42 0 0 1 6.2 10.75h-2.4A10.03 10.03 0 0 0 8 8.47L5.43 13a6.82 6.82 0 0 1 3.33 5.46H6.37A4.43 4.43 0 0 0 4.2 15.2l-1.26 2.18a6.82 6.82 0 0 1 4.83 3.08h3.57a.6.6 0 0 0 0-1.2h-1.1a9.2 9.2 0 0 0-1.9-3.84l1.4-2.42A11.23 11.23 0 0 1 15.48 22h2.39a13.63 13.63 0 0 0-7.04-13.28l1.53-2.65a16.01 16.01 0 0 1 8.44 15.93h2.4C23.2 12.78 19.86 5.63 13.91 2.33z" />
    </svg>
  );
}

function DatadogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14.5c-1.5 1-3.5 1.5-5 1-1.5-.5-2.5-1.5-3-3s0-3 1-4.5c1-1.5 2.5-2.5 4-2.5s3 .5 4 2c1 1.5 1 3.5 0 5-.5.8-1 1.5-1 2z" />
    </svg>
  );
}

function PagerDutyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.21 15.65V22h3.08V3.26C6.75 4.74 5.21 7.55 5.21 11.18v4.47zm4.06-12.3v14.27h.02c.52 1.03 1.28 1.9 2.22 2.56V2.13c-.82.3-1.57.7-2.24 1.22zm3.22-1.15V22c.71-.18 1.37-.47 1.97-.84V2.13c-.63-.04-1.3-.01-1.97.07zm2.95.25v18.38c1.14-1.05 1.93-2.38 2.3-3.85V4.48c-.6-.8-1.36-1.46-2.3-2.03z" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<MonitorProviderId, (props: { className?: string }) => JSX.Element> = {
  grafana: GrafanaIcon,
  sentry: SentryIcon,
  datadog: DatadogIcon,
  pagerduty: PagerDutyIcon,
};

export function MonitorBlockComponent({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { provider, url } = node.attrs as { provider: MonitorProviderId | null; url: string | null };

  // No provider selected — show picker
  if (!provider) {
    return (
      <NodeViewWrapper className="my-4">
        <div className={`monitor-block-wrapper ${selected ? 'is-selected' : ''}`}>
          <div className="monitor-block-header">
            <div className="monitor-block-header-left">
              <Activity className="w-3.5 h-3.5" style={{ color: '#3370ff' }} />
              <span className="monitor-block-label">Monitor</span>
            </div>
            <button
              onClick={() => deleteNode()}
              className="embed-action-btn embed-action-delete"
              title="Remove block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <ProviderPicker
            onSelect={(id) => updateAttributes({ provider: id })}
          />
        </div>
      </NodeViewWrapper>
    );
  }

  const config = MONITOR_PROVIDERS[provider];

  // Provider selected but no URL — show URL input
  if (!url) {
    return (
      <NodeViewWrapper className="my-4">
        <div className={`monitor-block-wrapper ${selected ? 'is-selected' : ''}`}>
          <div className="monitor-block-header">
            <div className="monitor-block-header-left">
              <Activity className="w-3.5 h-3.5" style={{ color: config.iconColor }} />
              <span className="monitor-block-label" style={{ color: config.iconColor }}>
                Monitor
              </span>
              <span className="monitor-block-separator">/</span>
              <span className="monitor-block-provider-name">{config.name}</span>
            </div>
            <div className="embed-block-actions">
              <button
                onClick={() => updateAttributes({ provider: null })}
                className="embed-action-btn"
                title="Back to providers"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                onClick={() => deleteNode()}
                className="embed-action-btn embed-action-delete"
                title="Remove block"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <UrlInput config={config} onSubmit={(u) => updateAttributes({ url: u })} onCancel={() => deleteNode()} />
        </div>
      </NodeViewWrapper>
    );
  }

  // Provider + URL — render embed
  return (
    <NodeViewWrapper className="my-4">
      <div className={`monitor-block-wrapper ${selected ? 'is-selected' : ''}`}>
        <div className="embed-drag-handle" data-drag-handle>
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <div className="monitor-block-header">
          <div className="monitor-block-header-left">
            <Activity className="w-3.5 h-3.5" style={{ color: config.iconColor }} />
            <span className="monitor-block-label" style={{ color: config.iconColor }}>
              Monitor
            </span>
            <span className="monitor-block-separator">/</span>
            <span className="monitor-block-provider-name">{config.name}</span>
          </div>
          <div className="embed-block-actions">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="embed-action-btn"
              title={`Open in ${config.name}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open</span>
            </a>
            <button
              onClick={() => deleteNode()}
              className="embed-action-btn embed-action-delete"
              title="Remove block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <MonitorEmbed url={url} config={config} />
      </div>
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider picker grid                                               */
/* ------------------------------------------------------------------ */

function ProviderPicker({ onSelect }: { onSelect: (id: MonitorProviderId) => void }) {
  return (
    <div className="monitor-provider-picker">
      <div className="monitor-provider-grid">
        {MONITOR_PROVIDER_LIST.map((p) => {
          const Icon = PROVIDER_ICONS[p.id];
          return (
            <button
              key={p.id}
              className={`monitor-provider-card ${p.status === 'coming-soon' ? 'is-coming-soon' : ''}`}
              onClick={() => p.status === 'available' && onSelect(p.id)}
              disabled={p.status === 'coming-soon'}
              title={p.status === 'coming-soon' ? 'Coming soon' : p.name}
            >
              <Icon className="monitor-provider-icon" />
              <span className="monitor-provider-name" style={{ color: p.status === 'available' ? p.iconColor : undefined }}>
                {p.name}
              </span>
              <span className="monitor-provider-desc">{p.description}</span>
              {p.status === 'coming-soon' && (
                <span className="monitor-provider-badge">Soon</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="monitor-provider-hint">Select a monitoring provider to embed</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  URL input                                                          */
/* ------------------------------------------------------------------ */

function UrlInput({
  config,
  onSubmit,
  onCancel,
}: {
  config: MonitorProviderConfig;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}) {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    if (!config.urlPattern.test(trimmed)) {
      setError(`Please enter a valid ${config.name} URL`);
      return;
    }

    setError('');
    onSubmit(trimmed);
  }, [inputUrl, config, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSubmit, onCancel]
  );

  return (
    <div className="embed-input-body">
      <div className="embed-input-row">
        <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="url"
          value={inputUrl}
          onChange={(e) => {
            setInputUrl(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={config.placeholder}
          className="embed-url-input"
        />
        <button onClick={handleSubmit} className="embed-submit-btn">
          Embed
        </button>
      </div>
      {error && <div className="embed-input-error">{error}</div>}
      <div className="embed-input-hint">Paste a URL and press Enter · Escape to cancel</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Monitor iframe embed                                               */
/* ------------------------------------------------------------------ */

function MonitorEmbed({
  url,
  config,
}: {
  url: string;
  config: MonitorProviderConfig;
}) {
  const embedUrl = config.getEmbedUrl(url);
  const [height, setHeight] = useState(config.defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
    },
    [height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      setHeight(Math.max(200, Math.min(800, startHeightRef.current + deltaY)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="embed-iframe-container">
      <iframe
        src={embedUrl}
        className="embed-iframe"
        style={{ height: `${height}px` }}
        allowFullScreen
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      <div className="embed-resize-handle" onMouseDown={handleResizeStart} />
    </div>
  );
}
