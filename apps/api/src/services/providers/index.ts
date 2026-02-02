import type { AnalysisProviders, AIConfig } from '@dardocs/core';
import { GitCliProvider } from './GitCliProvider.js';
import { GrepCodeProvider } from './GrepCodeProvider.js';
import { NoOpEnrichment } from './NoOpEnrichment.js';
import { NoOpContext } from './NoOpContext.js';
import { LLMEnrichment } from './LLMEnrichment.js';
import { FileContextProvider } from './FileContextProvider.js';

export function createDefaultProviders(aiConfig?: AIConfig | null): AnalysisProviders {
  const hasAI = aiConfig?.apiKey && aiConfig?.provider;

  return {
    git: new GitCliProvider(),
    code: new GrepCodeProvider(),
    enrichment: hasAI ? new LLMEnrichment(aiConfig) : new NoOpEnrichment(),
    context: hasAI ? new FileContextProvider() : new NoOpContext(),
  };
}
