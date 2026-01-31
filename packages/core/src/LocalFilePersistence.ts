import type { DocumentPersistence } from './persistence';
import type { DarDocsDocument, DocumentMetadata } from './documentSchema';
import { serializeDocument, deserializeDocument, generateFilename, readFileAsText } from './serialization';

/**
 * Persistence adapter for local file download/upload.
 * save() triggers a browser file download.
 * loadFromFile() reads from a File object (e.g. from a file picker).
 */
export class LocalFilePersistence implements DocumentPersistence {
  async save(doc: DarDocsDocument): Promise<void> {
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

  async load(_id: string): Promise<DarDocsDocument> {
    throw new Error('Use loadFromFile() for local file persistence');
  }

  async loadFromFile(file: File): Promise<DarDocsDocument> {
    const text = await readFileAsText(file);
    return deserializeDocument(text);
  }

  async list(): Promise<DocumentMetadata[]> {
    return [];
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Delete not supported for local file persistence');
  }
}
