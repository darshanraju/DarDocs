import type { DocumentPersistence } from './persistence';
import type { DarDocsDocument, DocumentMetadata } from './documentSchema';
import { createNewDocument } from './documentSchema';
import { db } from './db';
import type { DocTreeNode } from './db';

export class IndexedDBPersistence implements DocumentPersistence {
  async save(doc: DarDocsDocument): Promise<void> {
    await db.documents.put(doc, doc.metadata.id);
    // Ensure tree node exists
    const existing = await db.tree.get(doc.metadata.id);
    if (!existing) {
      await this.addTreeNode(doc.metadata.id, null, doc.metadata.title);
    } else if (existing.title !== doc.metadata.title) {
      await db.tree.update(doc.metadata.id, {
        title: doc.metadata.title,
        updatedAt: doc.metadata.updatedAt,
      });
    }
  }

  async load(id: string): Promise<DarDocsDocument> {
    const doc = await db.documents.get(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    return doc;
  }

  async list(): Promise<DocumentMetadata[]> {
    const docs = await db.documents.toArray();
    return docs.map((d) => d.metadata);
  }

  async delete(id: string): Promise<void> {
    // Delete document and all descendants
    const descendants = await this.getDescendantIds(id);
    const allIds = [id, ...descendants];
    await db.documents.bulkDelete(allIds);
    await db.tree.bulkDelete(allIds);
  }

  // --- Tree operations ---

  async getTree(): Promise<DocTreeNode[]> {
    return db.tree.toArray();
  }

  async getChildren(parentId: string | null): Promise<DocTreeNode[]> {
    if (parentId === null) {
      return db.tree.where('parentId').equals('__root__').sortBy('position');
    }
    return db.tree.where('parentId').equals(parentId).sortBy('position');
  }

  async addTreeNode(
    id: string,
    parentId: string | null,
    title: string
  ): Promise<DocTreeNode> {
    const siblings = await this.getChildren(parentId);
    const position =
      siblings.length > 0
        ? siblings[siblings.length - 1].position + 1
        : 0;

    const now = new Date().toISOString();
    const node: DocTreeNode = {
      id,
      parentId: parentId ?? '__root__',
      position,
      title,
      createdAt: now,
      updatedAt: now,
    };
    await db.tree.put(node);
    return node;
  }

  async moveNode(
    id: string,
    newParentId: string | null,
    newPosition: number
  ): Promise<void> {
    await db.tree.update(id, {
      parentId: newParentId ?? '__root__',
      position: newPosition,
      updatedAt: new Date().toISOString(),
    });
  }

  async createDocument(
    title: string,
    parentId: string | null
  ): Promise<DarDocsDocument> {
    const doc = createNewDocument(title || 'Untitled');
    await db.documents.put(doc, doc.metadata.id);
    await this.addTreeNode(doc.metadata.id, parentId, doc.metadata.title);
    return doc;
  }

  async updateTreeNodeTitle(id: string, title: string): Promise<void> {
    await db.tree.update(id, {
      title,
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Helpers ---

  private async getDescendantIds(id: string): Promise<string[]> {
    const children = await db.tree.where('parentId').equals(id).toArray();
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      const grandchildren = await this.getDescendantIds(child.id);
      ids.push(...grandchildren);
    }
    return ids;
  }
}
