import type { RunbookStep, StepVerdict } from '@dardocs/core';

export class PromptBuilder {
  static buildStepAnalysisPrompt(
    step: RunbookStep,
    connectorData: string,
    previousSteps: Array<{ step: RunbookStep; verdict?: StepVerdict }>
  ): { system: string; user: string } {
    const previousContext = previousSteps.length > 0
      ? `\n\nPrevious steps completed:\n${previousSteps.map((p, i) =>
          `Step ${i + 1}: ${p.step.label} \u2192 ${p.verdict?.status || 'unknown'} (${p.verdict?.explanation || 'no analysis'})`
        ).join('\n')}`
      : '';

    return {
      system: `You are an expert SRE/DevOps incident analyst. You are executing a runbook step and must analyze monitoring data to determine if this step passes, fails, or should be skipped.

Your response MUST be valid JSON with this exact structure:
{
  "status": "passed" | "failed" | "skipped",
  "confidence": <number between 0 and 1>,
  "explanation": "<clear explanation of your analysis>",
  "suggestions": ["<optional action items>"]
}

Guidelines:
- "passed" means the check looks healthy/normal
- "failed" means there is an anomaly, error, or the threshold is exceeded
- "skipped" means the data is insufficient or the check is not applicable
- Be specific about what metrics or data points led to your conclusion
- Keep explanations concise but informative (2-4 sentences)
- Include actionable suggestions when status is "failed"`,

      user: `## Runbook Step Analysis

**Step:** ${step.label}
**Description:** ${step.description || 'No description provided'}
${step.expectedOutcome ? `**Expected Outcome:** ${step.expectedOutcome}` : ''}
${step.command ? `**Command/Query:** ${step.command}` : ''}
${step.automation?.threshold !== undefined ? `**Threshold:** ${step.automation.threshold}` : ''}

**Connector Data:**
\`\`\`
${connectorData}
\`\`\`${previousContext}

Analyze the data above and provide your verdict as JSON.`
    };
  }

  static buildConclusionPrompt(
    title: string,
    stepsWithVerdicts: Array<{ step: RunbookStep; verdict?: StepVerdict }>
  ): { system: string; user: string } {
    return {
      system: `You are an expert SRE/DevOps incident analyst. You have just completed running a troubleshooting runbook and need to provide an overall conclusion.

Write a clear, concise conclusion that:
1. Summarizes the overall health status
2. Identifies the root cause if failures were found
3. Recommends immediate actions if needed
4. Notes any steps that need follow-up

Keep the conclusion to 3-5 sentences. Be direct and actionable.`,

      user: `## Runbook: ${title}

### Step Results:
${stepsWithVerdicts.map((s, i) => {
  const v = s.verdict;
  return `**Step ${i + 1}: ${s.step.label}**
- Status: ${v?.status || s.step.status}
- Confidence: ${v ? Math.round(v.confidence * 100) + '%' : 'N/A'}
- Analysis: ${v?.explanation || 'No analysis available'}
${v?.suggestions?.length ? `- Suggestions: ${v.suggestions.join('; ')}` : ''}`;
}).join('\n\n')}

Based on the above results, provide your overall conclusion.`
    };
  }
}
