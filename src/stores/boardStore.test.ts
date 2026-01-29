import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore } from './boardStore';
import type { TLEditorSnapshot } from 'tldraw';

describe('Board Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBoardStore.setState({ boards: {} });
  });

  describe('createBoard', () => {
    it('should create a new board with given ID', () => {
      const { createBoard, getBoardSnapshot } = useBoardStore.getState();

      createBoard('board-1');

      const snapshot = getBoardSnapshot('board-1');
      expect(snapshot).toBeDefined();
    });

    it('should create multiple boards independently', () => {
      const { createBoard, getAllBoards } = useBoardStore.getState();

      createBoard('board-1');
      createBoard('board-2');
      createBoard('board-3');

      const boards = getAllBoards();
      expect(Object.keys(boards)).toHaveLength(3);
      expect(boards['board-1']).toBeDefined();
      expect(boards['board-2']).toBeDefined();
      expect(boards['board-3']).toBeDefined();
    });
  });

  describe('setBoardSnapshot', () => {
    it('should save snapshot for existing board', () => {
      const { createBoard, setBoardSnapshot, getBoardSnapshot } = useBoardStore.getState();

      createBoard('board-1');

      const mockSnapshot = {
        document: { id: 'doc-1' },
        session: { version: 1 },
      } as unknown as TLEditorSnapshot;

      setBoardSnapshot('board-1', mockSnapshot);

      const retrieved = getBoardSnapshot('board-1');
      expect(retrieved).toEqual(mockSnapshot);
    });

    it('should create board if it does not exist', () => {
      const { setBoardSnapshot, getBoardSnapshot } = useBoardStore.getState();

      const mockSnapshot = { data: 'test' } as unknown as TLEditorSnapshot;

      setBoardSnapshot('new-board', mockSnapshot);

      expect(getBoardSnapshot('new-board')).toEqual(mockSnapshot);
    });

    it('should overwrite existing snapshot', () => {
      const { createBoard, setBoardSnapshot, getBoardSnapshot } = useBoardStore.getState();

      createBoard('board-1');

      const snapshot1 = { version: 1 } as unknown as TLEditorSnapshot;
      const snapshot2 = { version: 2 } as unknown as TLEditorSnapshot;

      setBoardSnapshot('board-1', snapshot1);
      setBoardSnapshot('board-1', snapshot2);

      expect(getBoardSnapshot('board-1')).toEqual(snapshot2);
    });
  });

  describe('getBoardSnapshot', () => {
    it('should return undefined for non-existent board', () => {
      const { getBoardSnapshot } = useBoardStore.getState();

      const snapshot = getBoardSnapshot('non-existent');

      expect(snapshot).toBeUndefined();
    });

    it('should return correct snapshot for existing board', () => {
      const { createBoard, setBoardSnapshot, getBoardSnapshot } = useBoardStore.getState();

      createBoard('board-1');
      createBoard('board-2');

      const snapshot1 = { id: 1 } as unknown as TLEditorSnapshot;
      const snapshot2 = { id: 2 } as unknown as TLEditorSnapshot;

      setBoardSnapshot('board-1', snapshot1);
      setBoardSnapshot('board-2', snapshot2);

      expect(getBoardSnapshot('board-1')).toEqual(snapshot1);
      expect(getBoardSnapshot('board-2')).toEqual(snapshot2);
    });
  });

  describe('deleteBoard', () => {
    it('should remove board from store', () => {
      const { createBoard, deleteBoard, getBoardSnapshot } = useBoardStore.getState();

      createBoard('board-1');
      expect(getBoardSnapshot('board-1')).toBeDefined();

      deleteBoard('board-1');

      expect(useBoardStore.getState().getBoardSnapshot('board-1')).toBeUndefined();
    });

    it('should not affect other boards', () => {
      const { createBoard, deleteBoard, getAllBoards } = useBoardStore.getState();

      createBoard('board-1');
      createBoard('board-2');
      createBoard('board-3');

      deleteBoard('board-2');

      const boards = useBoardStore.getState().getAllBoards();
      expect(Object.keys(boards)).toHaveLength(2);
      expect(boards['board-1']).toBeDefined();
      expect(boards['board-2']).toBeUndefined();
      expect(boards['board-3']).toBeDefined();
    });

    it('should handle deleting non-existent board gracefully', () => {
      const { deleteBoard, getAllBoards } = useBoardStore.getState();

      // Should not throw
      expect(() => deleteBoard('non-existent')).not.toThrow();
      expect(getAllBoards()).toEqual({});
    });
  });

  describe('loadBoards', () => {
    it('should replace all boards with provided data', () => {
      const { createBoard, loadBoards, getAllBoards } = useBoardStore.getState();

      // Create some initial boards
      createBoard('old-board-1');
      createBoard('old-board-2');

      // Load new boards
      const newBoards = {
        'new-board-1': { data: 1 } as unknown as TLEditorSnapshot,
        'new-board-2': { data: 2 } as unknown as TLEditorSnapshot,
      };

      loadBoards(newBoards);

      const boards = getAllBoards();
      expect(Object.keys(boards)).toHaveLength(2);
      expect(boards['old-board-1']).toBeUndefined();
      expect(boards['new-board-1']).toBeDefined();
      expect(boards['new-board-2']).toBeDefined();
    });

    it('should handle empty boards object', () => {
      const { createBoard, loadBoards, getAllBoards } = useBoardStore.getState();

      createBoard('board-1');
      loadBoards({});

      expect(getAllBoards()).toEqual({});
    });
  });

  describe('clearBoards', () => {
    it('should remove all boards', () => {
      const { createBoard, clearBoards, getAllBoards } = useBoardStore.getState();

      createBoard('board-1');
      createBoard('board-2');
      createBoard('board-3');

      expect(Object.keys(getAllBoards())).toHaveLength(3);

      clearBoards();

      expect(useBoardStore.getState().getAllBoards()).toEqual({});
    });
  });

  describe('getAllBoards', () => {
    it('should return empty object when no boards exist', () => {
      const { getAllBoards } = useBoardStore.getState();

      expect(getAllBoards()).toEqual({});
    });

    it('should return all boards with their snapshots', () => {
      const { createBoard, setBoardSnapshot, getAllBoards } = useBoardStore.getState();

      createBoard('board-1');
      createBoard('board-2');

      setBoardSnapshot('board-1', { test: 1 } as unknown as TLEditorSnapshot);
      setBoardSnapshot('board-2', { test: 2 } as unknown as TLEditorSnapshot);

      const boards = getAllBoards();
      expect(boards).toEqual({
        'board-1': { test: 1 },
        'board-2': { test: 2 },
      });
    });
  });
});
