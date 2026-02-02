import type {
  Contributor,
  HotZone,
  ArchDecision,
  ApiEndpoint,
  ErrorPattern,
  GlossaryTerm,
  SystemConnection,
  SetupStep,
} from './types';

export interface GitProvider {
  getContributors(cwd: string): Promise<Contributor[]>;
  getHotZones(cwd: string): Promise<HotZone[]>;
  getArchDecisions(cwd: string): Promise<ArchDecision[]>;
}

export interface CodeProvider {
  getApiEndpoints(cwd: string): Promise<ApiEndpoint[]>;
  getErrorPatterns(cwd: string): Promise<ErrorPattern[]>;
  getGlossaryTerms(cwd: string): Promise<GlossaryTerm[]>;
  getConnections(cwd: string, repoName: string, otherRepos: string[]): Promise<SystemConnection[]>;
  getTechStack(cwd: string): Promise<{ techStack: string[]; testFrameworks: string[]; cicdPlatform: string }>;
  getSetupSteps(cwd: string): Promise<SetupStep[]>;
}

export interface EnrichmentProvider {
  enrichEndpoints(endpoints: ApiEndpoint[], repoContext: string): Promise<ApiEndpoint[]>;
  enrichGlossary(terms: GlossaryTerm[], repoContext: string): Promise<GlossaryTerm[]>;
  enrichHotZones(zones: HotZone[], repoContext: string): Promise<HotZone[]>;
  enrichErrors(errors: ErrorPattern[], repoContext: string): Promise<ErrorPattern[]>;
}

export interface ContextProvider {
  getRepoContext(cwd: string, relevantFiles?: string[]): Promise<string>;
  getFileContext(cwd: string, filePath: string): Promise<string>;
}

export interface AnalysisProviders {
  git: GitProvider;
  code: CodeProvider;
  enrichment: EnrichmentProvider;
  context: ContextProvider;
}
