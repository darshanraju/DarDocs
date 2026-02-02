// Types
export type {
  TechDocsRepoConfig,
  TechDocsConfig,
  QuestionRound,
  QAQuestion,
  QAAnswer,
  ExistingPattern,
  AffectedModule,
  SchemaChange,
  SchemaField,
  APIChange,
  SequenceStep,
  SecurityConsideration,
  TestPlan,
  RolloutStep,
  Risk,
  Alternative,
  TechDocsAnalysisResult,
  TechDocsAnalysisPhase,
  TechDocsAnalysisProgress,
} from './types';

// Feature flag
export { TECH_DOCS_USE_MOCK_DATA } from './types';

// Questions
export { TECH_DOCS_QUESTIONS, QUESTION_ROUNDS } from './questions';

// Mock analysis runner
export { runTechDocsAnalysis } from './mockData';

// Document generator
export { generateTechDocsDocument } from './documentGenerator';
