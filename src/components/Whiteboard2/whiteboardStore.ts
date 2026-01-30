/**
 * WhiteboardStore — Zustand store for Whiteboard2 persistence.
 *
 * Snapshot strategy:
 *   - Full snapshot: all objects + viewState + comments
 *   - Snapshots are stored per boardId in the Zustand store
 *   - DarDocs document serialization picks up from this store
 *
 * Cold start:
 *   1. WhiteboardBlock mounts with a boardId
 *   2. Store checks for existing snapshot
 *   3. If found → restoreSnapshot into SceneGraph + ViewTransform + Comments
 *   4. If not → create empty state
 *
 * Recovery:
 *   - On save: throttled snapshot into store
 *   - On document save: store snapshots serialize into .dardocs.json
 *   - Version field enables future data migrations
 */
import { create } from 'zustand';
import type {
  ICommentSystem,
  ISceneGraph,
  IViewTransform,
  WhiteboardSnapshot,
} from './types';
import { DEFAULT_VIEW_STATE } from './types';

const SNAPSHOT_VERSION = '2.0';

interface Whiteboard2Store {
  boards: Record<string, WhiteboardSnapshot>;
  pendingFullscreenBoardId: string | null;

  getSnapshot: (boardId: string) => WhiteboardSnapshot | undefined;
  saveSnapshot: (boardId: string, snapshot: WhiteboardSnapshot) => void;
  deleteBoard: (boardId: string) => void;
  loadBoards: (boards: Record<string, WhiteboardSnapshot>) => void;
  clearBoards: () => void;
  getAllBoards: () => Record<string, WhiteboardSnapshot>;
  setPendingFullscreenBoardId: (boardId: string) => void;
  clearPendingFullscreen: () => void;
}

export const useWhiteboard2Store = create<Whiteboard2Store>((set, get) => ({
  boards: {},
  pendingFullscreenBoardId: null,

  getSnapshot: (boardId: string) => get().boards[boardId],

  saveSnapshot: (boardId: string, snapshot: WhiteboardSnapshot) =>
    set((state) => ({
      boards: { ...state.boards, [boardId]: snapshot },
    })),

  deleteBoard: (boardId: string) =>
    set((state) => {
      const { [boardId]: _, ...rest } = state.boards;
      return { boards: rest };
    }),

  loadBoards: (boards: Record<string, WhiteboardSnapshot>) => set({ boards }),

  clearBoards: () => set({ boards: {} }),

  getAllBoards: () => get().boards,

  setPendingFullscreenBoardId: (boardId: string) =>
    set({ pendingFullscreenBoardId: boardId }),

  clearPendingFullscreen: () =>
    set({ pendingFullscreenBoardId: null }),
}));

// ─── Snapshot Helpers ────────────────────────────────────────────

/** Create a snapshot from live engine state. */
export function createSnapshot(
  scene: ISceneGraph,
  view: IViewTransform,
  comments: ICommentSystem,
): WhiteboardSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    objects: scene.getAllObjects(),
    viewState: view.getViewState(),
    comments: comments.getAllComments(),
  };
}

/** Restore live engine state from a snapshot. */
export function restoreSnapshot(
  snapshot: WhiteboardSnapshot,
  scene: ISceneGraph,
  view: IViewTransform,
  comments: ICommentSystem,
): void {
  scene.loadObjects(snapshot.objects || []);
  view.setViewState(snapshot.viewState || { ...DEFAULT_VIEW_STATE });

  if (snapshot.comments && 'loadComments' in comments) {
    (comments as any).loadComments(snapshot.comments);
  }
}

/** Create an empty snapshot for a new board. */
export function createEmptySnapshot(): WhiteboardSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    objects: [],
    viewState: { ...DEFAULT_VIEW_STATE },
    comments: [],
  };
}
