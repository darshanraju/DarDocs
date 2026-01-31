import type { DarDocsDocument, Comment, CommentAuthor } from './documentSchema';
import { DARDOCS_EXTENSION } from './constants';

// Serialize document to JSON string
export function serializeDocument(doc: DarDocsDocument): string {
  return JSON.stringify(doc, null, 2);
}

// Deserialize JSON string to document
export function deserializeDocument(json: string): DarDocsDocument {
  const parsed = JSON.parse(json);

  // Validate document structure
  if (!parsed.version || !parsed.metadata || !parsed.content) {
    throw new Error('Invalid document format');
  }

  // Ensure boards object exists
  if (!parsed.boards) {
    parsed.boards = {};
  }

  // Ensure comments array exists and migrate to unified format (backward compat)
  parsed.comments = (parsed.comments || []).map(migrateComment);

  return parsed as DarDocsDocument;
}

// Generate filename from document title
export function generateFilename(title: string): string {
  // Sanitize title for use as filename
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return `${sanitized || 'untitled'}${DARDOCS_EXTENSION}`;
}

// Migrate a comment from legacy format to the unified Comment type.
// Handles old documents where author was a plain string.
export function migrateComment(raw: unknown): Comment {
  const r = raw as Record<string, unknown>;

  // Handle old format where author was a string
  const author: CommentAuthor = typeof r.author === 'string'
    ? { id: 'legacy', name: r.author, avatarUrl: r.avatarUrl as string | undefined }
    : r.author as CommentAuthor;

  return {
    id: r.id as string,
    type: (r.type as Comment['type']) || (r.quotedText ? 'inline' : 'document'),
    text: (r.text as string) || '',
    author,
    createdAt: r.createdAt as string,
    quotedText: r.quotedText as string | undefined,
    replies: (r.replies as Comment['replies']) || [],
    resolved: (r.resolved as boolean) || false,
    imageUrl: r.imageUrl as string | undefined,
  };
}

// Read file as text
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Read file as ArrayBuffer (for DOCX)
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
