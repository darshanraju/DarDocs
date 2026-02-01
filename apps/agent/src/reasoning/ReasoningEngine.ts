import type { RunbookStep, StepVerdict } from '@dardocs/core';
import type { LLMProvider } from './types.js';
import { PromptBuilder } from './PromptBuilder.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';

export class ReasoningEngine {
  private provider: LLMProvider;

  constructor(config: { provider: 'anthropic' | 'openai'; apiKey: string; model?: string }) {
    if (config.provider === 'anthropic') {
      this.provider = new AnthropicProvider(config.apiKey, config.model);
    } else {
      this.provider = new OpenAIProvider(config.apiKey, config.model);
    }
  }

  async analyzeStep(
    step: RunbookStep,
    connectorData: string,
    previousSteps: Array<{ step: RunbookStep; verdict?: StepVerdict }>
  ): Promise<StepVerdict> {
    const { system, user } = PromptBuilder.buildStepAnalysisPrompt(
      step,
      connectorData,
      previousSteps
    );

    const response = await this.provider.complete(user, system);
    return this.parseVerdict(response, connectorData);
  }

  async generateConclusion(
    title: string,
    stepsWithVerdicts: Array<{ step: RunbookStep; verdict?: StepVerdict }>
  ): Promise<string> {
    const { system, user } = PromptBuilder.buildConclusionPrompt(title, stepsWithVerdicts);
    return this.provider.complete(user, system);
  }

  private parseVerdict(response: string, rawData: string): StepVerdict {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackVerdict(response, rawData);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        status: parsed.status || 'skipped',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        explanation: parsed.explanation || response,
        rawData,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch {
      return this.fallbackVerdict(response, rawData);
    }
  }

  private fallbackVerdict(response: string, rawData: string): StepVerdict {
    return {
      status: 'skipped',
      confidence: 0.3,
      explanation: response || 'Unable to parse AI analysis',
      rawData,
      suggestions: ['Review step manually \u2014 AI analysis was inconclusive'],
    };
  }
}
