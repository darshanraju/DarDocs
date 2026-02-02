// ─── Feature Flag ─────────────────────────────────────────────
export const GOD_MODE_USE_MOCK_DATA = true;

// ─── Configuration Types ──────────────────────────────────────

export type RepoRole = 'primary' | 'secondary';

export interface GodModeRepoConfig {
  id: string;
  url: string;
  owner: string;
  repo: string;
  role: RepoRole;
  description: string;
  teamMembers: TeamMember[];
}

export interface TeamMember {
  name: string;
  role: 'developer' | 'pm' | 'designer' | 'other';
  github?: string;
}

export interface GodModeConfig {
  repos: GodModeRepoConfig[];
}

// ─── Analysis Result Types ────────────────────────────────────

export interface Contributor {
  name: string;
  github: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  lastActive: string;
}

export interface SystemConnection {
  fromRepo: string;
  toRepo: string;
  connectionType: 'api' | 'event' | 'shared-db' | 'import' | 'webhook';
  description: string;
  endpoints?: string[];
}

export interface GlossaryTerm {
  term: string;
  occurrences: number;
  files: string[];
  inferredDefinition: string;
  context: string;
}

export interface HotZone {
  filePath: string;
  changeCount: number;
  lastChanged: string;
  contributors: string[];
  description: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  sourceFile: string;
}

export interface ErrorPattern {
  className: string;
  message: string;
  sourceFile: string;
  httpStatus?: number;
}

export interface SetupStep {
  order: number;
  command: string;
  description: string;
  notes?: string;
}

export interface ArchDecision {
  date: string;
  summary: string;
  source: string;
  context: string;
}

export interface RepoAnalysis {
  repoId: string;
  repoName: string;
  repoRole: RepoRole;
  description: string;

  contributors: Contributor[];
  pms: TeamMember[];
  connections: SystemConnection[];
  glossary: GlossaryTerm[];
  hotZones: HotZone[];
  apiEndpoints: ApiEndpoint[];
  errorPatterns: ErrorPattern[];
  setupSteps: SetupStep[];
  archDecisions: ArchDecision[];

  techStack: string[];
  testFrameworks: string[];
  cicdPlatform: string;
  lastAnalyzedAt: string;
}

export interface GodModeAnalysisResult {
  config: GodModeConfig;
  repos: RepoAnalysis[];
  generatedAt: string;
}

// ─── Analysis Phase Tracking ──────────────────────────────────

export type AnalysisPhase =
  | 'idle'
  | 'fetching-metadata'
  | 'cloning'
  | 'analyzing-structure'
  | 'analyzing-contributors'
  | 'analyzing-connections'
  | 'analyzing-glossary'
  | 'generating-document'
  | 'complete'
  | 'error';

export interface AnalysisProgress {
  phase: AnalysisPhase;
  currentRepo?: string;
  percent: number;
  message: string;
}

// ─── API Request/Response Types ──────────────────────────────

export interface GodModeAnalyzeRequest {
  config: GodModeConfig;
  githubToken?: string;
}

/** SSE event: either a progress update or the final result */
export type GodModeSSEEvent =
  | AnalysisProgress
  | { type: 'result'; result: GodModeAnalysisResult };
