import { useState, useCallback, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, Drag01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { RunbookStep, RunbookStepStatus, RunbookStatus } from '@dardocs/core';
import { createRunbookStep, generateRunbookSummary } from '@dardocs/core';
import { RunbookStepItem } from './RunbookStep';
import { useCommentStore } from '../../../../stores/commentStore';
import { useWorkspaceConfigStore } from '../../../../stores/workspaceConfigStore';
import { useRunbookExecution } from '../../../../hooks/useRunbookExecution';
import { STEP_TEMPLATES, TEMPLATE_CATEGORIES, createStepFromTemplate } from './StepTemplates';
import { RunbookHistoryPanel, recordExecution } from './RunbookHistory';
import { RoadmapTooltip } from '../../../UI/RoadmapTooltip';

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
  const [executionMode, setExecutionMode] = useState<'manual' | 'auto'>('manual');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInlineAiSetup, setShowInlineAiSetup] = useState(false);
  const [inlineApiKey, setInlineApiKey] = useState('');
  const [inlineProvider, setInlineProvider] = useState<'anthropic' | 'openai'>('anthropic');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addDocumentComment = useCommentStore(s => s.addDocumentComment);
  const workspaceConfig = useWorkspaceConfigStore(s => s.config);
  const updateAIConfig = useWorkspaceConfigStore(s => s.updateAIConfig);
  const execution = useRunbookExecution();

  const processedStartsRef = useRef<Set<string>>(new Set());
  const processedCompletionsRef = useRef<Set<string>>(new Set());

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

  const handleAddFromTemplate = useCallback((templateIndex: number) => {
    const template = STEP_TEMPLATES[templateIndex];
    if (!template) return;
    const step = createStepFromTemplate(template);
    updateAttributes({ steps: [...typedSteps, step] });
    setShowTemplates(false);
  }, [typedSteps, updateAttributes]);

  const handleDeleteStep = useCallback((stepId: string) => {
    updateAttributes({ steps: typedSteps.filter(s => s.id !== stepId) });
  }, [typedSteps, updateAttributes]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<RunbookStep>) => {
    updateAttributes({
      steps: typedSteps.map(s => s.id === stepId ? { ...s, ...updates } : s),
    });
  }, [typedSteps, updateAttributes]);

  // --- Drag and Drop Reorder ---
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const newSteps = [...typedSteps];
    const [moved] = newSteps.splice(dragIndex, 1);
    newSteps.splice(dropIndex, 0, moved);
    updateAttributes({ steps: newSteps });
  }, [typedSteps, updateAttributes]);

  // --- Manual Execution ---
  const handleStartAnalysis = useCallback(() => {
    if (typedSteps.length === 0) return;
    setExecutionMode('manual');
    const resetSteps = typedSteps.map(s => ({
      ...s,
      status: 'pending' as RunbookStepStatus,
      output: undefined,
      notes: undefined,
      timestamp: undefined,
      verdict: undefined,
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
      const hasFailed = updatedSteps.some(s => s.status === 'failed');
      const finalStatus = hasFailed ? 'failed' : 'completed';
      updateAttributes({
        steps: updatedSteps,
        status: finalStatus,
        completedAt: new Date().toISOString(),
      });
      recordExecution(node.attrs.runbookId, title, finalStatus as 'completed' | 'failed', updatedSteps);
    }
  }, [typedSteps, updateAttributes, node.attrs.runbookId, title]);

  // --- Auto Execution (AI) ---
  const handleAutoExecute = useCallback(() => {
    if (typedSteps.length === 0) return;

    const aiConfig = workspaceConfig?.ai;
    if (!aiConfig?.apiKey) {
      setShowInlineAiSetup(true);
      return;
    }

    processedStartsRef.current = new Set();
    processedCompletionsRef.current = new Set();
    setExecutionMode('auto');

    const resetSteps = typedSteps.map(s => ({
      ...s,
      status: 'pending' as RunbookStepStatus,
      output: undefined,
      notes: undefined,
      timestamp: undefined,
      verdict: undefined,
    }));

    updateAttributes({
      steps: resetSteps,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      conclusion: null,
    });

    const providerCreds: Record<string, Record<string, unknown>> = {};
    if (workspaceConfig?.providers) {
      for (const [key, val] of Object.entries(workspaceConfig.providers)) {
        if (val) providerCreds[key] = val as Record<string, unknown>;
      }
    }

    execution.executeRunbook(node.attrs.runbookId, title, resetSteps, {
      aiProvider: aiConfig.provider,
      aiApiKey: aiConfig.apiKey,
      aiModel: aiConfig.model,
      providers: providerCreds,
    });
  }, [typedSteps, title, node.attrs.runbookId, updateAttributes, execution, workspaceConfig]);

  // Inline AI setup save
  const handleSaveInlineAi = useCallback(async () => {
    if (!inlineApiKey.trim()) return;
    await updateAIConfig({ provider: inlineProvider, apiKey: inlineApiKey.trim() });
    setShowInlineAiSetup(false);
    setInlineApiKey('');
  }, [inlineApiKey, inlineProvider, updateAIConfig]);

  // Sync auto-execution step progress
  useEffect(() => {
    if (executionMode !== 'auto') return;

    let needsUpdate = false;
    let updatedSteps = [...typedSteps];

    for (const [stepId, execStep] of execution.steps) {
      if (execStep.status !== 'waiting' && !processedStartsRef.current.has(stepId)) {
        processedStartsRef.current.add(stepId);
        updatedSteps = updatedSteps.map(s =>
          s.id === stepId ? { ...s, status: 'running' as RunbookStepStatus } : s
        );
        needsUpdate = true;
      }

      if (execStep.status === 'completed' && execStep.verdict && !processedCompletionsRef.current.has(stepId)) {
        processedCompletionsRef.current.add(stepId);
        updatedSteps = updatedSteps.map(s =>
          s.id === stepId ? {
            ...s,
            status: execStep.verdict!.status as RunbookStepStatus,
            verdict: execStep.verdict,
            timestamp: new Date().toISOString(),
            notes: execStep.verdict!.explanation,
          } : s
        );
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updateAttributes({ steps: updatedSteps });
    }
  }, [executionMode, execution.steps, typedSteps, updateAttributes]);

  // Sync auto-execution completion
  useEffect(() => {
    if (executionMode !== 'auto') return;

    if (execution.conclusion && execution.overallStatus) {
      updateAttributes({
        status: execution.overallStatus,
        completedAt: new Date().toISOString(),
        conclusion: execution.conclusion,
      });
      setConclusionText(execution.conclusion);
      recordExecution(node.attrs.runbookId, title, execution.overallStatus, typedSteps, execution.conclusion);
      setExecutionMode('manual');
    }

    if (execution.error && !execution.isExecuting) {
      updateAttributes({
        status: 'failed',
        completedAt: new Date().toISOString(),
        conclusion: `Auto-execution error: ${execution.error}`,
      });
      setConclusionText(`Auto-execution error: ${execution.error}`);
      recordExecution(node.attrs.runbookId, title, 'failed', typedSteps, `Error: ${execution.error}`);
      setExecutionMode('manual');
    }
  }, [execution.conclusion, execution.overallStatus, execution.error, execution.isExecuting, executionMode, updateAttributes, node.attrs.runbookId, title, typedSteps]);

  const handleReset = useCallback(() => {
    if (executionMode === 'auto' && execution.isExecuting) {
      execution.cancelExecution(node.attrs.runbookId);
    }
    const resetSteps = typedSteps.map(s => ({
      ...s,
      status: 'pending' as RunbookStepStatus,
      output: undefined,
      notes: undefined,
      timestamp: undefined,
      verdict: undefined,
    }));
    updateAttributes({
      steps: resetSteps,
      status: 'idle',
      startedAt: null,
      completedAt: null,
      conclusion: null,
    });
    setConclusionText('');
    setExecutionMode('manual');
    processedStartsRef.current = new Set();
    processedCompletionsRef.current = new Set();
  }, [typedSteps, updateAttributes, executionMode, execution, node.attrs.runbookId]);

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
  const hasAiConfig = !!workspaceConfig?.ai?.apiKey;
  const isAutoRunning = executionMode === 'auto' && typedStatus === 'running';

  return (
    <NodeViewWrapper className="my-4 relative">
      <RoadmapTooltip blockName="runbookBlock" />
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
               typedStatus === 'running' ? (isAutoRunning ? 'AI Running' : 'Running') :
               typedStatus === 'completed' ? 'Completed' : 'Failed'}
            </span>
          </div>
          <div className="runbook-header-actions">
            {typedStatus === 'idle' && typedSteps.length > 0 && (
              <>
                <button className="runbook-start-btn" onClick={handleStartAnalysis}>
                  {'\u25B6'} Manual
                </button>
                <button
                  className="runbook-auto-btn"
                  onClick={handleAutoExecute}
                  title={hasAiConfig ? 'Run with AI agent' : 'Configure AI to get started'}
                >
                  {'\u2728'} AI Execute
                </button>
              </>
            )}
            {typedStatus === 'running' && (
              <button className="runbook-reset-btn" onClick={handleReset}>
                {isAutoRunning ? 'Cancel' : 'Reset'}
              </button>
            )}
            {(typedStatus === 'completed' || typedStatus === 'failed') && (
              <>
                <button className="runbook-action-btn" onClick={() => setShowHistory(true)}>
                  History
                </button>
                <button className="runbook-action-btn" onClick={handleCopyToClipboard}>
                  Copy
                </button>
                <button className="runbook-action-btn" onClick={handleExportAsComment}>
                  Export
                </button>
                <button className="runbook-reset-btn" onClick={handleReset}>
                  Reset
                </button>
              </>
            )}
            {typedStatus === 'idle' && (
              <button className="runbook-action-btn" onClick={() => setShowHistory(true)} title="View execution history">
                History
              </button>
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

        {/* Inline AI Setup */}
        {showInlineAiSetup && (
          <div className="runbook-inline-ai-setup">
            <div className="runbook-inline-ai-header">
              <span>Configure AI to use AI Execute</span>
              <button className="runbook-cancel-btn" onClick={() => setShowInlineAiSetup(false)}>{'\u2715'}</button>
            </div>
            <div className="runbook-inline-ai-form">
              <select
                className="runbook-step-select"
                value={inlineProvider}
                onChange={e => setInlineProvider(e.target.value as 'anthropic' | 'openai')}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
              </select>
              <input
                className="runbook-step-input"
                type="password"
                placeholder="API Key"
                value={inlineApiKey}
                onChange={e => setInlineApiKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveInlineAi(); }}
              />
              <button className="runbook-add-btn" onClick={handleSaveInlineAi} disabled={!inlineApiKey.trim()}>
                Save & Continue
              </button>
            </div>
          </div>
        )}

        {/* Execution history panel */}
        {showHistory && (
          <RunbookHistoryPanel
            runbookId={node.attrs.runbookId}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* AI execution error */}
        {execution.error && typedStatus === 'running' && (
          <div className="runbook-execution-error">
            {execution.error}
          </div>
        )}

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
              No steps defined. Add steps or use a template to get started.
            </div>
          ) : (
            typedSteps.map((step: RunbookStep, index: number) => (
              <div
                key={step.id}
                className={`runbook-step-drag-wrapper ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable={typedStatus === 'idle'}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, index)}
              >
                <RunbookStepItem
                  step={step}
                  index={index}
                  isRunning={typedStatus === 'running'}
                  isEditable={typedStatus === 'idle'}
                  isAutoMode={isAutoRunning}
                  executionState={execution.steps.get(step.id)}
                  onAction={handleStepAction}
                  onUpdate={handleUpdateStep}
                  onDelete={handleDeleteStep}
                />
              </div>
            ))
          )}
        </div>

        {/* Add step area (idle only) */}
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
                  <button className="runbook-add-btn" onClick={handleAddStep} disabled={!newStepLabel.trim()}>
                    Add Step
                  </button>
                  <button className="runbook-cancel-btn" onClick={() => { setAddingStep(false); setNewStepLabel(''); setNewStepDescription(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : showTemplates ? (
              <div className="runbook-templates-panel">
                <div className="runbook-templates-header">
                  <span className="runbook-templates-title">Step Templates</span>
                  <button className="runbook-cancel-btn" onClick={() => setShowTemplates(false)}>{'\u2715'}</button>
                </div>
                {TEMPLATE_CATEGORIES.map(category => (
                  <div key={category} className="runbook-template-category">
                    <span className="runbook-template-category-label">{category}</span>
                    <div className="runbook-template-list">
                      {STEP_TEMPLATES.map((template, i) =>
                        template.category === category ? (
                          <button
                            key={i}
                            className="runbook-template-item"
                            onClick={() => handleAddFromTemplate(i)}
                          >
                            <span className="runbook-template-name">{template.name}</span>
                            <span className="runbook-template-desc">{template.description}</span>
                            {template.step.automation?.connector && (
                              <span className="runbook-step-connector-badge">{template.step.automation.connector}</span>
                            )}
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="runbook-add-step-buttons">
                <button className="runbook-add-step-btn" onClick={() => setAddingStep(true)}>
                  + Add Step
                </button>
                <button className="runbook-add-step-btn runbook-template-btn" onClick={() => setShowTemplates(true)}>
                  + From Template
                </button>
              </div>
            )}
          </div>
        )}

        {/* Conclusion */}
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
                  <button className="runbook-add-btn" onClick={handleSaveConclusion}>Save</button>
                  <button className="runbook-cancel-btn" onClick={() => setEditingConclusion(false)}>Cancel</button>
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
