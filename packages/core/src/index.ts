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

// Slash commands
export type { SlashCommandDefinition } from './slashCommands';
export {
  slashCommandDefinitions,
  filterSlashCommands,
  getCommandByName,
  getCommandsByKeyword,
} from './slashCommands';

// Docx converter
export { convertDocxToTipTap } from './docxConverter';
