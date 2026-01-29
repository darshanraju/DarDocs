import type { OpenDocsDocument } from './documentSchema';
import { OPENDOCS_EXTENSION } from './constants';

// Serialize document to JSON string
export function serializeDocument(doc: OpenDocsDocument): string {
  return JSON.stringify(doc, null, 2);
}

// Deserialize JSON string to document
export function deserializeDocument(json: string): OpenDocsDocument {
  const parsed = JSON.parse(json);

  // Validate document structure
  if (!parsed.version || !parsed.metadata || !parsed.content) {
    throw new Error('Invalid document format');
  }

  // Ensure boards object exists
  if (!parsed.boards) {
    parsed.boards = {};
  }

  return parsed as OpenDocsDocument;
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

  return `${sanitized || 'untitled'}${OPENDOCS_EXTENSION}`;
}

// Download document as file
export function downloadDocument(doc: OpenDocsDocument): void {
  const json = serializeDocument(doc);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = generateFilename(doc.metadata.title);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
