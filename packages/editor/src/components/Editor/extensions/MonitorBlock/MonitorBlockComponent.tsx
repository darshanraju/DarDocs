import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  ExternalLink,
  Trash2,
  GripVertical,
  Link,
  ChevronLeft,
  Activity,
  Sparkles,
  Loader2,
  Search,
  Settings,
} from 'lucide-react';
import {
  MONITOR_PROVIDERS,
  MONITOR_PROVIDER_LIST,
} from '@dardocs/core';
import type { MonitorProviderId, MonitorProviderConfig } from '@dardocs/core';
import { useWorkspaceConfigStore } from '../../../../stores/workspaceConfigStore';
import { discoverMetrics } from '../../../../services/metricScanner';
import type { DiscoveredMetric } from '../../../../services/metricScanner';
import { generateGrafanaPanel } from '../../../../services/aiClient';
import { createDashboard } from '../../../../services/grafanaApi';

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

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

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

  // Provider selected but no URL — show input/create UI
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
          <ProviderInput
            provider={provider}
            config={config}
            onUrlSubmit={(u) => updateAttributes({ url: u })}
            onCancel={() => deleteNode()}
          />
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
/*  Provider input — combines URL embed + AI create tabs               */
/* ------------------------------------------------------------------ */

function ProviderInput({
  provider,
  config,
  onUrlSubmit,
  onCancel,
}: {
  provider: MonitorProviderId;
  config: MonitorProviderConfig;
  onUrlSubmit: (url: string) => void;
  onCancel: () => void;
}) {
  const { config: wsConfig, openSettings } = useWorkspaceConfigStore();

  const hasGrafanaCreds = !!wsConfig.providers.grafana;
  const hasAI = !!wsConfig.ai;
  const hasRepos = wsConfig.repos.length > 0;
  const canCreate = provider === 'grafana' && hasGrafanaCreds && hasAI;

  const [activeTab, setActiveTab] = useState<'embed' | 'create'>(canCreate ? 'create' : 'embed');

  return (
    <div>
      {/* Tab bar — only show if Create mode is possible */}
      {provider === 'grafana' && (
        <div className="monitor-input-tabs">
          <button
            className={`monitor-input-tab ${activeTab === 'embed' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('embed')}
          >
            <Link className="w-3.5 h-3.5" />
            Embed URL
          </button>
          <button
            className={`monitor-input-tab ${activeTab === 'create' ? 'is-active' : ''}`}
            onClick={() => canCreate ? setActiveTab('create') : openSettings()}
            title={canCreate ? 'Create with AI' : 'Configure in Settings'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create
            {!canCreate && <Settings className="w-3 h-3 opacity-50" />}
          </button>
        </div>
      )}

      {activeTab === 'embed' ? (
        <UrlInput config={config} onSubmit={onUrlSubmit} onCancel={onCancel} />
      ) : canCreate ? (
        <CreatePanel
          wsConfig={wsConfig}
          onCreated={onUrlSubmit}
          onCancel={onCancel}
        />
      ) : (
        <ConfigNeeded
          hasGrafanaCreds={hasGrafanaCreds}
          hasAI={hasAI}
          hasRepos={hasRepos}
          onOpenSettings={openSettings}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  URL input (existing embed flow)                                    */
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
      <div className="embed-input-hint">Paste a URL and press Enter</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI create panel                                                    */
/* ------------------------------------------------------------------ */

interface WsConfig {
  repos: { id: string; name: string; owner: string; repo: string; token?: string; url: string; addedAt: string }[];
  providers: { grafana?: { url: string; apiKey: string; defaultDataSourceUid?: string } };
  ai: { provider: 'anthropic' | 'openai'; apiKey: string; model?: string } | null;
}

function CreatePanel({
  wsConfig,
  onCreated,
  onCancel,
}: {
  wsConfig: WsConfig;
  onCreated: (url: string) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'generating' | 'creating' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [metrics, setMetrics] = useState<DiscoveredMetric[]>([]);
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDiscoverMetrics = useCallback(async () => {
    if (wsConfig.repos.length === 0) {
      setError('No repositories connected. Add repos in Workspace Settings.');
      return;
    }

    setStatus('scanning');
    setError('');
    try {
      const found = await discoverMetrics(wsConfig.repos, setStatusMsg);
      setMetrics(found);
      setMetricsLoaded(true);
      setStatus('idle');
      setStatusMsg(`Found ${found.length} metrics`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan repos');
      setStatus('idle');
    }
  }, [wsConfig.repos]);

  const handleCreate = useCallback(async () => {
    if (!prompt.trim()) return;
    if (!wsConfig.ai || !wsConfig.providers.grafana) return;

    setError('');

    // Step 1: Discover metrics if not already done
    let currentMetrics = metrics;
    if (!metricsLoaded && wsConfig.repos.length > 0) {
      setStatus('scanning');
      try {
        currentMetrics = await discoverMetrics(wsConfig.repos, setStatusMsg);
        setMetrics(currentMetrics);
        setMetricsLoaded(true);
      } catch {
        // Continue without metrics — the LLM can still try
      }
    }

    // Step 2: Generate panel JSON via AI
    setStatus('generating');
    setStatusMsg('AI is building your panel...');
    let panel;
    try {
      panel = await generateGrafanaPanel(prompt.trim(), currentMetrics, wsConfig.ai);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed');
      setStatus('idle');
      return;
    }

    // Step 3: Create dashboard via Grafana API
    setStatus('creating');
    setStatusMsg('Creating dashboard in Grafana...');
    try {
      const dashboardUrl = await createDashboard(
        wsConfig.providers.grafana,
        panel,
        wsConfig.providers.grafana.defaultDataSourceUid,
      );
      setStatus('done');
      onCreated(dashboardUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dashboard');
      setStatus('idle');
    }
  }, [prompt, metrics, metricsLoaded, wsConfig, onCreated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleCreate();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleCreate, onCancel]
  );

  const isWorking = status === 'scanning' || status === 'generating' || status === 'creating';

  return (
    <div className="monitor-create-panel">
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the dashboard you want... e.g. &quot;Show HTTP request rate by endpoint over the last 6 hours&quot;"
        className="monitor-create-input"
        rows={3}
        disabled={isWorking}
      />

      {/* Metrics discovery section */}
      {metricsLoaded && metrics.length > 0 && (
        <div className="monitor-metrics-summary">
          <span className="monitor-metrics-count">{metrics.length} metrics discovered</span>
          <div className="monitor-metrics-list">
            {metrics.slice(0, 8).map((m) => (
              <span key={m.name} className="monitor-metric-chip" title={`${m.type} from ${m.repo}`}>
                {m.name}
              </span>
            ))}
            {metrics.length > 8 && (
              <span className="monitor-metric-chip monitor-metric-more">
                +{metrics.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status / progress */}
      {isWorking && (
        <div className="monitor-create-status">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{statusMsg}</span>
        </div>
      )}

      {error && <div className="embed-input-error">{error}</div>}

      <div className="monitor-create-actions">
        <div className="monitor-create-actions-left">
          <button
            onClick={handleDiscoverMetrics}
            className="monitor-create-discover-btn"
            disabled={isWorking || wsConfig.repos.length === 0}
            title={wsConfig.repos.length === 0 ? 'Add repos in Settings first' : 'Scan repos for metrics'}
          >
            <Search className="w-3.5 h-3.5" />
            {metricsLoaded ? 'Rescan' : 'Discover Metrics'}
          </button>
        </div>
        <button
          onClick={handleCreate}
          className="monitor-create-submit-btn"
          disabled={isWorking || !prompt.trim()}
        >
          {isWorking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Create Dashboard
        </button>
      </div>

      <div className="embed-input-hint">
        {String.fromCharCode(8984)}+Enter to create · Escape to cancel
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Configuration needed prompt                                        */
/* ------------------------------------------------------------------ */

function ConfigNeeded({
  hasGrafanaCreds,
  hasAI,
  hasRepos,
  onOpenSettings,
}: {
  hasGrafanaCreds: boolean;
  hasAI: boolean;
  hasRepos: boolean;
  onOpenSettings: () => void;
}) {
  return (
    <div className="monitor-config-needed">
      <div className="monitor-config-needed-text">
        To create dashboards with AI, configure the following in Workspace Settings:
      </div>
      <ul className="monitor-config-needed-list">
        {!hasGrafanaCreds && <li>Grafana instance URL and API key</li>}
        {!hasAI && <li>AI provider API key (Anthropic or OpenAI)</li>}
        {!hasRepos && <li>At least one GitHub repository (for metric discovery)</li>}
      </ul>
      <button onClick={onOpenSettings} className="monitor-config-needed-btn">
        <Settings className="w-4 h-4" />
        Open Settings
      </button>
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
