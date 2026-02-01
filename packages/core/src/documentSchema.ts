import type { JSONContent } from '@tiptap/react';
import type { TLEditorSnapshot } from 'tldraw';

// Comment author (structured user info)
export interface CommentAuthor {
  id: string;
  name: string;
  color?: string;
  avatarUrl?: string;
}

// Reply within a comment thread
export interface CommentReply {
  id: string;
  text: string;
  author: CommentAuthor;
  createdAt: string;
}

// Unified comment type supporting both inline (text-anchored) and document-level comments
export interface Comment {
  id: string;
  type: 'inline' | 'document';
  text: string;
  author: CommentAuthor;
  createdAt: string;
  quotedText?: string;
  replies: CommentReply[];
  resolved: boolean;
  imageUrl?: string;
}

// Main document structure
export interface DarDocsDocument {
  version: "1.0";
  metadata: DocumentMetadata;
  content: JSONContent;
  boards: Record<string, TLEditorSnapshot>;
  comments: Comment[];
}

export interface DocumentMetadata {
  id: string;
  title: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// BoardBlock node attributes (stored in TipTap)
export interface BoardBlockAttrs {
  boardId: string;
  width: number;
  height: number;
}

// Supported TipTap node types
export type NodeType =
  | 'doc'
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'codeBlock'
  | 'blockquote'
  | 'horizontalRule'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'tableHeader'
  | 'boardBlock'
  | 'image'
  | 'videoBlock';

// Supported TipTap mark types
export type MarkType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'link'
  | 'highlight'
  | 'comment';

// Create a new empty document
export function createNewDocument(title: string = 'Untitled Document'): DarDocsDocument {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    metadata: {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
    },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    },
    boards: {},
    comments: [],
  };
}
