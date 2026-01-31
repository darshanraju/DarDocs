/**
 * TextEditBridge — Canvas ↔ DOM text editing bridge.
 *
 * Strategy (matches Figma/Lark):
 *   1. User double-clicks a text or shape object
 *   2. Bridge creates a TextEditState with the object's world-space rect
 *   3. React overlay positions a <textarea> at the screen-space location
 *   4. User edits text in the DOM textarea (native cursor, selection, IME)
 *   5. On commit (blur, Enter, Escape) → text is written back to SceneGraph
 *   6. Canvas re-renders with updated text
 *
 * The bridge never touches the DOM directly — it only manages state.
 * The React overlay reads the state and positions the textarea.
 */
import type {
  BoardObject,
  ICommandStack,
  ISceneGraph,
  ITextEditBridge,
  IViewTransform,
  Rect,
  TextEditState,
} from '../types';
import { SceneGraph } from './SceneGraph';
import { createUpdateCommand } from './CommandStack';

export class TextEditBridge implements ITextEditBridge {
  private scene: ISceneGraph;
  private view: IViewTransform;
  private commands: ICommandStack;
  private listeners: Set<() => void> = new Set();

  private editState: TextEditState | null = null;
  private originalText: string = '';

  constructor(scene: ISceneGraph, view: IViewTransform, commands: ICommandStack) {
    this.scene = scene;
    this.view = view;
    this.commands = commands;
  }

  startEdit(objectId: string): void {
    const obj = this.scene.getObject(objectId);
    if (!obj) return;

    // Any object type can have text (rect, ellipse show text centered)
    const bounds = SceneGraph.getBounds(obj);
    this.originalText = obj.text ?? '';

    this.editState = {
      objectId,
      text: this.originalText,
      worldRect: bounds,
      style: { ...obj.style },
    };
    this.emit();
  }

  commitEdit(): void {
    if (!this.editState) return;

    const { objectId, text } = this.editState;
    const obj = this.scene.getObject(objectId);

    if (obj && text !== this.originalText) {
      // For text objects, also auto-size height
      const newProps: Partial<BoardObject> = { text };
      if (obj.type === 'text' && !text) {
        // If text is empty, remove the object
        this.editState = null;
        this.originalText = '';
        this.scene.removeObject(objectId);
        this.emit();
        return;
      }

      this.commands.execute(
        createUpdateCommand(
          this.scene,
          objectId,
          { text: this.originalText },
          newProps,
        ),
      );
    }

    this.editState = null;
    this.originalText = '';
    this.emit();
  }

  cancelEdit(): void {
    if (!this.editState) return;
    // Revert to original text
    this.scene.updateObject(this.editState.objectId, { text: this.originalText });
    this.editState = null;
    this.originalText = '';
    this.emit();
  }

  isEditing(): boolean {
    return this.editState !== null;
  }

  getEditState(): TextEditState | null {
    if (!this.editState) return null;
    // Recompute world rect in case view changed
    const obj = this.scene.getObject(this.editState.objectId);
    if (!obj) return null;
    return {
      ...this.editState,
      worldRect: SceneGraph.getBounds(obj),
    };
  }

  updateText(text: string): void {
    if (!this.editState) return;
    this.editState = { ...this.editState, text };
    // Live preview: update scene immediately (will be committed or reverted)
    this.scene.updateObject(this.editState.objectId, { text });
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
