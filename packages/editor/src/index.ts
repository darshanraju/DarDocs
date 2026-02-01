// Stores
export { useDocumentStore } from './stores/documentStore';
export { useBoardStore } from './stores/boardStore';
export { useCommentStore } from './stores/commentStore';
export { useThemeStore } from './stores/themeStore';
export { useWorkspaceStore } from './stores/workspaceStore';
export type { TreeNode } from './stores/workspaceStore';
export { useWorkspaceConfigStore } from './stores/workspaceConfigStore';
export { useAuthStore } from './stores/authStore';

// API client
export { authApi, workspacesApi, documentsApi, commentsApi, membersApi, executeApi, ApiError } from './lib/api';
export type { AuthUser, Workspace, DocTreeItem, DocFull, ApiComment, ApiCommentReply, WorkspaceMember, ExecResult } from './lib/api';

// Hooks
export { useDocument } from './hooks/useDocument';
export { useEditorActions } from './hooks/useEditor';
export { useFileSystem } from './hooks/useFileSystem';
export { useSlashCommands } from './hooks/useSlashCommands';

// Editor
export { Editor } from './components/Editor/Editor';
export { SearchBar } from './components/Editor/SearchBar';

// Viewer
export { DocumentViewer } from './components/Viewer/DocumentViewer';

// Layout components
export { TableOfContents } from './components/TableOfContents/TableOfContents';
export { Sidebar } from './components/Sidebar/Sidebar';
export { CommentSection } from './components/Comments/CommentSection';
export { CommentsSidebar } from './components/Comments/CommentsSidebar';

// File handlers
export { SaveDocument } from './components/FileHandler/SaveDocument';
export { LoadDocument } from './components/FileHandler/LoadDocument';
export { ImportDocx } from './components/FileHandler/ImportDocx';

// UI primitives
export { Button, Dropdown, Modal, Tooltip, EmojiPicker, DocumentIcon } from './components/UI';
