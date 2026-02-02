// ─── Feature Flag ─────────────────────────────────────────────
export const TECH_DOCS_USE_MOCK_DATA = true;

// ─── Configuration Types ──────────────────────────────────────

export interface TechDocsRepoConfig {
  id: string;
  url: string;
  owner: string;
  repo: string;
  description: string;
}

export interface TechDocsConfig {
  repo: TechDocsRepoConfig | null;
  prdContent: string;
  featureTitle: string;
}

// ─── Q&A Phase ────────────────────────────────────────────────

export type QuestionRound =
  | 'scope'
  | 'user-facing'
  | 'data'
  | 'dependencies'
  | 'non-functionals'
  | 'security'
  | 'rollout';

export interface QAQuestion {
  id: string;
  round: QuestionRound;
  roundLabel: string;
  question: string;
  hint: string;
  required: boolean;
}

export interface QAAnswer {
  questionId: string;
  answer: string;
}

// ─── Repo Analysis Result Types ───────────────────────────────

export interface ExistingPattern {
  name: string;
  description: string;
  files: string[];
}

export interface AffectedModule {
  layer: 'api' | 'service' | 'controller' | 'component' | 'store' | 'database' | 'middleware' | 'config' | 'test';
  filePath: string;
  changeType: 'create' | 'modify';
  description: string;
}

export interface SchemaChange {
  entity: string;
  changeType: 'create-table' | 'alter-table' | 'add-column' | 'add-index' | 'create-migration';
  description: string;
  fields?: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
}

export interface APIChange {
  method: string;
  path: string;
  changeType: 'new' | 'modify';
  description: string;
  requestShape?: string;
  responseShape?: string;
  errorCodes?: string[];
  authRequired: boolean;
}

export interface SequenceStep {
  from: string;
  to: string;
  action: string;
  description: string;
}

export interface SecurityConsideration {
  category: 'auth' | 'data-privacy' | 'permissions' | 'compliance' | 'input-validation';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TestPlan {
  layer: 'unit' | 'integration' | 'e2e';
  target: string;
  description: string;
  assertions: string[];
}

export interface RolloutStep {
  order: number;
  description: string;
  type: 'feature-flag' | 'migration' | 'deploy' | 'monitor' | 'rollback';
  notes?: string;
}

export interface Risk {
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
  isOpenQuestion: boolean;
}

export interface Alternative {
  approach: string;
  pros: string[];
  cons: string[];
  rejectionReason: string;
}

// ─── Full Analysis Result ─────────────────────────────────────

export interface TechDocsAnalysisResult {
  config: TechDocsConfig;
  answers: QAAnswer[];

  // Derived from PRD + Q&A
  overview: string;
  background: string;
  scope: string[];
  nonGoals: string[];

  // Derived from repo analysis
  repoName: string;
  techStack: string[];
  existingPatterns: ExistingPattern[];
  affectedModules: AffectedModule[];

  // Detailed design
  schemaChanges: SchemaChange[];
  apiChanges: APIChange[];
  sequenceDiagram: SequenceStep[];

  // Cross-cutting
  securityConsiderations: SecurityConsideration[];
  testPlan: TestPlan[];
  rolloutSteps: RolloutStep[];
  risks: Risk[];
  alternatives: Alternative[];

  generatedAt: string;
}

// ─── Analysis Phase Tracking ──────────────────────────────────

export type TechDocsAnalysisPhase =
  | 'idle'
  | 'parsing-prd'
  | 'analyzing-repo'
  | 'mapping-changes'
  | 'generating-design'
  | 'building-document'
  | 'complete'
  | 'error';

export interface TechDocsAnalysisProgress {
  phase: TechDocsAnalysisPhase;
  percent: number;
  message: string;
}
