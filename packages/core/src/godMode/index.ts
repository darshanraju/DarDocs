// Types
export type {
  RepoRole,
  GodModeRepoConfig,
  TeamMember,
  GodModeConfig,
  Contributor,
  SystemConnection,
  GlossaryTerm,
  ApiEndpoint,
  ErrorPattern,
  SetupStep,
  ArchDecision,
  RepoAnalysis,
  GodModeAnalysisResult,
  AnalysisPhase,
  AnalysisProgress,
} from './types';

// Feature flag
export { GOD_MODE_USE_MOCK_DATA } from './types';

// Mock analysis runner
export { runMockAnalysis } from './mockData';

// Document generator
export { generateGodModeDocument } from './documentGenerator';
