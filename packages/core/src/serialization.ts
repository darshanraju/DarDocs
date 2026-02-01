import type { DarDocsDocument } from './schema';
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

  // Ensure comments array exists (backward compat)
  if (!parsed.comments) {
    parsed.comments = [];
  }

  return parsed as DarDocsDocument;
}

// Generate filename from document title
export function generateFilename(title: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return `${sanitized || 'untitled'}${DARDOCS_EXTENSION}`;
}
