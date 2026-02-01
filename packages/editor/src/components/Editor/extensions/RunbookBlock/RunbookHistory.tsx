import { useState, useEffect } from 'react';
import type { RunbookStep } from '@dardocs/core';

export interface RunbookExecution {
  id: string;
  runbookId: string;
  title: string;
  timestamp: string;
  status: 'completed' | 'failed';
  steps: Array<{
    label: string;
    status: string;
    confidence?: number;
    explanation?: string;
  }>;
  conclusion?: string;
}

const STORAGE_KEY = 'dardocs_runbook_history';

function loadHistory(): RunbookExecution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: RunbookExecution[]): void {
  // Keep only the last 50 executions
  const trimmed = history.slice(-50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function recordExecution(
  runbookId: string,
  title: string,
  status: 'completed' | 'failed',
  steps: RunbookStep[],
  conclusion?: string,
): void {
  const history = loadHistory();
  history.push({
    id: crypto.randomUUID(),
    runbookId,
    title,
    timestamp: new Date().toISOString(),
    status,
    steps: steps.map(s => ({
      label: s.label,
      status: s.status,
      confidence: s.verdict?.confidence,
      explanation: s.verdict?.explanation,
    })),
    conclusion,
  });
  saveHistory(history);
}

export function getRunbookHistory(runbookId: string): RunbookExecution[] {
  return loadHistory().filter(e => e.runbookId === runbookId).reverse();
}

// --- React Component ---

interface RunbookHistoryPanelProps {
  runbookId: string;
  onClose: () => void;
}

export function RunbookHistoryPanel({ runbookId, onClose }: RunbookHistoryPanelProps) {
  const [executions, setExecutions] = useState<RunbookExecution[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setExecutions(getRunbookHistory(runbookId));
  }, [runbookId]);

  if (executions.length === 0) {
    return (
      <div className="runbook-history-panel">
        <div className="runbook-history-header">
          <span className="runbook-history-title">Execution History</span>
          <button className="runbook-history-close" onClick={onClose}>{'\u2715'}</button>
        </div>
        <div className="runbook-history-empty">
          No previous executions found for this runbook.
        </div>
      </div>
    );
  }

  return (
    <div className="runbook-history-panel">
      <div className="runbook-history-header">
        <span className="runbook-history-title">
          Execution History ({executions.length})
        </span>
        <button className="runbook-history-close" onClick={onClose}>{'\u2715'}</button>
      </div>
      <div className="runbook-history-list">
        {executions.map(exec => (
          <div
            key={exec.id}
            className={`runbook-history-item runbook-history-item-${exec.status}`}
          >
            <div
              className="runbook-history-item-header"
              onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
            >
              <span className={`runbook-history-badge runbook-history-badge-${exec.status}`}>
                {exec.status === 'completed' ? '\u2713' : '\u2715'}
              </span>
              <span className="runbook-history-date">
                {new Date(exec.timestamp).toLocaleString()}
              </span>
              <span className="runbook-history-summary">
                {exec.steps.filter(s => s.status === 'passed').length}/{exec.steps.length} passed
              </span>
              <span className="runbook-history-expand">
                {expandedId === exec.id ? '\u25BC' : '\u25B6'}
              </span>
            </div>
            {expandedId === exec.id && (
              <div className="runbook-history-detail">
                {exec.steps.map((s, i) => (
                  <div key={i} className={`runbook-history-step runbook-history-step-${s.status}`}>
                    <span className="runbook-history-step-status">
                      {s.status === 'passed' ? '\u2713' : s.status === 'failed' ? '\u2715' : '\u2192'}
                    </span>
                    <span className="runbook-history-step-label">{s.label}</span>
                    {s.confidence !== undefined && (
                      <span className="runbook-history-step-conf">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    )}
                  </div>
                ))}
                {exec.conclusion && (
                  <div className="runbook-history-conclusion">
                    <strong>Conclusion:</strong> {exec.conclusion}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
