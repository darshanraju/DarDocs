/**
 * CommandStack — Explicit undo/redo with reversible commands.
 *
 * Every mutation to the scene graph goes through a Command.
 * Commands are atomic, named, and reversible.
 * Stack is bounded (100 entries) to prevent unbounded memory.
 */
import type { Command, ICommandStack } from '../types';

const MAX_STACK_SIZE = 100;

export class CommandStack implements ICommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners: Set<() => void> = new Set();

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action (standard undo/redo semantics)
    this.redoStack = [];
    this.emit();
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo();
    this.redoStack.push(command);
    this.emit();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.execute();
    this.undoStack.push(command);
    this.emit();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

// ─── Command Factories ──────────────────────────────────────────

import type { BoardObject, ISceneGraph } from '../types';

export function createAddCommand(scene: ISceneGraph, obj: BoardObject): Command {
  return {
    id: `add-${obj.id}`,
    description: `Add ${obj.type}`,
    execute: () => scene.addObject(obj),
    undo: () => scene.removeObject(obj.id),
  };
}

export function createRemoveCommand(scene: ISceneGraph, obj: BoardObject): Command {
  return {
    id: `remove-${obj.id}`,
    description: `Remove ${obj.type}`,
    execute: () => scene.removeObject(obj.id),
    undo: () => scene.addObject(obj),
  };
}

export function createUpdateCommand(
  scene: ISceneGraph,
  id: string,
  oldProps: Partial<BoardObject>,
  newProps: Partial<BoardObject>,
): Command {
  return {
    id: `update-${id}-${Date.now()}`,
    description: `Update object`,
    execute: () => scene.updateObject(id, newProps),
    undo: () => scene.updateObject(id, oldProps),
  };
}

export function createBatchMoveCommand(
  scene: ISceneGraph,
  moves: Array<{ id: string; oldX: number; oldY: number; newX: number; newY: number }>,
): Command {
  return {
    id: `move-batch-${Date.now()}`,
    description: `Move ${moves.length} object(s)`,
    execute: () => {
      for (const m of moves) {
        scene.updateObject(m.id, { x: m.newX, y: m.newY });
      }
    },
    undo: () => {
      for (const m of moves) {
        scene.updateObject(m.id, { x: m.oldX, y: m.oldY });
      }
    },
  };
}
