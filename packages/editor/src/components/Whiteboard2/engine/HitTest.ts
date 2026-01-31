/**
 * HitTest — Pure math for determining what the user clicked.
 *
 * All inputs are in world coordinates.
 * Returns the topmost (highest z-order) hit.
 */
import type {
  BoardObject,
  HitTestResult,
  ISceneGraph,
  IViewTransform,
  Point,
  Rect,
  ResizeHandle,
  SelectionState,
} from '../types';
import { HANDLE_SIZE } from '../types';
import { SceneGraph } from './SceneGraph';

/**
 * Hit test the scene at a screen-space point.
 * Checks selection handles first, then objects top-to-bottom.
 */
export function hitTest(
  screenPoint: Point,
  scene: ISceneGraph,
  view: IViewTransform,
  selection: SelectionState,
): HitTestResult | null {
  const worldPoint = view.screenToWorld(screenPoint);
  const handleSize = HANDLE_SIZE / view.getViewState().zoom;

  // 1. Check resize handles of selected objects first
  if (selection.selectedIds.size === 1) {
    const selectedId = [...selection.selectedIds][0];
    const obj = scene.getObject(selectedId);
    if (obj) {
      const handle = hitTestHandles(worldPoint, obj, handleSize);
      if (handle) {
        return { objectId: selectedId, handle };
      }
    }
  }

  // 2. Check objects in reverse z-order (top-to-bottom)
  const allObjects = scene.getAllObjects();
  for (let i = allObjects.length - 1; i >= 0; i--) {
    const obj = allObjects[i];
    if (hitTestObject(worldPoint, obj, handleSize)) {
      return { objectId: obj.id };
    }
  }

  return null;
}

/** Test if a world-space point hits any resize handle of an object. */
function hitTestHandles(
  point: Point,
  obj: BoardObject,
  handleSize: number,
): ResizeHandle | undefined {
  const bounds = SceneGraph.getBounds(obj);
  const handles = getHandlePositions(bounds);
  const halfH = handleSize / 2;

  for (const [handle, pos] of handles) {
    if (
      Math.abs(point.x - pos.x) <= halfH &&
      Math.abs(point.y - pos.y) <= halfH
    ) {
      return handle;
    }
  }
  return undefined;
}

/** Test if a world-space point hits an object's shape. */
function hitTestObject(
  point: Point,
  obj: BoardObject,
  tolerance: number,
): boolean {
  const strokeW = obj.style.strokeWidth ?? 2;
  const halfStroke = strokeW / 2 + tolerance / 2;

  switch (obj.type) {
    case 'rect':
    case 'text': {
      const b = SceneGraph.getBounds(obj);
      const hasFill = obj.style.fill && obj.style.fill !== 'transparent';
      if (hasFill) {
        return pointInRect(point, b);
      }
      // Stroke-only: check if near edges
      return pointNearRectEdge(point, b, halfStroke);
    }
    case 'ellipse': {
      const cx = obj.x + (obj.width ?? 100) / 2;
      const cy = obj.y + (obj.height ?? 100) / 2;
      const rx = (obj.width ?? 100) / 2;
      const ry = (obj.height ?? 100) / 2;
      const hasFill = obj.style.fill && obj.style.fill !== 'transparent';
      const normalized =
        ((point.x - cx) / (rx + halfStroke)) ** 2 +
        ((point.y - cy) / (ry + halfStroke)) ** 2;
      if (hasFill) {
        return normalized <= 1;
      }
      // Stroke-only: near the ellipse border
      const inner =
        ((point.x - cx) / Math.max(rx - halfStroke, 1)) ** 2 +
        ((point.y - cy) / Math.max(ry - halfStroke, 1)) ** 2;
      return normalized <= 1 && inner >= 1;
    }
    case 'arrow': {
      const sx = obj.startPoint?.x ?? obj.x;
      const sy = obj.startPoint?.y ?? obj.y;
      const ex = obj.endPoint?.x ?? (obj.x + (obj.width ?? 100));
      const ey = obj.endPoint?.y ?? (obj.y + (obj.height ?? 0));
      return pointNearLine(point, { x: sx, y: sy }, { x: ex, y: ey }, halfStroke + 4);
    }
    case 'path': {
      if (!obj.points || obj.points.length < 2) return false;
      for (let i = 1; i < obj.points.length; i++) {
        if (pointNearLine(point, obj.points[i - 1], obj.points[i], halfStroke + 4)) {
          return true;
        }
      }
      return false;
    }
  }
}

// ─── Handle Positions ────────────────────────────────────────────

export function getHandlePositions(
  bounds: Rect,
): Array<[ResizeHandle, Point]> {
  const { x, y, width: w, height: h } = bounds;
  return [
    ['nw', { x, y }],
    ['n', { x: x + w / 2, y }],
    ['ne', { x: x + w, y }],
    ['w', { x, y: y + h / 2 }],
    ['e', { x: x + w, y: y + h / 2 }],
    ['sw', { x, y: y + h }],
    ['s', { x: x + w / 2, y: y + h }],
    ['se', { x: x + w, y: y + h }],
  ];
}

// ─── Geometry Helpers ────────────────────────────────────────────

function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

function pointNearRectEdge(p: Point, r: Rect, threshold: number): boolean {
  if (!pointInExpandedRect(p, r, threshold)) return false;
  // Must be near an edge, not deep inside
  const dx = Math.min(Math.abs(p.x - r.x), Math.abs(p.x - (r.x + r.width)));
  const dy = Math.min(Math.abs(p.y - r.y), Math.abs(p.y - (r.y + r.height)));
  return dx <= threshold || dy <= threshold;
}

function pointInExpandedRect(p: Point, r: Rect, expand: number): boolean {
  return (
    p.x >= r.x - expand &&
    p.x <= r.x + r.width + expand &&
    p.y >= r.y - expand &&
    p.y <= r.y + r.height + expand
  );
}

function pointNearLine(p: Point, a: Point, b: Point, threshold: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y) <= threshold;
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = a.x + t * dx;
  const nearY = a.y + t * dy;
  return Math.hypot(p.x - nearX, p.y - nearY) <= threshold;
}
