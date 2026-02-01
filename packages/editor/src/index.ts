// Public API
export { DarDocsEditor } from './DarDocsEditor';
export type { DarDocsEditorProps } from './DarDocsEditor';

export { DocumentViewer as DarDocsViewer } from './DarDocsViewer';

// Re-export core types for convenience
export type {
  DarDocsDocument,
  DocumentMetadata,
  Comment,
} from '@dardocs/core';

// Individual components for advanced composition
export { Editor } from './Editor';
export { TableOfContents } from './toc/TableOfContents';
export { CommentSection } from './comments/CommentSection';
export { CommentsSidebar } from './comments/CommentsSidebar';

// Stores (for advanced use cases)
export { useDocumentStore } from './stores/documentStore';
export { useBoardStore } from './stores/boardStore';
export { useCommentStore } from './stores/commentStore';
