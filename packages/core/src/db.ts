import Dexie from 'dexie';
import type { DarDocsDocument } from './documentSchema';

/**
 * Workspace document tree node stored alongside each document.
 * parentId = null means root-level document.
 * position is a fractional index for ordering siblings.
 */
export interface DocTreeNode {
  id: string;
  parentId: string | null;
  position: number;
  title: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

class DarDocsDB extends Dexie {
  documents!: Dexie.Table<DarDocsDocument, string>;
  tree!: Dexie.Table<DocTreeNode, string>;

  constructor() {
    super('dardocs');

    this.version(1).stores({
      // Index by metadata.id; also index updatedAt for sorting
      documents: 'metadata.id',
      // Tree nodes indexed by id, parentId for querying children
      tree: 'id, parentId',
    });
  }
}

export const db = new DarDocsDB();
