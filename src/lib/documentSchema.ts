import type { JSONContent } from '@tiptap/react';
import type { TLEditorSnapshot } from 'tldraw';

// Main document structure
export interface DarDocsDocument {
  version: "1.0";
  metadata: DocumentMetadata;
  content: JSONContent;
  boards: Record<string, TLEditorSnapshot>;
}

export interface DocumentMetadata {
  id: string;
  title: string;
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
  };
}
