import Dexie from 'dexie';
import type { DarDocsDocument } from './documentSchema';
import type { WorkspaceConfig } from './workspace/types';

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
  workspaceConfig!: Dexie.Table<WorkspaceConfig, string>;

  constructor() {
    super('dardocs');

    this.version(1).stores({
      documents: 'metadata.id',
      tree: 'id, parentId',
    });

    this.version(2).stores({
      documents: 'metadata.id',
      tree: 'id, parentId',
      workspaceConfig: 'key',
    });
  }
}

export const db = new DarDocsDB();
