import { useState, useCallback } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Play, Loader2, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';
import { executeApi } from '../../../../lib/api.js';

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
];

const EXECUTABLE_LANGS = new Set(['javascript', 'typescript', 'python', 'bash']);

const LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'javascript',
  python: 'python',
  bash: 'bash',
};

function getLanguage(node: NodeViewProps['node']): string {
  return node.attrs.language || 'javascript';
}

export function ExecutableCodeBlock(props: NodeViewProps) {
  const { node, updateAttributes } = props;
  const language = getLanguage(node);
  const executable = EXECUTABLE_LANGS.has(language.toLowerCase());

  const [running, setRunning] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
  } | null>(null);

  const handleRun = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const code = node.textContent;
    if (!code.trim()) return;

    setRunning(true);
    setOutput(null);

    try {
      const result = await executeApi.run(
        LANG_MAP[language.toLowerCase()] || language,
        code
      );
      setOutput(result);
    } catch (err: any) {
      setOutput({
        stdout: '',
        stderr: err.message || 'Execution failed',
        exitCode: 1,
        timedOut: false,
      });
    } finally {
      setRunning(false);
    }
  }, [node, language]);

  const handleSelectLang = useCallback((lang: string) => {
    updateAttributes({ language: lang });
    setShowLangMenu(false);
  }, [updateAttributes]);

  const displayLabel = SUPPORTED_LANGUAGES.find(l => l.value === language)?.label || language;

  return (
    <NodeViewWrapper className="exec-code-block">
      <div className="exec-code-header" contentEditable={false}>
        <div className="exec-code-lang-picker">
          <button
            className="exec-code-lang-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLangMenu(!showLangMenu); }}
          >
            {displayLabel}
            <ChevronDown size={12} />
          </button>
          {showLangMenu && (
            <div className="exec-code-lang-menu">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  className={`exec-code-lang-option ${lang.value === language ? 'active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectLang(lang.value); }}
                >
                  {lang.label}
                  {EXECUTABLE_LANGS.has(lang.value) && (
                    <span className="exec-code-lang-runnable">runnable</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {executable && (
          <button
            className="exec-code-run-btn"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={handleRun}
            disabled={running}
            title="Run code"
          >
            {running ? (
              <Loader2 size={14} className="exec-spin" />
            ) : (
              <Play size={14} />
            )}
            {running ? 'Running...' : 'Run'}
          </button>
        )}
      </div>
      <pre className="exec-code-pre">
        <NodeViewContent as="div" className="exec-code-content" />
      </pre>
      {output && (
        <div
          className={`exec-code-result ${output.exitCode === 0 ? 'exec-code-result-ok' : 'exec-code-result-err'}`}
          contentEditable={false}
        >
          <div className="exec-code-result-label">
            <span>Result</span>
            {output.timedOut ? (
              <span className="exec-code-result-badge exec-code-result-badge-warn">
                <Clock size={12} />
                Timed out
              </span>
            ) : output.exitCode === 0 ? (
              <span className="exec-code-result-badge exec-code-result-badge-ok">
                <CheckCircle2 size={12} />
                Success
              </span>
            ) : (
              <span className="exec-code-result-badge exec-code-result-badge-err">
                <XCircle size={12} />
                Exit {output.exitCode}
              </span>
            )}
          </div>
          <div className="exec-code-result-body">
            {output.stdout && (
              <pre className="exec-code-stdout">{output.stdout}</pre>
            )}
            {output.stderr && (
              <pre className="exec-code-stderr">{output.stderr}</pre>
            )}
            {!output.stdout && !output.stderr && !output.timedOut && (
              <pre className="exec-code-stdout exec-code-no-output">(no output)</pre>
            )}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
