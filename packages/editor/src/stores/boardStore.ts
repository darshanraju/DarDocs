import { create } from 'zustand';
import type { TLEditorSnapshot } from 'tldraw';

interface BoardStore {
  boards: Record<string, TLEditorSnapshot>;
  pendingFullscreenBoardId: string | null;

  getBoardSnapshot: (boardId: string) => TLEditorSnapshot | undefined;
  setBoardSnapshot: (boardId: string, snapshot: TLEditorSnapshot) => void;
  createBoard: (boardId: string) => void;
  deleteBoard: (boardId: string) => void;
  loadBoards: (boards: Record<string, TLEditorSnapshot>) => void;
  clearBoards: () => void;
  getAllBoards: () => Record<string, TLEditorSnapshot>;
  setPendingFullscreenBoardId: (boardId: string) => void;
  clearPendingFullscreen: () => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  boards: {},
  pendingFullscreenBoardId: null,

  getBoardSnapshot: (boardId: string) => get().boards[boardId],

  setBoardSnapshot: (boardId: string, snapshot: TLEditorSnapshot) =>
    set((state) => ({
      boards: { ...state.boards, [boardId]: snapshot },
    })),

  createBoard: (boardId: string) =>
    set((state) => ({
      boards: { ...state.boards, [boardId]: {} as TLEditorSnapshot },
    })),

  deleteBoard: (boardId: string) =>
    set((state) => {
      const { [boardId]: _, ...rest } = state.boards;
      return { boards: rest };
    }),

  loadBoards: (boards: Record<string, TLEditorSnapshot>) => set({ boards }),

  clearBoards: () => set({ boards: {} }),

  getAllBoards: () => get().boards,

  setPendingFullscreenBoardId: (boardId: string) =>
    set({ pendingFullscreenBoardId: boardId }),

  clearPendingFullscreen: () =>
    set({ pendingFullscreenBoardId: null }),
}));
