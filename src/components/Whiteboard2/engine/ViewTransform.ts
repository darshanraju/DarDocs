/**
 * ViewTransform — Coordinate system conversion (world ↔ screen).
 *
 * Transform pipeline:
 *   screenX = (worldX - panX) * zoom
 *   screenY = (worldY - panY) * zoom
 *
 * Retina: canvas CSS size vs backing store size handled via Viewport.dpr.
 * The renderer applies ctx.scale(dpr, dpr) — ViewTransform works in CSS pixels.
 */
import type {
  IViewTransform,
  Point,
  Rect,
  ViewState,
  Viewport,
} from '../types';
import { DEFAULT_VIEW_STATE, MIN_ZOOM, MAX_ZOOM } from '../types';

export class ViewTransform implements IViewTransform {
  private state: ViewState;
  private viewport: Viewport;

  constructor(
    state: ViewState = { ...DEFAULT_VIEW_STATE },
    viewport: Viewport = { width: 800, height: 600, dpr: 1 },
  ) {
    this.state = { ...state };
    this.viewport = { ...viewport };
  }

  worldToScreen(p: Point): Point {
    return {
      x: (p.x - this.state.panX) * this.state.zoom,
      y: (p.y - this.state.panY) * this.state.zoom,
    };
  }

  screenToWorld(p: Point): Point {
    return {
      x: p.x / this.state.zoom + this.state.panX,
      y: p.y / this.state.zoom + this.state.panY,
    };
  }

  getViewState(): ViewState {
    return { ...this.state };
  }

  setViewState(state: ViewState): void {
    this.state = {
      panX: state.panX,
      panY: state.panY,
      zoom: clampZoom(state.zoom),
    };
  }

  pan(dx: number, dy: number): void {
    // dx, dy are in screen pixels — convert to world delta
    this.state.panX -= dx / this.state.zoom;
    this.state.panY -= dy / this.state.zoom;
  }

  zoomTo(zoom: number, center?: Point): void {
    const newZoom = clampZoom(zoom);
    if (center) {
      // Keep the world point under `center` fixed on screen
      const worldCenter = this.screenToWorld(center);
      this.state.zoom = newZoom;
      this.state.panX = worldCenter.x - center.x / newZoom;
      this.state.panY = worldCenter.y - center.y / newZoom;
    } else {
      this.state.zoom = newZoom;
    }
  }

  zoomBy(factor: number, center: Point): void {
    this.zoomTo(this.state.zoom * factor, center);
  }

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  setViewport(vp: Viewport): void {
    this.viewport = { ...vp };
  }

  /** Returns the world-space rectangle currently visible on screen. */
  getVisibleWorldRect(): Rect {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({
      x: this.viewport.width,
      y: this.viewport.height,
    });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}
