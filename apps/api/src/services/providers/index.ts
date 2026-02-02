import type { AnalysisProviders } from '@dardocs/core';
import { GitCliProvider } from './GitCliProvider.js';
import { GrepCodeProvider } from './GrepCodeProvider.js';
import { NoOpEnrichment } from './NoOpEnrichment.js';
import { NoOpContext } from './NoOpContext.js';

export function createDefaultProviders(): AnalysisProviders {
  return {
    git: new GitCliProvider(),
    code: new GrepCodeProvider(),
    enrichment: new NoOpEnrichment(),
    context: new NoOpContext(),
  };
}
