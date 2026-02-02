import type { EnrichmentProvider } from '@dardocs/core';
import type { ApiEndpoint, GlossaryTerm, HotZone, ErrorPattern } from '@dardocs/core';
import type { AIConfig } from '@dardocs/core';

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
};

const SYSTEM_PROMPT =
  'You are a senior software engineer analyzing a code repository to generate developer documentation. You produce concise, precise, technical descriptions. Respond with ONLY a valid JSON array, no markdown wrapping, no explanation.';

export class LLMEnrichment implements EnrichmentProvider {
  private provider: 'anthropic' | 'openai';
  private apiKey: string;
  private model: string;

  constructor(aiConfig: AIConfig) {
    this.provider = aiConfig.provider;
    this.apiKey = aiConfig.apiKey;
    this.model = aiConfig.model || DEFAULT_MODELS[aiConfig.provider] || 'claude-sonnet-4-20250514';
  }

  // ─── Enrichment methods ────────────────────────────────────

  async enrichEndpoints(endpoints: ApiEndpoint[], repoContext: string): Promise<ApiEndpoint[]> {
    if (endpoints.length === 0) return endpoints;

    try {
      const input = endpoints.map((e) => ({
        method: e.method,
        path: e.path,
        sourceFile: e.sourceFile,
      }));

      const userPrompt = `Repository context:\n${repoContext}\n\nHere are ${input.length} API endpoints discovered in this codebase. For each, write a concise 1-sentence description of what it does.\n\nEndpoints:\n${JSON.stringify(input, null, 2)}\n\nRespond with a JSON array. Each element must have "method", "path", and "description" fields. The method and path must match the input exactly.`;

      const raw = await this.callLLM(SYSTEM_PROMPT, userPrompt);
      const parsed = this.parseJSONArray<{ method: string; path: string; description: string }>(raw);
      if (!parsed) return endpoints;

      const lookup = new Map<string, string>();
      for (const item of parsed) {
        if (item.method && item.path && item.description) {
          lookup.set(`${item.method}:${item.path}`, item.description);
        }
      }

      return endpoints.map((e) => ({
        ...e,
        description: lookup.get(`${e.method}:${e.path}`) || e.description,
      }));
    } catch {
      return endpoints;
    }
  }

  async enrichGlossary(terms: GlossaryTerm[], repoContext: string): Promise<GlossaryTerm[]> {
    if (terms.length === 0) return terms;

    try {
      const input = terms.map((t) => ({
        term: t.term,
        occurrences: t.occurrences,
        files: t.files.slice(0, 3),
        context: t.context,
      }));

      const userPrompt = `Repository context:\n${repoContext}\n\nHere are domain-specific terms (abbreviations/acronyms) found in this codebase. For each, infer what it stands for or means in this project's domain.\n\nTerms:\n${JSON.stringify(input, null, 2)}\n\nRespond with a JSON array. Each element must have "term" and "inferredDefinition" fields. The term must match the input exactly. The definition should be a concise expansion or explanation (1-2 sentences).`;

      const raw = await this.callLLM(SYSTEM_PROMPT, userPrompt);
      const parsed = this.parseJSONArray<{ term: string; inferredDefinition: string }>(raw);
      if (!parsed) return terms;

      const lookup = new Map<string, string>();
      for (const item of parsed) {
        if (item.term && item.inferredDefinition) {
          lookup.set(item.term, item.inferredDefinition);
        }
      }

      return terms.map((t) => ({
        ...t,
        inferredDefinition: lookup.get(t.term) || t.inferredDefinition,
      }));
    } catch {
      return terms;
    }
  }

  async enrichHotZones(zones: HotZone[], repoContext: string): Promise<HotZone[]> {
    if (zones.length === 0) return zones;

    try {
      const input = zones.map((z) => ({
        filePath: z.filePath,
        changeCount: z.changeCount,
        contributors: z.contributors.slice(0, 3),
      }));

      const userPrompt = `Repository context:\n${repoContext}\n\nHere are "hot zones" — files that change very frequently in this repository. For each file, explain WHY it likely changes so often based on its path, location in the project, and the contributor activity.\n\nHot zones:\n${JSON.stringify(input, null, 2)}\n\nRespond with a JSON array. Each element must have "filePath" and "description" fields. The filePath must match the input exactly. The description should be 1-2 sentences explaining why this file is a hot zone.`;

      const raw = await this.callLLM(SYSTEM_PROMPT, userPrompt);
      const parsed = this.parseJSONArray<{ filePath: string; description: string }>(raw);
      if (!parsed) return zones;

      const lookup = new Map<string, string>();
      for (const item of parsed) {
        if (item.filePath && item.description) {
          lookup.set(item.filePath, item.description);
        }
      }

      return zones.map((z) => ({
        ...z,
        description: lookup.get(z.filePath) || z.description,
      }));
    } catch {
      return zones;
    }
  }

  async enrichErrors(errors: ErrorPattern[], repoContext: string): Promise<ErrorPattern[]> {
    if (errors.length === 0) return errors;

    try {
      const input = errors.map((e) => ({
        className: e.className,
        sourceFile: e.sourceFile,
        httpStatus: e.httpStatus,
      }));

      const userPrompt = `Repository context:\n${repoContext}\n\nHere are custom error/exception classes found in this codebase. For each, describe what situation triggers this error based on the class name, source file, and HTTP status code.\n\nError patterns:\n${JSON.stringify(input, null, 2)}\n\nRespond with a JSON array. Each element must have "className" and "message" fields. The className must match the input exactly. The message should be a concise 1-sentence description of when this error is thrown.`;

      const raw = await this.callLLM(SYSTEM_PROMPT, userPrompt);
      const parsed = this.parseJSONArray<{ className: string; message: string }>(raw);
      if (!parsed) return errors;

      const lookup = new Map<string, string>();
      for (const item of parsed) {
        if (item.className && item.message) {
          lookup.set(item.className, item.message);
        }
      }

      return errors.map((e) => ({
        ...e,
        message: lookup.get(e.className) || e.message,
      }));
    } catch {
      return errors;
    }
  }

  // ─── LLM call helpers ─────────────────────────────────────

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Anthropic API error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as { content?: { text?: string }[] };
      return data.content?.[0]?.text || '';
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`OpenAI API error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content || '';
    }
  }

  private parseJSONArray<T>(raw: string): T[] | null {
    // Tier 1: direct parse
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }

    // Tier 2: extract from markdown code fence
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        const parsed = JSON.parse(fenceMatch[1]);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* fall through */ }
    }

    // Tier 3: find outermost brackets
    const bracketMatch = raw.match(/\[[\s\S]*\]/);
    if (bracketMatch) {
      try {
        const parsed = JSON.parse(bracketMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* fall through */ }
    }

    return null;
  }
}
