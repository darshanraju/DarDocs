/**
 * SceneGraph — Pure data store for all BoardObjects.
 *
 * Responsibilities:
 *  - CRUD operations on objects
 *  - Spatial queries (objects in rect)
 *  - Change notification (listeners)
 *  - Z-order via insertion order (array index)
 *
 * No rendering, no interaction, no DOM — pure data.
 */
import type {
  BoardObject,
  ISceneGraph,
  Rect,
  SceneChange,
  SceneChangeListener,
} from '../types';

export class SceneGraph implements ISceneGraph {
  private objects: Map<string, BoardObject> = new Map();
  private order: string[] = []; // z-order: first = bottom
  private listeners: Set<SceneChangeListener> = new Set();

  addObject(obj: BoardObject): void {
    this.objects.set(obj.id, { ...obj });
    this.order.push(obj.id);
    this.emit({ type: 'add', objectIds: [obj.id], objects: [obj] });
  }

  removeObject(id: string): void {
    if (!this.objects.has(id)) return;
    this.objects.delete(id);
    this.order = this.order.filter((oid) => oid !== id);
    this.emit({ type: 'remove', objectIds: [id] });
  }

  updateObject(id: string, partial: Partial<BoardObject>): void {
    const existing = this.objects.get(id);
    if (!existing) return;
    const updated = { ...existing, ...partial, id }; // id is immutable
    if (partial.style) {
      updated.style = { ...existing.style, ...partial.style };
    }
    this.objects.set(id, updated);
    this.emit({ type: 'update', objectIds: [id], objects: [updated] });
  }

  getObject(id: string): BoardObject | undefined {
    const obj = this.objects.get(id);
    return obj ? { ...obj } : undefined;
  }

  /** Returns all objects in z-order (bottom to top). */
  getAllObjects(): BoardObject[] {
    return this.order
      .map((id) => this.objects.get(id))
      .filter((o): o is BoardObject => o !== undefined);
  }

  /** Spatial query: objects whose bounding box intersects the given rect. */
  getObjectsInRect(rect: Rect): BoardObject[] {
    return this.getAllObjects().filter((obj) => {
      const bounds = SceneGraph.getBounds(obj);
      return rectsIntersect(bounds, rect);
    });
  }

  clear(): void {
    const ids = [...this.order];
    this.objects.clear();
    this.order = [];
    this.emit({ type: 'reset', objectIds: ids });
  }

  loadObjects(objects: BoardObject[]): void {
    this.objects.clear();
    this.order = [];
    for (const obj of objects) {
      this.objects.set(obj.id, { ...obj });
      this.order.push(obj.id);
    }
    this.emit({ type: 'reset', objectIds: this.order.slice() });
  }

  subscribe(listener: SceneChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(change: SceneChange): void {
    for (const listener of this.listeners) {
      listener(change);
    }
  }

  /** Compute axis-aligned bounding box for any object type. */
  static getBounds(obj: BoardObject): Rect {
    switch (obj.type) {
      case 'rect':
      case 'ellipse':
      case 'text':
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width ?? 100,
          height: obj.height ?? 40,
        };
      case 'arrow': {
        const sx = obj.startPoint?.x ?? obj.x;
        const sy = obj.startPoint?.y ?? obj.y;
        const ex = obj.endPoint?.x ?? (obj.x + (obj.width ?? 100));
        const ey = obj.endPoint?.y ?? (obj.y + (obj.height ?? 0));
        const minX = Math.min(sx, ex);
        const minY = Math.min(sy, ey);
        return {
          x: minX,
          y: minY,
          width: Math.abs(ex - sx) || 1,
          height: Math.abs(ey - sy) || 1,
        };
      }
      case 'path': {
        if (!obj.points || obj.points.length === 0) {
          return { x: obj.x, y: obj.y, width: 1, height: 1 };
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of obj.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        return {
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1),
        };
      }
    }
  }
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
