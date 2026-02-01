// Runbook step types
export type RunbookStepType = 'manual' | 'automated' | 'decision';
export type RunbookStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type RunbookStatus = 'idle' | 'running' | 'completed' | 'failed';

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
    if (step.notes) summary += `  Notes: ${step.notes}\n`;
    if (step.timestamp) summary += `  Completed: ${new Date(step.timestamp).toLocaleString()}\n`;
    summary += '\n';
  }

  if (conclusion) {
    summary += `### Conclusion\n${conclusion}\n`;
  }

  return summary;
}
