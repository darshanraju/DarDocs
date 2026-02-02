import type { GodModeRepoConfig, RepoAnalysis, AnalysisProviders } from '@dardocs/core';

export async function analyzeRepo(
  config: GodModeRepoConfig,
  clonePath: string,
  otherRepoNames: string[],
  providers: AnalysisProviders,
  onPhase?: (phase: string, message: string) => void
): Promise<RepoAnalysis> {
  const { git, code, enrichment, context } = providers;

  // Phase 1: Extract (parallel, no LLM)
  const [
    contributors,
    hotZones,
    techResult,
    apiEndpoints,
    errorPatterns,
    glossary,
    setupSteps,
    archDecisions,
    connections,
  ] = await Promise.all([
    git.getContributors(clonePath),
    git.getHotZones(clonePath),
    code.getTechStack(clonePath),
    code.getApiEndpoints(clonePath),
    code.getErrorPatterns(clonePath),
    code.getGlossaryTerms(clonePath),
    code.getSetupSteps(clonePath),
    git.getArchDecisions(clonePath),
    code.getConnections(clonePath, config.repo, otherRepoNames),
  ]);

  // Phase 2: Enrich (LLM-augmented, optional — no-op with default providers)
  onPhase?.('enriching-ai', `Enriching ${config.repo} with AI...`);
  const repoContext = await context.getRepoContext(clonePath);
  const [enrichedEndpoints, enrichedGlossary, enrichedZones, enrichedErrors] =
    await Promise.all([
      enrichment.enrichEndpoints(apiEndpoints, repoContext),
      enrichment.enrichGlossary(glossary, repoContext),
      enrichment.enrichHotZones(hotZones, repoContext),
      enrichment.enrichErrors(errorPatterns, repoContext),
    ]);

  return {
    repoId: config.id,
    repoName: config.repo,
    repoRole: config.role,
    description: config.description,
    contributors,
    pms: config.teamMembers.filter((m) => m.role === 'pm'),
    connections,
    glossary: enrichedGlossary,
    hotZones: enrichedZones,
    apiEndpoints: enrichedEndpoints,
    errorPatterns: enrichedErrors,
    setupSteps,
    archDecisions,
    ...techResult,
    lastAnalyzedAt: new Date().toISOString(),
  };
}
