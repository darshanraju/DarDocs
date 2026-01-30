import { useState, useEffect, useCallback, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  RefreshCw,
  Settings,
  Trash2,
  GripVertical,
  AlertCircle,
  Clock,
  Zap,
  Globe,
  Code2,
  Database,
  Bug,
} from 'lucide-react';
import type { CustomCommand } from '../../../../stores/customCommandStore';
import { useCustomCommandStore } from '../../../../stores/customCommandStore';

// ---------------------------------------------------------------------------
// Execute the command and return data
// ---------------------------------------------------------------------------
async function executeCommand(command: CustomCommand): Promise<unknown> {
  switch (command.type) {
    case 'api_fetch': {
      const headers: Record<string, string> = {};
      if (command.config.headers) {
        try {
          Object.assign(headers, JSON.parse(command.config.headers));
        } catch {
          // ignore bad header JSON
        }
      }
      const init: RequestInit = {
        method: command.config.method || 'GET',
        headers,
      };
      if (init.method !== 'GET' && command.config.body) {
        init.body = command.config.body;
      }
      const res = await fetch(command.config.url || '', init);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    }

    case 'javascript': {
      // Wrap in an async IIFE so the user code can use `await`
      const wrapped = `return (async () => { ${command.config.code || 'return {}'} })()`;
      const fn = new Function(wrapped);
      return fn();
    }

    case 'web_scraper': {
      // Real scraping requires a CORS proxy. Return a helpful stub.
      return {
        _type: 'scraper_stub',
        _message:
          'Web scraping requires a CORS proxy. Configure one in your backend and set the proxy URL here.',
        url: command.config.scrapeUrl,
        selectors: command.config.selectors
          ? JSON.parse(command.config.selectors)
          : {},
      };
    }

    case 'static_data': {
      return JSON.parse(command.config.staticData || '{}');
    }

    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  api_fetch: {
    label: 'API',
    icon: <Globe className="w-3 h-3" />,
    color: '#3370ff',
  },
  javascript: {
    label: 'JS',
    icon: <Code2 className="w-3 h-3" />,
    color: '#eab308',
  },
  web_scraper: {
    label: 'Scraper',
    icon: <Bug className="w-3 h-3" />,
    color: '#7c3aed',
  },
  static_data: {
    label: 'Static',
    icon: <Database className="w-3 h-3" />,
    color: '#00b386',
  },
};

function renderMetric(data: Record<string, unknown>) {
  return (
    <div className="ccb-metric">
      {data.title && <div className="ccb-metric-title">{String(data.title)}</div>}
      <div className="ccb-metric-value">
        {String(data.value ?? '')}
        {data.unit && <span className="ccb-metric-unit">{String(data.unit)}</span>}
      </div>
      {data.change != null && (
        <div
          className="ccb-metric-change"
          data-direction={
            String(data.change).startsWith('+')
              ? 'up'
              : String(data.change).startsWith('-')
                ? 'down'
                : 'neutral'
          }
        >
          {String(data.change)}
        </div>
      )}
    </div>
  );
}

function renderTable(data: unknown[]) {
  if (data.length === 0) return <div className="ccb-empty">Empty dataset</div>;
  // Pick a limited set of keys to keep it tidy
  const allKeys = Object.keys(data[0] as Record<string, unknown>);
  const keys = allKeys.slice(0, 6);
  return (
    <div className="ccb-table-wrap">
      <table className="ccb-table">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => {
            const r = row as Record<string, unknown>;
            return (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k}>{String(r[k] ?? '')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length > 10 && (
        <div className="ccb-table-more">
          Showing 10 of {data.length} rows
        </div>
      )}
    </div>
  );
}

function renderKeyValue(data: Record<string, unknown>) {
  return (
    <div className="ccb-kv">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="ccb-kv-row">
          <span className="ccb-kv-key">{key}</span>
          <span className="ccb-kv-val">
            {typeof value === 'object'
              ? JSON.stringify(value)
              : String(value ?? '')}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderCustom(data: unknown, template: string) {
  let html = template;
  const flat =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : { value: data };
  for (const [key, val] of Object.entries(flat)) {
    html = html.replaceAll(`{{${key}}}`, String(val ?? ''));
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderData(
  data: unknown,
  mode: string,
  customTemplate?: string
): React.ReactNode {
  if (data == null)
    return <div className="ccb-empty">No data. Click refresh to fetch.</div>;

  if (mode === 'metric' && typeof data === 'object' && !Array.isArray(data)) {
    return renderMetric(data as Record<string, unknown>);
  }
  if (mode === 'table' && Array.isArray(data)) {
    return renderTable(data);
  }
  if (mode === 'custom' && customTemplate) {
    return renderCustom(data, customTemplate);
  }
  // key_value or auto fallback
  if (typeof data === 'object' && !Array.isArray(data)) {
    return renderKeyValue(data as Record<string, unknown>);
  }
  if (Array.isArray(data)) {
    return renderTable(data);
  }
  return <div className="ccb-raw">{String(data)}</div>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CustomCommandBlockComponent({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const configStr = node.attrs.commandConfig as string;
  const command: CustomCommand = JSON.parse(configStr || '{}');
  const typeMeta = TYPE_META[command.type] || TYPE_META.static_data;

  const [data, setData] = useState<unknown>(
    node.attrs.lastData ? JSON.parse(node.attrs.lastData) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(
    node.attrs.lastUpdated
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await executeCommand(command);
      setData(result);
      const now = new Date().toISOString();
      setLastUpdated(now);
      updateAttributes({
        lastData: JSON.stringify(result),
        lastUpdated: now,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [command, updateAttributes]);

  // Auto-fetch on mount if no data
  useEffect(() => {
    if (!data && !loading) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Schedule auto-refresh
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (command.schedule?.enabled && command.schedule.intervalSeconds > 0) {
      intervalRef.current = setInterval(
        refresh,
        command.schedule.intervalSeconds * 1000
      );
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [command.schedule?.enabled, command.schedule?.intervalSeconds, refresh]);

  const handleEdit = useCallback(() => {
    useCustomCommandStore.getState().openBuilder(command.id);
  }, [command.id]);

  const handleDelete = useCallback(() => {
    if (confirm('Remove this command block?')) {
      deleteNode();
    }
  }, [deleteNode]);

  const timeSince = lastUpdated
    ? formatRelative(new Date(lastUpdated))
    : null;

  return (
    <NodeViewWrapper className="ccb-wrapper my-4">
      <div className={`ccb-card ${selected ? 'ccb-selected' : ''}`}>
        {/* Drag handle */}
        <div className="ccb-drag" data-drag-handle>
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Header */}
        <div className="ccb-header">
          <div className="ccb-header-left">
            <span className="ccb-icon">{command.icon || '⚡'}</span>
            <span className="ccb-name">{command.name || 'Untitled Command'}</span>
            <span
              className="ccb-type-badge"
              style={{ background: typeMeta.color + '18', color: typeMeta.color }}
            >
              {typeMeta.icon}
              {typeMeta.label}
            </span>
          </div>
          <div className="ccb-header-actions">
            {timeSince && (
              <span className="ccb-timestamp">
                <Clock className="w-3 h-3" />
                {timeSince}
              </span>
            )}
            <button
              className="ccb-action-btn"
              onClick={refresh}
              disabled={loading}
              title="Refresh data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'ccb-spin' : ''}`}
              />
            </button>
            <button
              className="ccb-action-btn"
              onClick={handleEdit}
              title="Edit command"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              className="ccb-action-btn ccb-action-delete"
              onClick={handleDelete}
              title="Remove block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {command.description && (
          <div className="ccb-description">{command.description}</div>
        )}

        {/* Body */}
        <div className="ccb-body">
          {error ? (
            <div className="ccb-error">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : loading && !data ? (
            <div className="ccb-loading">
              <RefreshCw className="w-4 h-4 ccb-spin" />
              <span>Fetching data...</span>
            </div>
          ) : (
            renderData(data, command.displayMode, command.customTemplate)
          )}
        </div>

        {/* Footer (schedule info) */}
        {command.schedule?.enabled && command.schedule.intervalSeconds > 0 && (
          <div className="ccb-footer">
            <Zap className="w-3 h-3" />
            Auto-refresh every{' '}
            {command.schedule.intervalSeconds >= 60
              ? `${Math.round(command.schedule.intervalSeconds / 60)}m`
              : `${command.schedule.intervalSeconds}s`}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function formatRelative(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString();
}
