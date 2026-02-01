/**
 * CommentSystem — Anchored comments on whiteboard objects.
 *
 * Comments are anchored to a BoardObject by objectId.
 * The anchor screen position is computed from the object's bounding box
 * top-right corner, transformed through the ViewTransform.
 *
 * Pure data layer — no DOM, no rendering.
 */
import type {
  Comment,
  ICommentSystem,
  ISceneGraph,
  IViewTransform,
  Point,
} from '../types';
import { SceneGraph } from './SceneGraph';

export class CommentSystem implements ICommentSystem {
  private comments: Map<string, Comment> = new Map();
  private listeners: Set<() => void> = new Set();

  addComment(objectId: string, text: string, author: string): Comment {
    const comment: Comment = {
      id: crypto.randomUUID(),
      objectId,
      author,
      text,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    this.comments.set(comment.id, comment);
    this.emit();
    return comment;
  }

  removeComment(commentId: string): void {
    this.comments.delete(commentId);
    this.emit();
  }

  resolveComment(commentId: string): void {
    const c = this.comments.get(commentId);
    if (c) {
      this.comments.set(commentId, { ...c, resolved: true });
      this.emit();
    }
  }

  getCommentsForObject(objectId: string): Comment[] {
    return [...this.comments.values()].filter((c) => c.objectId === objectId);
  }

  getAllComments(): Comment[] {
    return [...this.comments.values()];
  }

  /** Returns the screen-space position for a comment anchor badge.
   *  Positioned at the top-right corner of the anchored object. */
  getAnchorScreenPos(
    commentId: string,
    view: IViewTransform,
    scene: ISceneGraph,
  ): Point | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const obj = scene.getObject(comment.objectId);
    if (!obj) return null;

    const bounds = SceneGraph.getBounds(obj);
    // Top-right corner of the object
    return view.worldToScreen({
      x: bounds.x + bounds.width + 4,
      y: bounds.y - 4,
    });
  }

  loadComments(comments: Comment[]): void {
    this.comments.clear();
    for (const c of comments) {
      this.comments.set(c.id, { ...c });
    }
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
