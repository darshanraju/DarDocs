import { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  FileAddIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import { useTechDocsStore } from '../../stores/techDocsStore';
import {
  TECH_DOCS_USE_MOCK_DATA,
  TECH_DOCS_QUESTIONS,
  QUESTION_ROUNDS,
} from '@dardocs/core';
import type { QAQuestion } from '@dardocs/core';

const lowlight = createLowlight(common);

interface TechDocsTemplateProps {
  onCreateDocument: (content: JSONContent, title: string) => void;
  onCancel: () => void;
}

export function TechDocsTemplate({ onCreateDocument, onCancel }: TechDocsTemplateProps) {
  const {
    config,
    phase,
    progress,
    error,
    answers,
    currentRoundIndex,
    generatedContent,
    generatedTitle,
    setRepo,
    removeRepo,
    updateRepoDescription,
    setPrdContent,
    setFeatureTitle,
    startQA,
    setAnswer,
    nextRound,
    prevRound,
    backToConfig,
    runAnalysis,
    backToQA,
    reset,
  } = useTechDocsStore();

  const subtitles: Record<string, string> = {
    configuring: 'Paste your PM\'s requirement doc, link a repo, and let the agent build your tech design.',
    qa: 'Answer these questions to fill in the gaps the PRD doesn\'t cover.',
    analyzing: 'Analyzing your repo and generating the technical design...',
    preview: 'Preview your generated document. Click "Create Document" to save it to your workspace.',
    error: 'Something went wrong during analysis.',
  };

  return (
    <div className="godmode-page">
      <div className={phase === 'preview' ? 'godmode-container godmode-container-wide' : 'godmode-container'}>
        <div className="godmode-header">
          <div>
            <h1 className="godmode-title">
              {phase === 'preview' ? (generatedTitle || 'Tech Docs') : 'PRD → Tech Design'}
            </h1>
            <p className="godmode-subtitle">
              {subtitles[phase] || ''}
              {TECH_DOCS_USE_MOCK_DATA && (
                <span className="godmode-mock-badge">MOCK DATA</span>
              )}
            </p>
          </div>
          <button className="godmode-cancel-btn" onClick={onCancel}>
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        {phase === 'configuring' && (
          <ConfigurationForm
            config={config}
            onSetRepo={setRepo}
            onRemoveRepo={removeRepo}
            onUpdateRepoDescription={updateRepoDescription}
            onSetPrdContent={setPrdContent}
            onSetFeatureTitle={setFeatureTitle}
            onNext={startQA}
          />
        )}

        {phase === 'qa' && (
          <QAPhase
            answers={answers}
            currentRoundIndex={currentRoundIndex}
            onSetAnswer={setAnswer}
            onNextRound={nextRound}
            onPrevRound={prevRound}
            onBack={backToConfig}
            onGenerate={runAnalysis}
          />
        )}

        {phase === 'analyzing' && (
          <AnalysisProgressView progress={progress} />
        )}

        {phase === 'preview' && generatedContent && (
          <DocumentPreview
            content={generatedContent}
            title={generatedTitle || 'Tech Design'}
            onCreateDocument={() => {
              if (generatedContent && generatedTitle) {
                onCreateDocument(generatedContent, generatedTitle);
              }
            }}
            onBack={backToQA}
          />
        )}

        {phase === 'error' && (
          <ErrorView error={error || 'Unknown error'} onRetry={runAnalysis} onReset={reset} />
        )}
      </div>
    </div>
  );
}

// ─── Configuration Form ───────────────────────────────────────

interface ConfigFormProps {
  config: import('@dardocs/core').TechDocsConfig;
  onSetRepo: (url: string) => void;
  onRemoveRepo: () => void;
  onUpdateRepoDescription: (desc: string) => void;
  onSetPrdContent: (content: string) => void;
  onSetFeatureTitle: (title: string) => void;
  onNext: () => void;
}

function ConfigurationForm({
  config,
  onSetRepo,
  onRemoveRepo,
  onUpdateRepoDescription,
  onSetPrdContent,
  onSetFeatureTitle,
  onNext,
}: ConfigFormProps) {
  const [repoUrl, setRepoUrl] = useState('');

  const handleAddRepo = useCallback(() => {
    if (!repoUrl.trim()) return;
    onSetRepo(repoUrl);
    setRepoUrl('');
  }, [repoUrl, onSetRepo]);

  const canProceed = config.featureTitle.trim() && config.prdContent.trim();

  return (
    <div className="godmode-form">
      {/* Feature Title */}
      <div className="techdocs-section">
        <h3 className="godmode-section-title">Feature Title</h3>
        <input
          type="text"
          placeholder="e.g. User Usage Metrics Export"
          value={config.featureTitle}
          onChange={(e) => onSetFeatureTitle(e.target.value)}
          className="godmode-input"
        />
      </div>

      {/* PRD Content */}
      <div className="techdocs-section">
        <h3 className="godmode-section-title">Paste the PRD / Requirement Doc</h3>
        <p className="techdocs-hint">
          Paste the full text of the product requirement document from your PM.
        </p>
        <textarea
          placeholder="Paste the PRD content here..."
          value={config.prdContent}
          onChange={(e) => onSetPrdContent(e.target.value)}
          className="godmode-textarea techdocs-prd-textarea"
          rows={12}
        />
      </div>

      {/* Repository (optional) */}
      <div className="techdocs-section">
        <h3 className="godmode-section-title">Repository (optional)</h3>
        <p className="techdocs-hint">
          Link the repo so the agent can scan its structure, patterns, and suggest specific file changes.
        </p>

        {config.repo ? (
          <div className="godmode-repo-card">
            <div className="godmode-repo-card-header">
              <div className="godmode-repo-card-info">
                <span className="godmode-role-badge godmode-role-primary">repo</span>
                <span className="godmode-repo-name">{config.repo.owner}/{config.repo.repo}</span>
              </div>
              <button className="godmode-icon-btn" onClick={onRemoveRepo} title="Remove">
                <HugeiconsIcon icon={Delete01Icon} size={16} />
              </button>
            </div>
            <textarea
              className="godmode-textarea godmode-textarea-sm"
              value={config.repo.description}
              onChange={(e) => onUpdateRepoDescription(e.target.value)}
              placeholder="Brief description of what this repo does..."
              rows={2}
            />
          </div>
        ) : (
          <div className="godmode-input-group">
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="godmode-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
            />
            <button
              className="godmode-add-btn"
              onClick={handleAddRepo}
              disabled={!repoUrl.trim()}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Next button */}
      <button
        className="godmode-buidl-btn"
        onClick={onNext}
        disabled={!canProceed}
        title={!canProceed ? 'Enter a feature title and paste the PRD to continue' : ''}
      >
        Continue to Q&A
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
      </button>
    </div>
  );
}

// ─── Q&A Phase ────────────────────────────────────────────────

interface QAPhaseProps {
  answers: import('@dardocs/core').QAAnswer[];
  currentRoundIndex: number;
  onSetAnswer: (questionId: string, answer: string) => void;
  onNextRound: () => void;
  onPrevRound: () => void;
  onBack: () => void;
  onGenerate: () => void;
}

function QAPhase({
  answers,
  currentRoundIndex,
  onSetAnswer,
  onNextRound,
  onPrevRound,
  onBack,
  onGenerate,
}: QAPhaseProps) {
  const rounds = QUESTION_ROUNDS;
  const currentRound = rounds[currentRoundIndex];
  const isLastRound = currentRoundIndex === rounds.length - 1;

  const questionsForRound = TECH_DOCS_QUESTIONS.filter(
    (q) => q.round === currentRound.round,
  );

  const getAnswer = (qId: string) =>
    answers.find((a) => a.questionId === qId)?.answer || '';

  // Check if required questions for this round are answered
  const requiredAnswered = questionsForRound
    .filter((q) => q.required)
    .every((q) => getAnswer(q.id).trim().length > 0);

  return (
    <div className="godmode-form">
      {/* Progress indicator */}
      <div className="techdocs-qa-progress">
        {rounds.map((r, i) => (
          <div
            key={r.round}
            className={`techdocs-qa-step ${i === currentRoundIndex ? 'techdocs-qa-step-active' : ''} ${i < currentRoundIndex ? 'techdocs-qa-step-done' : ''}`}
          >
            <span className="techdocs-qa-step-num">{i + 1}</span>
            <span className="techdocs-qa-step-label">{r.label}</span>
          </div>
        ))}
      </div>

      {/* Round title */}
      <h3 className="godmode-section-title techdocs-round-title">
        Round {currentRoundIndex + 1}: {currentRound.label}
      </h3>

      {/* Questions */}
      <div className="techdocs-questions">
        {questionsForRound.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={getAnswer(q.id)}
            onChange={(val) => onSetAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="techdocs-qa-nav">
        <button
          className="godmode-back-btn"
          onClick={currentRoundIndex === 0 ? onBack : onPrevRound}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          {currentRoundIndex === 0 ? 'Back to config' : 'Previous'}
        </button>

        {isLastRound ? (
          <button
            className="godmode-buidl-btn"
            onClick={onGenerate}
          >
            Generate Tech Doc
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
          </button>
        ) : (
          <button
            className="godmode-buidl-btn"
            onClick={onNextRound}
            disabled={!requiredAnswered}
            title={!requiredAnswered ? 'Answer required questions to continue' : ''}
          >
            Next Round
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: QAQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="techdocs-question">
      <label className="techdocs-question-label">
        {question.question}
        {question.required && <span className="techdocs-required">*</span>}
      </label>
      <p className="techdocs-question-hint">{question.hint}</p>
      <textarea
        className="godmode-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer..."
        rows={3}
      />
    </div>
  );
}

// ─── Document Preview ─────────────────────────────────────────

function DocumentPreview({
  content,
  title,
  onCreateDocument,
  onBack,
}: {
  content: JSONContent;
  title: string;
  onCreateDocument: () => void;
  onBack: () => void;
}) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        CodeBlockLowlight.configure({ lowlight }),
        Link.configure({ openOnClick: false }),
        Underline,
        Highlight,
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
      ],
      content,
      editable: false,
      editorProps: {
        attributes: {
          class: 'prose prose-sm focus:outline-none max-w-none',
        },
      },
    },
    [],
  );

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  return (
    <div className="godmode-preview">
      <div className="godmode-preview-actions">
        <button className="godmode-back-btn" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to Q&A
        </button>
        <button className="godmode-create-btn" onClick={onCreateDocument}>
          <HugeiconsIcon icon={FileAddIcon} size={16} />
          Create Document
        </button>
      </div>

      <div className="godmode-preview-doc">
        <div className="godmode-preview-title">{title}</div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ─── Analysis Progress ────────────────────────────────────────

function AnalysisProgressView({ progress }: { progress: import('@dardocs/core').TechDocsAnalysisProgress | null }) {
  if (!progress) return null;

  return (
    <div className="godmode-progress">
      <div className="godmode-progress-header">
        <span className="godmode-progress-phase">
          {techDocsPhaseLabel(progress.phase)}
        </span>
        <span className="godmode-progress-percent">{progress.percent}%</span>
      </div>
      <div className="godmode-progress-bar">
        <div
          className="godmode-progress-fill"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="godmode-progress-message">{progress.message}</p>
    </div>
  );
}

function techDocsPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    'idle': 'Ready',
    'parsing-prd': 'Parsing PRD',
    'analyzing-repo': 'Analyzing Repository',
    'mapping-changes': 'Mapping Changes',
    'generating-design': 'Generating Design',
    'building-document': 'Building Document',
    'complete': 'Complete',
    'error': 'Error',
  };
  return labels[phase] || phase;
}

// ─── Error View ───────────────────────────────────────────────

function ErrorView({
  error,
  onRetry,
  onReset,
}: {
  error: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="godmode-error">
      <p className="godmode-error-message">{error}</p>
      <div className="godmode-error-actions">
        <button className="godmode-add-btn" onClick={onRetry}>
          Retry
        </button>
        <button className="godmode-text-btn" onClick={onReset}>
          Start over
        </button>
      </div>
    </div>
  );
}
