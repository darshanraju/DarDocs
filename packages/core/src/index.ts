// Types
export type {
  DarDocsDocument,
  DocumentMetadata,
  Comment,
  CommentAuthor,
  CommentReply,
  BoardBlockAttrs,
  NodeType,
  MarkType,
} from './documentSchema';

// Document factory
export { createNewDocument } from './documentSchema';

// Constants
export {
  DARDOCS_EXTENSION,
  DEFAULT_BOARD_WIDTH,
  DEFAULT_BOARD_HEIGHT,
  EDITOR_PLACEHOLDER,
  BOARD_SAVE_DEBOUNCE_MS,
  EDITOR_SAVE_DEBOUNCE_MS,
  DEFAULT_TABLE_ROWS,
  DEFAULT_TABLE_COLS,
  APP_NAME,
  ACCEPTED_FILE_TYPES,
  DOCUMENT_MAX_WIDTH,
} from './constants';

// Serialization
export {
  serializeDocument,
  deserializeDocument,
  generateFilename,
  migrateComment,
  readFileAsText,
  readFileAsArrayBuffer,
} from './serialization';

// Persistence
export type { DocumentPersistence } from './persistence';
export { LocalFilePersistence } from './LocalFilePersistence';
export { IndexedDBPersistence } from './IndexedDBPersistence';

// Database
export { db } from './db';
export type { DocTreeNode } from './db';

// Slash commands
export type { SlashCommandDefinition } from './slashCommands';
export {
  slashCommandDefinitions,
  filterSlashCommands,
  getCommandByName,
  getCommandsByKeyword,
} from './slashCommands';

// Runbook
export type {
  RunbookStep,
  RunbookStepType,
  RunbookStepStatus,
  RunbookStatus,
  StepAutomation,
  StepVerdict,
  AgentMessageType,
  AgentMessage,
  ExecuteRunbookPayload,
  StepStartedPayload,
  StepDataPayload,
  StepCompletedPayload,
  ExecutionCompletedPayload,
  ExecutionErrorPayload,
} from './runbookSchema';
export { createRunbookStep, generateRunbookSummary } from './runbookSchema';

// Docx converter
export { convertDocxToTipTap } from './docxConverter';

// Monitor providers
export type { MonitorProviderId, MonitorProviderConfig } from './monitors';
export { MONITOR_PROVIDERS, MONITOR_PROVIDER_LIST } from './monitors';

// Workspace config
export type {
  RepoConfig,
  GrafanaCredentials,
  SentryCredentials,
  DatadogCredentials,
  PagerDutyCredentials,
  ProviderCredentials,
  AIConfig,
  WorkspaceConfig,
} from './workspace';
export { DEFAULT_WORKSPACE_CONFIG, parseGitHubRepoUrl } from './workspace';
