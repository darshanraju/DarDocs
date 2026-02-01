import type { AIConfig } from '@dardocs/core';
import type { DiscoveredMetric } from './metricScanner';
import type { GrafanaPanelJSON } from './grafanaApi';

function buildMetricsContext(metrics: DiscoveredMetric[]): string {
  if (metrics.length === 0) return 'No metrics discovered from connected repos.';

  const grouped = new Map<string, DiscoveredMetric[]>();
  for (const m of metrics) {
    const list = grouped.get(m.repo) || [];
    list.push(m);
    grouped.set(m.repo, list);
  }

  let ctx = '';
  for (const [repo, repoMetrics] of grouped) {
    ctx += `\nRepo: ${repo}\n`;
    for (const m of repoMetrics) {
      const labels = m.labels.length > 0 ? ` [labels: ${m.labels.join(', ')}]` : '';
      const desc = m.description ? ` — ${m.description}` : '';
      ctx += `  - ${m.name} (${m.type})${labels}${desc}\n`;
    }
  }
  return ctx;
}

const SYSTEM_PROMPT = `You are a Grafana dashboard builder. Given a user request and a list of available metrics, generate a Grafana panel JSON configuration.

IMPORTANT: Respond with ONLY valid JSON, no markdown, no explanation. The JSON must match this exact structure:
{
  "type": "timeseries" | "stat" | "gauge" | "barchart" | "table",
  "title": "Panel Title",
  "targets": [
    {
      "expr": "PromQL expression",
      "legendFormat": "{{label}}",
      "refId": "A"
    }
  ]
}

Rules:
- Use the actual metric names from the available metrics list when they match the user's request
- For rate metrics on counters, wrap with rate() or increase()
- For histograms, use histogram_quantile() for percentiles
- Choose the visualization type that best fits the request
- Use multiple targets if the request implies comparing metrics
- If no matching metric exists, use a reasonable metric name based on the request`;

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate a Grafana panel JSON from a natural language request
 * and discovered metrics context.
 */
export async function generateGrafanaPanel(
  request: string,
  metrics: DiscoveredMetric[],
  aiConfig: AIConfig,
): Promise<GrafanaPanelJSON> {
  const metricsContext = buildMetricsContext(metrics);

  const prompt = `Available metrics from connected repos:
${metricsContext}

User request: ${request}

Generate the Grafana panel JSON for this request.`;

  const defaultModels: Record<string, string> = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
  };

  const model = aiConfig.model || defaultModels[aiConfig.provider] || 'claude-sonnet-4-20250514';

  let response: string;
  if (aiConfig.provider === 'anthropic') {
    response = await callAnthropic(aiConfig.apiKey, model, prompt);
  } else {
    response = await callOpenAI(aiConfig.apiKey, model, prompt);
  }

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse panel JSON from AI response');
  }

  const panel: GrafanaPanelJSON = JSON.parse(jsonMatch[0]);

  // Validate required fields
  if (!panel.type || !panel.title || !panel.targets) {
    throw new Error('AI response missing required panel fields');
  }

  return panel;
}
