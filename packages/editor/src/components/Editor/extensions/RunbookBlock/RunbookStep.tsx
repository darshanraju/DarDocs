import { useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { RunbookStep, StepAutomation } from '@dardocs/core';
import type { StepExecutionState } from '../../../../hooks/useRunbookExecution';
import { QueryTestPanel } from './QueryTestPanel';

interface RunbookStepItemProps {
  step: RunbookStep;
  index: number;
  isRunning: boolean;
  isEditable: boolean;
  isAutoMode?: boolean;
  executionState?: StepExecutionState;
  onAction: (stepId: string, action: 'passed' | 'failed' | 'skipped', notes?: string) => void;
  onUpdate: (stepId: string, updates: Partial<RunbookStep>) => void;
  onDelete: (stepId: string) => void;
}

const STATUS_INDICATORS: Record<string, string> = {
  pending: '\u25CB',   // open circle
  running: '\u25CF',   // filled circle
  passed: '\u2713',    // checkmark
  failed: '\u2715',    // x mark
  skipped: '\u2192',   // arrow
};

const CONNECTOR_OPTIONS = [
  { value: '', label: 'None (AI only)' },
  { value: 'grafana', label: 'Grafana' },
  { value: 'datadog', label: 'Datadog' },
  { value: 'sentry', label: 'Sentry' },
  { value: 'cloudwatch', label: 'AWS CloudWatch' },
  { value: 'prometheus', label: 'Prometheus' },
  { value: 'pagerduty', label: 'PagerDuty' },
  { value: 'http', label: 'HTTP Endpoint' },
];

export function RunbookStepItem({
  step,
  index,
  isRunning,
  isEditable,
  isAutoMode,
  executionState,
  onAction,
  onUpdate,
  onDelete,
}: RunbookStepItemProps) {
  const [notes, setNotes] = useState(step.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(step.label);
  const [editDescription, setEditDescription] = useState(step.description);
  const [editConnector, setEditConnector] = useState(step.automation?.connector || '');
  const [editQuery, setEditQuery] = useState(step.automation?.query || '');
  const [editTimeRange, setEditTimeRange] = useState(step.automation?.timeRange || '1h');
  const [showAutomation, setShowAutomation] = useState(!!step.automation?.connector);
  const [showQueryTest, setShowQueryTest] = useState(false);

  const handleSaveEdit = useCallback(() => {
    if (!editLabel.trim()) return;

    const automation: StepAutomation | undefined =
      editConnector && editQuery
        ? {
            connector: editConnector,
            query: editQuery,
            timeRange: editTimeRange || undefined,
          }
        : undefined;

    onUpdate(step.id, {
      label: editLabel.trim(),
      description: editDescription.trim(),
      automation,
    });
    setIsEditing(false);
  }, [step.id, editLabel, editDescription, editConnector, editQuery, editTimeRange, onUpdate]);

  return (
    <div className={`runbook-step runbook-step-${step.status}`}>
      <div className="runbook-step-indicator">
        <span className={`runbook-step-icon runbook-step-icon-${step.status}`}>
          {STATUS_INDICATORS[step.status] || STATUS_INDICATORS.pending}
        </span>
      </div>
      <div className="runbook-step-content">
        {isEditing ? (
          <div className="runbook-step-edit">
            <input
              className="runbook-step-input"
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              placeholder="Step name"
              autoFocus
            />
            <input
              className="runbook-step-input"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              placeholder="Description (optional)"
            />

            {/* Automation config toggle */}
            <button
              className="runbook-automation-toggle"
              onClick={() => setShowAutomation(!showAutomation)}
              type="button"
            >
              {showAutomation ? '\u25BC' : '\u25B6'} Connector Config
            </button>

            {showAutomation && (
              <div className="runbook-automation-config">
                <select
                  className="runbook-step-select"
                  value={editConnector}
                  onChange={e => setEditConnector(e.target.value)}
                >
                  {CONNECTOR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {editConnector && (
                  <>
                    <input
                      className="runbook-step-input"
                      value={editQuery}
                      onChange={e => setEditQuery(e.target.value)}
                      placeholder={
                        editConnector === 'grafana' ? 'PromQL query or /api/... path' :
                        editConnector === 'datadog' ? 'Datadog metric query' :
                        editConnector === 'sentry' ? 'Issue search query or /api/... path' :
                        editConnector === 'cloudwatch' ? 'MetricName e.g. CPUUtilization' :
                        editConnector === 'prometheus' ? 'PromQL expression' :
                        editConnector === 'pagerduty' ? 'incidents, oncall, or search query' :
                        'Full URL to query'
                      }
                    />
                    <div className="runbook-automation-row">
                      <input
                        className="runbook-step-input runbook-step-input-sm"
                        value={editTimeRange}
                        onChange={e => setEditTimeRange(e.target.value)}
                        placeholder="Time range (e.g. 15m, 1h, 24h)"
                      />
                      {editQuery && (
                        <button
                          type="button"
                          className="runbook-test-query-btn"
                          onClick={() => setShowQueryTest(true)}
                        >
                          Test Query
                        </button>
                      )}
                    </div>
                    {showQueryTest && (
                      <QueryTestPanel
                        connector={editConnector}
                        query={editQuery}
                        timeRange={editTimeRange}
                        onClose={() => setShowQueryTest(false)}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            <div className="runbook-add-step-actions">
              <button className="runbook-add-btn" onClick={handleSaveEdit}>Save</button>
              <button className="runbook-cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="runbook-step-header">
              <span className="runbook-step-number">Step {index + 1}</span>
              <span className="runbook-step-label">{step.label}</span>
              {step.automation?.connector && (
                <span className="runbook-step-connector-badge">
                  {step.automation.connector}
                </span>
              )}
              {isEditable && (
                <div className="runbook-step-edit-actions">
                  <button
                    className="runbook-step-action-icon"
                    onClick={() => {
                      setEditLabel(step.label);
                      setEditDescription(step.description);
                      setEditConnector(step.automation?.connector || '');
                      setEditQuery(step.automation?.query || '');
                      setEditTimeRange(step.automation?.timeRange || '1h');
                      setShowAutomation(!!step.automation?.connector);
                      setIsEditing(true);
                    }}
                    title="Edit step"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} size={12} />
                  </button>
                  <button
                    className="runbook-step-action-icon runbook-step-delete"
                    onClick={() => onDelete(step.id)}
                    title="Delete step"
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={12} />
                  </button>
                </div>
              )}
            </div>
            {step.description && (
              <p className="runbook-step-description">{step.description}</p>
            )}
          </>
        )}

        {/* AI execution streaming data */}
        {isAutoMode && executionState && executionState.status !== 'completed' && executionState.status !== 'waiting' && (
          <div className="runbook-step-ai-progress">
            {executionState.dataMessages.map((msg, i) => (
              <div key={i} className="runbook-step-ai-message">
                <span className={`runbook-ai-source runbook-ai-source-${executionState.status}`}>
                  {executionState.status === 'analyzing' ? 'AI' : 'Data'}
                </span>
                <span className="runbook-ai-text">{msg}</span>
              </div>
            ))}
            <div className="runbook-step-ai-loading">
              <span className="runbook-ai-spinner" />
              {executionState.status === 'gathering' ? 'Gathering data...' : 'AI analyzing...'}
            </div>
          </div>
        )}

        {/* Running state: manual action buttons */}
        {step.status === 'running' && isRunning && !isAutoMode && (
          <div className="runbook-step-action-area">
            <input
              className="runbook-step-notes-input"
              placeholder="Notes (optional)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="runbook-step-buttons">
              <button
                className="runbook-btn-pass"
                onClick={() => onAction(step.id, 'passed', notes)}
              >
                {'\u2713'} Pass
              </button>
              <button
                className="runbook-btn-fail"
                onClick={() => onAction(step.id, 'failed', notes)}
              >
                {'\u2715'} Fail
              </button>
              <button
                className="runbook-btn-skip"
                onClick={() => onAction(step.id, 'skipped', notes)}
              >
                {'\u2192'} Skip
              </button>
            </div>
          </div>
        )}

        {/* AI verdict display */}
        {step.verdict && (
          <div className="runbook-step-verdict">
            <div className="runbook-verdict-header">
              <span className={`runbook-verdict-status runbook-verdict-${step.verdict.status}`}>
                {step.verdict.status.toUpperCase()}
              </span>
              <span className="runbook-verdict-confidence">
                {Math.round(step.verdict.confidence * 100)}% confidence
              </span>
            </div>
            <p className="runbook-verdict-explanation">{step.verdict.explanation}</p>
            {step.verdict.suggestions && step.verdict.suggestions.length > 0 && (
              <div className="runbook-verdict-suggestions">
                <span className="runbook-verdict-suggestions-label">Suggestions:</span>
                <ul>
                  {step.verdict.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {step.verdict.rawData && (
              <details className="runbook-verdict-raw">
                <summary>Raw data</summary>
                <pre>{step.verdict.rawData}</pre>
              </details>
            )}
          </div>
        )}

        {/* Completed state: show result (for manual mode without verdict) */}
        {!step.verdict && (step.status === 'passed' || step.status === 'failed' || step.status === 'skipped') && step.timestamp && (
          <div className="runbook-step-result">
            {step.notes && <p className="runbook-step-notes">{step.notes}</p>}
            <span className="runbook-step-timestamp">
              {new Date(step.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
