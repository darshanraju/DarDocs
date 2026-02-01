import { useState, useCallback } from 'react';
import { useWorkspaceConfigStore } from '../../../../stores/workspaceConfigStore';

interface QueryTestPanelProps {
  connector: string;
  query: string;
  timeRange: string;
  onClose: () => void;
}

const AGENT_URL = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3457`;

export function QueryTestPanel({ connector, query, timeRange, onClose }: QueryTestPanelProps) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const workspaceConfig = useWorkspaceConfigStore(s => s.config);

  const handleTest = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const credentials = (workspaceConfig?.providers as Record<string, unknown>)?.[connector] || {};

      const response = await fetch(`${AGENT_URL}/test-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector, query, timeRange, credentials }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Query failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to agent server. Is it running?');
    } finally {
      setLoading(false);
    }
  }, [connector, query, timeRange, workspaceConfig]);

  return (
    <div className="query-test-panel">
      <div className="query-test-header">
        <span className="query-test-title">Query Preview</span>
        <button className="query-test-close" onClick={onClose}>{'\u2715'}</button>
      </div>
      <div className="query-test-info">
        <div className="query-test-row">
          <span className="query-test-label">Connector:</span>
          <span className="query-test-value">{connector}</span>
        </div>
        <div className="query-test-row">
          <span className="query-test-label">Query:</span>
          <span className="query-test-value query-test-query">{query}</span>
        </div>
        <div className="query-test-row">
          <span className="query-test-label">Time Range:</span>
          <span className="query-test-value">{timeRange}</span>
        </div>
      </div>
      <button
        className="query-test-run-btn"
        onClick={handleTest}
        disabled={loading}
      >
        {loading ? 'Running...' : 'Run Query'}
      </button>
      {result && (
        <div className="query-test-result">
          <div className="query-test-result-label">Result:</div>
          <pre className="query-test-result-data">{result}</pre>
        </div>
      )}
      {error && (
        <div className="query-test-error">{error}</div>
      )}
    </div>
  );
}
