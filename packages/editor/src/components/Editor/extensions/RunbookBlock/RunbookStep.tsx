import { useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { RunbookStep } from '@dardocs/core';

interface RunbookStepItemProps {
  step: RunbookStep;
  index: number;
  isRunning: boolean;
  isEditable: boolean;
  onAction: (stepId: string, action: 'passed' | 'failed' | 'skipped', notes?: string) => void;
  onUpdate: (stepId: string, updates: Partial<RunbookStep>) => void;
  onDelete: (stepId: string) => void;
}

const STATUS_INDICATORS: Record<string, string> = {
  pending: '\u25CB',   // ○
  running: '\u25CF',   // ●
  passed: '\u2713',    // ✓
  failed: '\u2715',    // ✕
  skipped: '\u2192',   // →
};

export function RunbookStepItem({
  step,
  index,
  isRunning,
  isEditable,
  onAction,
  onUpdate,
  onDelete,
}: RunbookStepItemProps) {
  const [notes, setNotes] = useState(step.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(step.label);
  const [editDescription, setEditDescription] = useState(step.description);

  const handleSaveEdit = useCallback(() => {
    if (!editLabel.trim()) return;
    onUpdate(step.id, { label: editLabel.trim(), description: editDescription.trim() });
    setIsEditing(false);
  }, [step.id, editLabel, editDescription, onUpdate]);

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
              {isEditable && (
                <div className="runbook-step-edit-actions">
                  <button
                    className="runbook-step-action-icon"
                    onClick={() => {
                      setEditLabel(step.label);
                      setEditDescription(step.description);
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

        {/* Running state: action buttons */}
        {step.status === 'running' && isRunning && (
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

        {/* Completed state: show result */}
        {(step.status === 'passed' || step.status === 'failed' || step.status === 'skipped') && step.timestamp && (
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
