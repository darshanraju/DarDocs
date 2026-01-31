import type { DarDocsDocument, DocumentMetadata } from './documentSchema';

/**
 * Abstract persistence interface for document storage.
 * Implement this to swap between local file, API, or other backends.
 */
export interface DocumentPersistence {
  save(doc: DarDocsDocument): Promise<void>;
  load(id: string): Promise<DarDocsDocument>;
  loadFromFile?(file: File): Promise<DarDocsDocument>;
  list(): Promise<DocumentMetadata[]>;
  delete(id: string): Promise<void>;
}
