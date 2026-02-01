// Runbook step types
export type RunbookStepType = 'manual' | 'automated' | 'decision';
export type RunbookStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type RunbookStatus = 'idle' | 'running' | 'completed' | 'failed';

// Step automation configuration — defines how a step should be auto-executed
export interface StepAutomation {
  connector: string;                    // e.g. 'grafana', 'datadog', 'sentry', 'http'
  query: string;                        // Query string or API endpoint
  timeRange?: string;                   // e.g. '15m', '1h', '24h'
  threshold?: number;                   // Numeric threshold for pass/fail
  metadata?: Record<string, string>;    // Extra connector-specific config
}

// AI analysis verdict for a completed step
export interface StepVerdict {
  status: 'passed' | 'failed' | 'skipped';
  confidence: number;                   // 0-1 confidence score
  explanation: string;                  // AI's analysis/reasoning
  rawData?: string;                     // Raw data from connector query
  suggestions?: string[];               // Suggested next actions
}

export interface RunbookStep {
  id: string;
  label: string;
  type: RunbookStepType;
  description: string;
  command?: string;
  expectedOutcome?: string;
  status: RunbookStepStatus;
  output?: string;
  notes?: string;
  timestamp?: string;
  automation?: StepAutomation;
  verdict?: StepVerdict;
}

export function createRunbookStep(overrides?: Partial<RunbookStep>): RunbookStep {
  return {
    id: crypto.randomUUID(),
    label: '',
    type: 'manual',
    description: '',
    status: 'pending',
    ...overrides,
  };
}

export function generateRunbookSummary(
  title: string,
  steps: RunbookStep[],
  conclusion?: string | null
): string {
  const passed = steps.filter(s => s.status === 'passed').length;
  const failed = steps.filter(s => s.status === 'failed').length;
  const skipped = steps.filter(s => s.status === 'skipped').length;

  let summary = `## Runbook: ${title}\n\n`;
  summary += `**Results:** ${passed} passed, ${failed} failed, ${skipped} skipped out of ${steps.length} steps\n\n`;

  for (const step of steps) {
    const icon =
      step.status === 'passed' ? '[PASS]' :
      step.status === 'failed' ? '[FAIL]' :
      step.status === 'skipped' ? '[SKIP]' : '[PENDING]';
    summary += `${icon} **Step: ${step.label}**\n`;
    if (step.description) summary += `  Description: ${step.description}\n`;
    if (step.verdict) {
      summary += `  Analysis: ${step.verdict.explanation}\n`;
      summary += `  Confidence: ${Math.round(step.verdict.confidence * 100)}%\n`;
      if (step.verdict.suggestions?.length) {
        summary += `  Suggestions:\n`;
        for (const s of step.verdict.suggestions) {
          summary += `    - ${s}\n`;
        }
      }
    }
    if (step.notes && step.notes !== step.verdict?.explanation) {
      summary += `  Notes: ${step.notes}\n`;
    }
    if (step.timestamp) summary += `  Completed: ${new Date(step.timestamp).toLocaleString()}\n`;
    summary += '\n';
  }

  if (conclusion) {
    summary += `### Conclusion\n${conclusion}\n`;
  }

  return summary;
}

// --- WebSocket Protocol Types ---

export type AgentMessageType =
  | 'execute_runbook'
  | 'cancel_execution'
  | 'step_started'
  | 'step_data'
  | 'step_completed'
  | 'execution_completed'
  | 'execution_error';

export interface AgentMessage<T = unknown> {
  type: AgentMessageType;
  runbookId: string;
  payload: T;
}

export interface ExecuteRunbookPayload {
  title: string;
  steps: RunbookStep[];
  config: {
    aiProvider: 'anthropic' | 'openai';
    aiApiKey: string;
    aiModel?: string;
    providers: Record<string, Record<string, unknown>>;
  };
}

export interface StepStartedPayload {
  stepId: string;
  stepIndex: number;
}

export interface StepDataPayload {
  stepId: string;
  data: string;
  source: 'connector' | 'reasoning';
}

export interface StepCompletedPayload {
  stepId: string;
  verdict: StepVerdict;
}

export interface ExecutionCompletedPayload {
  conclusion: string;
  overallStatus: 'completed' | 'failed';
}

export interface ExecutionErrorPayload {
  error: string;
  stepId?: string;
}
