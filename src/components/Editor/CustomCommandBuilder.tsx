import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Globe,
  Code2,
  Bug,
  Database,
  Zap,
  Play,
  Eye,
  Sparkles,
  LayoutGrid,
  Table2,
  BarChart3,
  FileCode2,
  List,
} from 'lucide-react';
import {
  useCustomCommandStore,
  COMMAND_TEMPLATES,
  type CommandType,
  type DisplayMode,
  type CustomCommandDraft,
  type CustomCommand,
} from '../../stores/customCommandStore';
import type { Editor } from '@tiptap/react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CustomCommandBuilderProps {
  editor: Editor | null;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const EMPTY_DRAFT: CustomCommandDraft = {
  name: '',
  description: '',
  icon: '⚡',
  keywords: [],
  type: 'api_fetch',
  config: { url: '', method: 'GET', headers: '{}' },
  displayMode: 'auto',
  customTemplate: '',
  schedule: { enabled: false, intervalSeconds: 60 },
};

const TYPE_OPTIONS: {
  value: CommandType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: 'api_fetch',
    label: 'API Fetch',
    desc: 'HTTP request to any REST / GraphQL endpoint',
    icon: <Globe className="w-5 h-5" />,
    color: '#3370ff',
  },
  {
    value: 'javascript',
    label: 'JavaScript',
    desc: 'Run custom JS that returns data',
    icon: <Code2 className="w-5 h-5" />,
    color: '#eab308',
  },
  {
    value: 'web_scraper',
    label: 'Web Scraper',
    desc: 'Extract data from a page via CSS selectors',
    icon: <Bug className="w-5 h-5" />,
    color: '#7c3aed',
  },
  {
    value: 'static_data',
    label: 'Static Data',
    desc: 'Hard-coded JSON displayed as a card',
    icon: <Database className="w-5 h-5" />,
    color: '#00b386',
  },
];

const DISPLAY_OPTIONS: {
  value: DisplayMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'auto', label: 'Auto-detect', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'key_value', label: 'Key / Value', icon: <List className="w-4 h-4" /> },
  { value: 'metric', label: 'Big Metric', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'table', label: 'Table', icon: <Table2 className="w-4 h-4" /> },
  { value: 'custom', label: 'Custom HTML', icon: <FileCode2 className="w-4 h-4" /> },
];

const ICON_PRESETS = ['⚡', '📊', '🔌', '🕐', '🟢', '📋', '📌', '🕷️', '⏳', '🚀', '🔥', '💡', '🎯', '🧪', '📡', '🗃️'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CustomCommandBuilder({ editor }: CustomCommandBuilderProps) {
  const { builderOpen, editingCommandId, closeBuilder, addCommand, updateCommand, getCommand } =
    useCustomCommandStore();

  const [step, setStep] = useState(0); // 0 = template picker, 1 = type + basics, 2 = source, 3 = display & save
  const [draft, setDraft] = useState<CustomCommandDraft>({ ...EMPTY_DRAFT });
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [keywordsText, setKeywordsText] = useState('');

  // Reset when builder opens
  useEffect(() => {
    if (builderOpen) {
      if (editingCommandId) {
        const existing = getCommand(editingCommandId);
        if (existing) {
          setDraft({ ...existing });
          setKeywordsText(existing.keywords.join(', '));
          setStep(1); // Skip template picker on edit
          return;
        }
      }
      setDraft({ ...EMPTY_DRAFT });
      setKeywordsText('');
      setPreviewData(null);
      setPreviewError(null);
      setStep(0);
    }
  }, [builderOpen, editingCommandId, getCommand]);

  const patch = useCallback(
    (updates: Partial<CustomCommandDraft>) =>
      setDraft((prev) => ({ ...prev, ...updates })),
    []
  );

  const patchConfig = useCallback(
    (updates: Partial<CustomCommandDraft['config']>) =>
      setDraft((prev) => ({
        ...prev,
        config: { ...prev.config, ...updates },
      })),
    []
  );

  const handleApplyTemplate = useCallback(
    (tpl: (typeof COMMAND_TEMPLATES)[number]) => {
      const merged: CustomCommandDraft = {
        ...EMPTY_DRAFT,
        ...tpl.draft,
        config: { ...EMPTY_DRAFT.config, ...tpl.draft.config },
        schedule: { ...EMPTY_DRAFT.schedule, ...tpl.draft.schedule },
      };
      setDraft(merged);
      setKeywordsText((merged.keywords || []).join(', '));
      setStep(1);
    },
    []
  );

  const handleRunPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const now = new Date().toISOString();
      const fakeCommand: CustomCommand = {
        ...draft,
        id: 'preview',
        createdAt: now,
        updatedAt: now,
      };
      // Same execute logic
      let result: unknown;
      switch (fakeCommand.type) {
        case 'api_fetch': {
          const headers: Record<string, string> = {};
          try {
            Object.assign(headers, JSON.parse(fakeCommand.config.headers || '{}'));
          } catch { /* ignore */ }
          const init: RequestInit = {
            method: fakeCommand.config.method || 'GET',
            headers,
          };
          if (init.method !== 'GET' && fakeCommand.config.body) {
            init.body = fakeCommand.config.body;
          }
          const res = await fetch(fakeCommand.config.url || '', init);
          result = await res.json();
          break;
        }
        case 'javascript': {
          const wrapped = `return (async () => { ${fakeCommand.config.code || 'return {}'} })()`;
          const fn = new Function(wrapped);
          result = await fn();
          break;
        }
        case 'web_scraper':
          result = {
            _message: 'Scraper preview — a CORS proxy is needed for real scraping.',
            url: fakeCommand.config.scrapeUrl,
          };
          break;
        case 'static_data':
          result = JSON.parse(fakeCommand.config.staticData || '{}');
          break;
      }
      setPreviewData(result);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewLoading(false);
    }
  }, [draft]);

  const handleSave = useCallback(() => {
    const finalDraft: CustomCommandDraft = {
      ...draft,
      keywords: keywordsText
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    };

    if (editingCommandId) {
      updateCommand(editingCommandId, finalDraft);
      // Update any existing blocks in the doc that use this command
      if (editor) {
        const updatedCommand = getCommand(editingCommandId);
        if (updatedCommand) {
          const configStr = JSON.stringify(updatedCommand);
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'customCommandBlock') {
              try {
                const blockCmd = JSON.parse(node.attrs.commandConfig);
                if (blockCmd.id === editingCommandId) {
                  editor.view.dispatch(
                    editor.state.tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      commandConfig: configStr,
                    })
                  );
                }
              } catch { /* skip */ }
            }
          });
        }
      }
    } else {
      const saved = addCommand(finalDraft);
      // Insert block into document
      if (editor) {
        editor
          .chain()
          .focus()
          .insertCustomCommand({ commandConfig: JSON.stringify(saved) })
          .run();
      }
    }

    closeBuilder();
  }, [draft, keywordsText, editingCommandId, editor, addCommand, updateCommand, getCommand, closeBuilder]);

  // Close on Escape
  useEffect(() => {
    if (!builderOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBuilder();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [builderOpen, closeBuilder]);

  if (!builderOpen) return null;

  const isEdit = !!editingCommandId;
  const totalSteps = 4;
  const canNext =
    step === 0 ||
    (step === 1 && draft.name.trim().length > 0) ||
    step === 2 ||
    step === 3;

  return (
    <div className="ccb-builder-overlay" onClick={closeBuilder}>
      <div
        className="ccb-builder"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="ccb-builder-topbar">
          <div className="ccb-builder-title">
            <Zap className="w-4 h-4" style={{ color: '#3370ff' }} />
            {isEdit ? 'Edit Custom Command' : 'Create Custom Command'}
          </div>
          <button className="ccb-builder-close" onClick={closeBuilder}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="ccb-builder-progress">
          {['Templates', 'Basics', 'Data Source', 'Display & Save'].map(
            (label, i) => (
              <div
                key={label}
                className={`ccb-builder-step ${i === step ? 'active' : ''} ${
                  i < step ? 'done' : ''
                }`}
                onClick={() => {
                  if (i < step || (i === 0 && !isEdit)) setStep(i);
                }}
              >
                <span className="ccb-builder-step-num">{i + 1}</span>
                <span className="ccb-builder-step-label">{label}</span>
              </div>
            )
          )}
        </div>

        {/* Body */}
        <div className="ccb-builder-body">
          {step === 0 && <StepTemplates onPick={handleApplyTemplate} onBlank={() => setStep(1)} />}
          {step === 1 && (
            <StepBasics
              draft={draft}
              patch={patch}
              keywordsText={keywordsText}
              setKeywordsText={setKeywordsText}
            />
          )}
          {step === 2 && <StepSource draft={draft} patchConfig={patchConfig} patch={patch} />}
          {step === 3 && (
            <StepDisplay
              draft={draft}
              patch={patch}
              previewData={previewData}
              previewError={previewError}
              previewLoading={previewLoading}
              onRunPreview={handleRunPreview}
            />
          )}
        </div>

        {/* Footer */}
        <div className="ccb-builder-footer">
          {step > 0 && (
            <button
              className="ccb-builder-btn ccb-builder-btn-secondary"
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < totalSteps - 1 ? (
            <button
              className="ccb-builder-btn ccb-builder-btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="ccb-builder-btn ccb-builder-btn-primary"
              onClick={handleSave}
              disabled={!draft.name.trim()}
            >
              <Zap className="w-4 h-4" />
              {isEdit ? 'Update Command' : 'Create & Insert'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Step 0 – Template picker
// ===========================================================================
function StepTemplates({
  onPick,
  onBlank,
}: {
  onPick: (t: (typeof COMMAND_TEMPLATES)[number]) => void;
  onBlank: () => void;
}) {
  return (
    <div className="ccb-step">
      <div className="ccb-step-heading">Start from a template or build from scratch</div>
      <div className="ccb-templates-grid">
        {/* Blank card */}
        <button className="ccb-template-card ccb-template-blank" onClick={onBlank}>
          <div className="ccb-template-icon">✨</div>
          <div className="ccb-template-label">Blank Command</div>
          <div className="ccb-template-desc">Start from scratch</div>
        </button>

        {COMMAND_TEMPLATES.map((tpl) => (
          <button
            key={tpl.label}
            className="ccb-template-card"
            onClick={() => onPick(tpl)}
          >
            <div className="ccb-template-icon">
              {tpl.draft.icon || '⚡'}
            </div>
            <div className="ccb-template-label">{tpl.label}</div>
            <div className="ccb-template-desc">{tpl.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Step 1 – Basics + type selection
// ===========================================================================
function StepBasics({
  draft,
  patch,
  keywordsText,
  setKeywordsText,
}: {
  draft: CustomCommandDraft;
  patch: (u: Partial<CustomCommandDraft>) => void;
  keywordsText: string;
  setKeywordsText: (v: string) => void;
}) {
  return (
    <div className="ccb-step">
      <div className="ccb-step-heading">Command basics</div>

      {/* Name + Icon */}
      <div className="ccb-field-row">
        <div className="ccb-field" style={{ flex: 1 }}>
          <label className="ccb-label">Name</label>
          <input
            className="ccb-input"
            placeholder="e.g. GitHub Stats"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
        <div className="ccb-field" style={{ width: 120 }}>
          <label className="ccb-label">Icon</label>
          <div className="ccb-icon-picker">
            <input
              className="ccb-input"
              value={draft.icon}
              onChange={(e) => patch({ icon: e.target.value })}
              style={{ width: 50, textAlign: 'center', fontSize: '1.1rem' }}
            />
            <div className="ccb-icon-presets">
              {ICON_PRESETS.map((ic) => (
                <button
                  key={ic}
                  className={`ccb-icon-preset ${draft.icon === ic ? 'active' : ''}`}
                  onClick={() => patch({ icon: ic })}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="ccb-field">
        <label className="ccb-label">Description</label>
        <input
          className="ccb-input"
          placeholder="Short description shown in the card header"
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      {/* Keywords */}
      <div className="ccb-field">
        <label className="ccb-label">
          Slash-menu keywords{' '}
          <span className="ccb-label-hint">(comma-separated)</span>
        </label>
        <input
          className="ccb-input"
          placeholder="e.g. github, stats, repo"
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
        />
      </div>

      {/* Type selection */}
      <div className="ccb-field">
        <label className="ccb-label">Command type</label>
        <div className="ccb-type-grid">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`ccb-type-card ${draft.type === opt.value ? 'active' : ''}`}
              onClick={() => patch({ type: opt.value })}
              style={
                draft.type === opt.value
                  ? { borderColor: opt.color, background: opt.color + '08' }
                  : undefined
              }
            >
              <div style={{ color: opt.color }}>{opt.icon}</div>
              <div className="ccb-type-card-label">{opt.label}</div>
              <div className="ccb-type-card-desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Step 2 – Configure data source
// ===========================================================================
function StepSource({
  draft,
  patchConfig,
  patch,
}: {
  draft: CustomCommandDraft;
  patchConfig: (u: Partial<CustomCommandDraft['config']>) => void;
  patch: (u: Partial<CustomCommandDraft>) => void;
}) {
  return (
    <div className="ccb-step">
      <div className="ccb-step-heading">
        Configure data source
        <span className="ccb-step-type-badge">
          {TYPE_OPTIONS.find((t) => t.value === draft.type)?.icon}
          {TYPE_OPTIONS.find((t) => t.value === draft.type)?.label}
        </span>
      </div>

      {draft.type === 'api_fetch' && (
        <ApiFields config={draft.config} patchConfig={patchConfig} />
      )}
      {draft.type === 'javascript' && (
        <JsFields config={draft.config} patchConfig={patchConfig} />
      )}
      {draft.type === 'web_scraper' && (
        <ScraperFields config={draft.config} patchConfig={patchConfig} />
      )}
      {draft.type === 'static_data' && (
        <StaticFields config={draft.config} patchConfig={patchConfig} />
      )}

      {/* Schedule */}
      <div className="ccb-field" style={{ marginTop: 16 }}>
        <label className="ccb-label">
          <Zap className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          Auto-refresh schedule
        </label>
        <div className="ccb-schedule-row">
          <label className="ccb-toggle">
            <input
              type="checkbox"
              checked={draft.schedule.enabled}
              onChange={(e) =>
                patch({
                  schedule: { ...draft.schedule, enabled: e.target.checked },
                })
              }
            />
            <span className="ccb-toggle-slider" />
          </label>
          <span className="ccb-schedule-label">
            {draft.schedule.enabled ? 'Enabled' : 'Disabled (manual refresh only)'}
          </span>
          {draft.schedule.enabled && (
            <div className="ccb-schedule-input">
              <span>every</span>
              <input
                type="number"
                className="ccb-input ccb-input-sm"
                value={draft.schedule.intervalSeconds}
                min={1}
                onChange={(e) =>
                  patch({
                    schedule: {
                      ...draft.schedule,
                      intervalSeconds: Math.max(1, parseInt(e.target.value) || 60),
                    },
                  })
                }
              />
              <span>seconds</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-fields for each type ---

function ApiFields({
  config,
  patchConfig,
}: {
  config: CustomCommandDraft['config'];
  patchConfig: (u: Partial<CustomCommandDraft['config']>) => void;
}) {
  return (
    <>
      <div className="ccb-field-row">
        <div className="ccb-field" style={{ width: 120 }}>
          <label className="ccb-label">Method</label>
          <select
            className="ccb-select"
            value={config.method || 'GET'}
            onChange={(e) =>
              patchConfig({
                method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE',
              })
            }
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </div>
        <div className="ccb-field" style={{ flex: 1 }}>
          <label className="ccb-label">URL</label>
          <input
            className="ccb-input ccb-input-mono"
            placeholder="https://api.example.com/data"
            value={config.url || ''}
            onChange={(e) => patchConfig({ url: e.target.value })}
          />
        </div>
      </div>
      <div className="ccb-field">
        <label className="ccb-label">
          Headers <span className="ccb-label-hint">(JSON)</span>
        </label>
        <textarea
          className="ccb-textarea ccb-textarea-mono"
          rows={3}
          placeholder='{ "Authorization": "Bearer ..." }'
          value={config.headers || '{}'}
          onChange={(e) => patchConfig({ headers: e.target.value })}
        />
      </div>
      {config.method !== 'GET' && (
        <div className="ccb-field">
          <label className="ccb-label">
            Request Body <span className="ccb-label-hint">(JSON)</span>
          </label>
          <textarea
            className="ccb-textarea ccb-textarea-mono"
            rows={4}
            placeholder='{ "key": "value" }'
            value={config.body || ''}
            onChange={(e) => patchConfig({ body: e.target.value })}
          />
        </div>
      )}
    </>
  );
}

function JsFields({
  config,
  patchConfig,
}: {
  config: CustomCommandDraft['config'];
  patchConfig: (u: Partial<CustomCommandDraft['config']>) => void;
}) {
  return (
    <>
      <div className="ccb-field">
        <label className="ccb-label">JavaScript Code</label>
        <div className="ccb-code-hint">
          Write an async function body. Use <code>return</code> to output data.
          The returned object's keys become <code>{'{{key}}'}</code> template variables.
        </div>
        <textarea
          className="ccb-textarea ccb-textarea-mono ccb-code-editor"
          rows={12}
          spellCheck={false}
          value={config.code || ''}
          onChange={(e) => patchConfig({ code: e.target.value })}
          placeholder={`// Example:\nconst res = await fetch('https://api.example.com/data');\nconst json = await res.json();\nreturn { title: json.name, value: json.count };`}
        />
      </div>
    </>
  );
}

function ScraperFields({
  config,
  patchConfig,
}: {
  config: CustomCommandDraft['config'];
  patchConfig: (u: Partial<CustomCommandDraft['config']>) => void;
}) {
  return (
    <>
      <div className="ccb-field">
        <label className="ccb-label">Target URL</label>
        <input
          className="ccb-input ccb-input-mono"
          placeholder="https://example.com/page"
          value={config.scrapeUrl || ''}
          onChange={(e) => patchConfig({ scrapeUrl: e.target.value })}
        />
      </div>
      <div className="ccb-field">
        <label className="ccb-label">
          CSS Selectors <span className="ccb-label-hint">(JSON: key → selector)</span>
        </label>
        <textarea
          className="ccb-textarea ccb-textarea-mono"
          rows={5}
          placeholder={'{\n  "title": "h1",\n  "price": ".product-price",\n  "rating": ".stars-count"\n}'}
          value={config.selectors || '{}'}
          onChange={(e) => patchConfig({ selectors: e.target.value })}
        />
      </div>
      <div className="ccb-scraper-note">
        <Bug className="w-4 h-4" />
        <span>
          Browser-side scraping is blocked by CORS. To use this in production, configure a
          proxy backend and point the URL through it.
        </span>
      </div>
    </>
  );
}

function StaticFields({
  config,
  patchConfig,
}: {
  config: CustomCommandDraft['config'];
  patchConfig: (u: Partial<CustomCommandDraft['config']>) => void;
}) {
  return (
    <div className="ccb-field">
      <label className="ccb-label">Static JSON Data</label>
      <div className="ccb-code-hint">
        Define the data that will be displayed in the card. For <strong>metric</strong>{' '}
        mode use <code>{'{ title, value, unit, change }'}</code>.
      </div>
      <textarea
        className="ccb-textarea ccb-textarea-mono ccb-code-editor"
        rows={10}
        spellCheck={false}
        value={config.staticData || '{}'}
        onChange={(e) => patchConfig({ staticData: e.target.value })}
        placeholder={'{\n  "service": "API Gateway",\n  "status": "Operational",\n  "uptime": "99.97%"\n}'}
      />
    </div>
  );
}

// ===========================================================================
// Step 3 – Display mode + preview + save
// ===========================================================================
function StepDisplay({
  draft,
  patch,
  previewData,
  previewError,
  previewLoading,
  onRunPreview,
}: {
  draft: CustomCommandDraft;
  patch: (u: Partial<CustomCommandDraft>) => void;
  previewData: unknown;
  previewError: string | null;
  previewLoading: boolean;
  onRunPreview: () => void;
}) {
  return (
    <div className="ccb-step">
      <div className="ccb-step-heading">Card display & preview</div>

      {/* Display mode */}
      <div className="ccb-field">
        <label className="ccb-label">Display mode</label>
        <div className="ccb-display-grid">
          {DISPLAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`ccb-display-card ${draft.displayMode === opt.value ? 'active' : ''}`}
              onClick={() => patch({ displayMode: opt.value })}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom template */}
      {draft.displayMode === 'custom' && (
        <div className="ccb-field">
          <label className="ccb-label">
            HTML Template
            <span className="ccb-label-hint">
              Use <code>{'{{key}}'}</code> for data variables
            </span>
          </label>
          <textarea
            className="ccb-textarea ccb-textarea-mono ccb-code-editor"
            rows={8}
            spellCheck={false}
            value={draft.customTemplate || ''}
            onChange={(e) => patch({ customTemplate: e.target.value })}
            placeholder={`<div style="padding:8px">\n  <h3>{{title}}</h3>\n  <p>{{description}}</p>\n</div>`}
          />
        </div>
      )}

      {/* Live preview */}
      <div className="ccb-field">
        <div className="ccb-preview-header">
          <label className="ccb-label" style={{ margin: 0 }}>
            <Eye className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
            Live Preview
          </label>
          <button
            className="ccb-builder-btn ccb-builder-btn-secondary ccb-builder-btn-sm"
            onClick={onRunPreview}
            disabled={previewLoading}
          >
            <Play className="w-3.5 h-3.5" />
            {previewLoading ? 'Running...' : 'Run'}
          </button>
        </div>
        <div className="ccb-preview-box">
          {previewError ? (
            <div className="ccb-preview-error">{previewError}</div>
          ) : previewData != null ? (
            <PreviewCard draft={draft} data={previewData} />
          ) : (
            <div className="ccb-preview-empty">
              Click <strong>Run</strong> to fetch data and see a preview of your card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal preview of the card as it will render in the doc
function PreviewCard({
  draft,
  data,
}: {
  draft: CustomCommandDraft;
  data: unknown;
}) {
  const typeMeta = TYPE_OPTIONS.find((t) => t.value === draft.type);

  const renderBody = () => {
    if (data == null) return <div className="ccb-empty">No data</div>;
    if (draft.displayMode === 'metric' && typeof data === 'object' && !Array.isArray(data)) {
      const d = data as Record<string, unknown>;
      return (
        <div className="ccb-metric">
          {d.title && <div className="ccb-metric-title">{String(d.title)}</div>}
          <div className="ccb-metric-value">
            {String(d.value ?? '')}
            {d.unit && <span className="ccb-metric-unit">{String(d.unit)}</span>}
          </div>
          {d.change != null && (
            <div className="ccb-metric-change">{String(d.change)}</div>
          )}
        </div>
      );
    }
    if (draft.displayMode === 'custom' && draft.customTemplate) {
      let html = draft.customTemplate;
      const flat = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : { value: data };
      for (const [key, val] of Object.entries(flat)) {
        html = html.replaceAll(`{{${key}}}`, String(val ?? ''));
      }
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    if (draft.displayMode === 'table' && Array.isArray(data)) {
      const keys = data.length > 0 ? Object.keys(data[0] as object).slice(0, 5) : [];
      return (
        <table className="ccb-table">
          <thead>
            <tr>{keys.map(k => <th key={k}>{k}</th>)}</tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((row, i) => {
              const r = row as Record<string, unknown>;
              return <tr key={i}>{keys.map(k => <td key={k}>{String(r[k] ?? '')}</td>)}</tr>;
            })}
          </tbody>
        </table>
      );
    }
    // key_value / auto
    if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
      return (
        <div className="ccb-kv">
          {Object.entries(data as Record<string, unknown>).slice(0, 8).map(([key, val]) => (
            <div key={key} className="ccb-kv-row">
              <span className="ccb-kv-key">{key}</span>
              <span className="ccb-kv-val">
                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return <pre className="ccb-raw">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="ccb-card ccb-preview-card">
      <div className="ccb-header">
        <div className="ccb-header-left">
          <span className="ccb-icon">{draft.icon || '⚡'}</span>
          <span className="ccb-name">{draft.name || 'Untitled'}</span>
          {typeMeta && (
            <span
              className="ccb-type-badge"
              style={{ background: typeMeta.color + '18', color: typeMeta.color }}
            >
              {typeMeta.icon}
              {typeMeta.label}
            </span>
          )}
        </div>
      </div>
      {draft.description && <div className="ccb-description">{draft.description}</div>}
      <div className="ccb-body">{renderBody()}</div>
    </div>
  );
}
