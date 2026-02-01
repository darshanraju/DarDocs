import { useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, Drag01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { RunbookStep, RunbookStepStatus, RunbookStatus } from '@dardocs/core';
import { createRunbookStep, generateRunbookSummary } from '@dardocs/core';
import { RunbookStepItem } from './RunbookStep';
import { useCommentStore } from '../../../../stores/commentStore';

export function RunbookBlockComponent({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { title, steps, status, conclusion } = node.attrs;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [editingConclusion, setEditingConclusion] = useState(false);
  const [conclusionText, setConclusionText] = useState(conclusion || '');

  const addDocumentComment = useCommentStore(s => s.addDocumentComment);

  const typedSteps: RunbookStep[] = steps || [];
  const typedStatus: RunbookStatus = status || 'idle';

  // --- Title ---
  const handleTitleSave = useCallback(() => {
    updateAttributes({ title: editTitle });
    setIsEditingTitle(false);
  }, [editTitle, updateAttributes]);

  // --- Steps CRUD ---
  const handleAddStep = useCallback(() => {
    if (!newStepLabel.trim()) return;
    const step = createRunbookStep({
      label: newStepLabel.trim(),
      description: newStepDescription.trim(),
    });
    updateAttributes({ steps: [...typedSteps, step] });
    setNewStepLabel('');
    setNewStepDescription('');
    setAddingStep(false);
  }, [newStepLabel, newStepDescription, typedSteps, updateAttributes]);

  const handleDeleteStep = useCallback((stepId: string) => {
    updateAttributes({ steps: typedSteps.filter(s => s.id !== stepId) });
  }, [typedSteps, updateAttributes]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<RunbookStep>) => {
    updateAttributes({
      steps: typedSteps.map(s => s.id === stepId ? { ...s, ...updates } : s),
    });
  }, [typedSteps, updateAttributes]);

  // --- Execution ---
  const handleStartAnalysis = useCallback(() => {
    if (typedSteps.length === 0) return;
    const resetSteps = typedSteps.map(s => ({
      ...s,
      status: 'pending' as RunbookStepStatus,
      output: undefined,
      notes: undefined,
      timestamp: undefined,
    }));
    resetSteps[0].status = 'running';
    updateAttributes({
      steps: resetSteps,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      conclusion: null,
    });
  }, [typedSteps, updateAttributes]);

  const handleStepAction = useCallback((
    stepId: string,
    action: 'passed' | 'failed' | 'skipped',
    notes?: string,
  ) => {
    const stepIndex = typedSteps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const updatedSteps = typedSteps.map((s, i) => {
      if (i === stepIndex) {
        return {
          ...s,
          status: action as RunbookStepStatus,
          notes: notes || s.notes,
          timestamp: new Date().toISOString(),
        };
      }
      return s;
    });

    // Find next pending step and set it to running
    const nextPendingIndex = updatedSteps.findIndex(
      (s, i) => i > stepIndex && s.status === 'pending'
    );

    if (nextPendingIndex !== -1) {
      updatedSteps[nextPendingIndex] = {
        ...updatedSteps[nextPendingIndex],
        status: 'running',
      };
      updateAttributes({ steps: updatedSteps });
    } else {
      // All steps complete
      const hasFailed = updatedSteps.some(s => s.status === 'failed');
      updateAttributes({
        steps: updatedSteps,
        status: hasFailed ? 'failed' : 'completed',
        completedAt: new Date().toISOString(),
      });
    }
  }, [typedSteps, updateAttributes]);

  const handleReset = useCallback(() => {
    const resetSteps = typedSteps.map(s => ({
      ...s,
      status: 'pending' as RunbookStepStatus,
      output: undefined,
      notes: undefined,
      timestamp: undefined,
    }));
    updateAttributes({
      steps: resetSteps,
      status: 'idle',
      startedAt: null,
      completedAt: null,
      conclusion: null,
    });
    setConclusionText('');
  }, [typedSteps, updateAttributes]);

  // --- Conclusion ---
  const handleSaveConclusion = useCallback(() => {
    updateAttributes({ conclusion: conclusionText });
    setEditingConclusion(false);
  }, [conclusionText, updateAttributes]);

  // --- Export ---
  const handleCopyToClipboard = useCallback(() => {
    const summary = generateRunbookSummary(title, typedSteps, conclusion);
    navigator.clipboard.writeText(summary);
  }, [title, typedSteps, conclusion]);

  const handleExportAsComment = useCallback(() => {
    const summary = generateRunbookSummary(title, typedSteps, conclusion);
    addDocumentComment(summary);
  }, [title, typedSteps, conclusion, addDocumentComment]);

  // --- Derived state ---
  const passedCount = typedSteps.filter(s => s.status === 'passed').length;
  const failedCount = typedSteps.filter(s => s.status === 'failed').length;
  const totalCount = typedSteps.length;
  const completedCount = typedSteps.filter(
    s => s.status !== 'pending' && s.status !== 'running'
  ).length;

  return (
    <NodeViewWrapper className="my-4">
      <div className={`runbook-block-wrapper ${selected ? 'is-selected' : ''}`}>
        {/* Drag handle */}
        <div className="embed-drag-handle" data-drag-handle>
          <HugeiconsIcon icon={Drag01Icon} size={16} className="text-gray-400" />
        </div>

        {/* Header */}
        <div className="runbook-header">
          <div className="runbook-header-left">
            <span className="runbook-icon">{'\uD83D\uDCCB'}</span>
            {isEditingTitle ? (
              <input
                className="runbook-title-input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setEditTitle(title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <span
                className="runbook-title"
                onClick={() => {
                  if (typedStatus === 'idle') {
                    setEditTitle(title);
                    setIsEditingTitle(true);
                  }
                }}
              >
                {title}
              </span>
            )}
            <span className={`runbook-status-badge runbook-status-${typedStatus}`}>
              {typedStatus === 'idle' ? 'Ready' :
               typedStatus === 'running' ? 'Running' :
               typedStatus === 'completed' ? 'Completed' : 'Failed'}
            </span>
          </div>
          <div className="runbook-header-actions">
            {typedStatus === 'idle' && typedSteps.length > 0 && (
              <button className="runbook-start-btn" onClick={handleStartAnalysis}>
                {'\u25B6'} Start Analysis
              </button>
            )}
            {typedStatus === 'running' && (
              <button className="runbook-reset-btn" onClick={handleReset}>
                Reset
              </button>
            )}
            {(typedStatus === 'completed' || typedStatus === 'failed') && (
              <>
                <button className="runbook-action-btn" onClick={handleCopyToClipboard}>
                  Copy
                </button>
                <button className="runbook-action-btn" onClick={handleExportAsComment}>
                  Export as Comment
                </button>
                <button className="runbook-reset-btn" onClick={handleReset}>
                  Reset
                </button>
              </>
            )}
            <button
              onClick={deleteNode}
              className="embed-action-btn embed-action-delete"
              title="Remove runbook"
            >
              <HugeiconsIcon icon={Delete01Icon} size={14} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {typedStatus !== 'idle' && totalCount > 0 && (
          <div className="runbook-progress">
            <div className="runbook-progress-bar">
              <div
                className={`runbook-progress-fill ${failedCount > 0 ? 'has-failures' : ''}`}
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="runbook-progress-text">
              {completedCount}/{totalCount} steps
              {passedCount > 0 ? ` \u00B7 ${passedCount} passed` : ''}
              {failedCount > 0 ? ` \u00B7 ${failedCount} failed` : ''}
            </span>
          </div>
        )}

        {/* Steps */}
        <div className="runbook-steps">
          {typedSteps.length === 0 && typedStatus === 'idle' ? (
            <div className="runbook-empty">
              No steps defined. Add steps to build your runbook.
            </div>
          ) : (
            typedSteps.map((step: RunbookStep, index: number) => (
              <RunbookStepItem
                key={step.id}
                step={step}
                index={index}
                isRunning={typedStatus === 'running'}
                isEditable={typedStatus === 'idle'}
                onAction={handleStepAction}
                onUpdate={handleUpdateStep}
                onDelete={handleDeleteStep}
              />
            ))
          )}
        </div>

        {/* Add step button (idle only) */}
        {typedStatus === 'idle' && (
          <div className="runbook-add-step-area">
            {addingStep ? (
              <div className="runbook-add-step-form">
                <input
                  className="runbook-step-input"
                  placeholder="Step name (e.g., Check service health endpoint)"
                  value={newStepLabel}
                  onChange={e => setNewStepLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newStepLabel.trim()) handleAddStep();
                    if (e.key === 'Escape') {
                      setAddingStep(false);
                      setNewStepLabel('');
                      setNewStepDescription('');
                    }
                  }}
                  autoFocus
                />
                <input
                  className="runbook-step-input"
                  placeholder="Description (optional)"
                  value={newStepDescription}
                  onChange={e => setNewStepDescription(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newStepLabel.trim()) handleAddStep();
                    if (e.key === 'Escape') {
                      setAddingStep(false);
                      setNewStepLabel('');
                      setNewStepDescription('');
                    }
                  }}
                />
                <div className="runbook-add-step-actions">
                  <button
                    className="runbook-add-btn"
                    onClick={handleAddStep}
                    disabled={!newStepLabel.trim()}
                  >
                    Add Step
                  </button>
                  <button
                    className="runbook-cancel-btn"
                    onClick={() => {
                      setAddingStep(false);
                      setNewStepLabel('');
                      setNewStepDescription('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="runbook-add-step-btn" onClick={() => setAddingStep(true)}>
                + Add Step
              </button>
            )}
          </div>
        )}

        {/* Conclusion (after completion) */}
        {(typedStatus === 'completed' || typedStatus === 'failed') && (
          <div className="runbook-conclusion">
            <div className="runbook-conclusion-header">
              <span className="runbook-conclusion-label">Conclusion</span>
              {!editingConclusion && (
                <button
                  className="runbook-action-btn"
                  onClick={() => {
                    setConclusionText(conclusion || '');
                    setEditingConclusion(true);
                  }}
                >
                  <HugeiconsIcon icon={PencilEdit01Icon} size={12} />
                  <span>{conclusion ? 'Edit' : 'Add'}</span>
                </button>
              )}
            </div>
            {editingConclusion ? (
              <div className="runbook-conclusion-edit">
                <textarea
                  className="runbook-conclusion-textarea"
                  value={conclusionText}
                  onChange={e => setConclusionText(e.target.value)}
                  placeholder="Summarize the findings and root cause..."
                  autoFocus
                />
                <div className="runbook-add-step-actions">
                  <button className="runbook-add-btn" onClick={handleSaveConclusion}>
                    Save
                  </button>
                  <button
                    className="runbook-cancel-btn"
                    onClick={() => setEditingConclusion(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : conclusion ? (
              <p className="runbook-conclusion-text">{conclusion}</p>
            ) : (
              <p className="runbook-conclusion-placeholder">
                No conclusion added yet. Click "Add" to summarize findings.
              </p>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
