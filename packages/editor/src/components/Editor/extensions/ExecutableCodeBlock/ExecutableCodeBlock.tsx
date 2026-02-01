import { useState, useCallback } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { executeApi } from '../../../../lib/api.js';

const LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'javascript',
  ts: 'javascript',
  python: 'python',
  py: 'python',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
};

function getLanguage(node: NodeViewProps['node']): string {
  return node.attrs.language || 'javascript';
}

function isExecutable(lang: string): boolean {
  return lang.toLowerCase() in LANG_MAP;
}

export function ExecutableCodeBlock(props: NodeViewProps) {
  const { node } = props;
  const language = getLanguage(node);
  const executable = isExecutable(language);

  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
  } | null>(null);

  const handleRun = useCallback(async () => {
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

  return (
    <NodeViewWrapper className="exec-code-block">
      <div className="exec-code-header">
        <span className="exec-code-lang">{language}</span>
        {executable && (
          <button
            className="exec-code-run-btn"
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
        <div className={`exec-code-output ${output.exitCode === 0 ? 'exec-code-output-ok' : 'exec-code-output-err'}`}>
          <div className="exec-code-output-header">
            {output.timedOut ? (
              <>
                <Clock size={14} />
                <span>Timed out (10s limit)</span>
              </>
            ) : output.exitCode === 0 ? (
              <>
                <CheckCircle2 size={14} />
                <span>Success</span>
              </>
            ) : (
              <>
                <XCircle size={14} />
                <span>Exit code {output.exitCode}</span>
              </>
            )}
          </div>
          {output.stdout && (
            <pre className="exec-code-stdout">{output.stdout}</pre>
          )}
          {output.stderr && (
            <pre className="exec-code-stderr">{output.stderr}</pre>
          )}
          {!output.stdout && !output.stderr && !output.timedOut && (
            <pre className="exec-code-stdout">(no output)</pre>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
