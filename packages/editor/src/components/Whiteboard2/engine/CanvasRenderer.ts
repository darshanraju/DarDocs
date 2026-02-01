/**
 * CanvasRenderer — Immediate-mode rendering of the scene graph.
 *
 * Pure function of state: (scene, view, selection, interaction) → pixels.
 * No retained mode, no display list. Every frame redraws everything visible.
 *
 * Rendering pipeline per frame:
 *   1. Clear canvas
 *   2. Apply DPR scaling
 *   3. Apply view transform (pan + zoom)
 *   4. Cull objects outside viewport
 *   5. Render objects bottom-to-top
 *   6. Render selection UI (handles, marquee)
 *   7. Render drawing preview (current tool operation)
 *   8. Render remote cursors (collaboration)
 *
 * Matches Lark behavior: objects have crisp strokes, selection is blue (#3370ff),
 * handles are white squares with blue border.
 */
import type {
  BoardObject,
  ICanvasRenderer,
  ISceneGraph,
  IViewTransform,
  InteractionState,
  Point,
  Rect,
  SelectionState,
  UserPresence,
} from '../types';
import { HANDLE_SIZE } from '../types';
import { SceneGraph } from './SceneGraph';
import { getHandlePositions } from './HitTest';

const SELECTION_COLOR = '#3370ff';
const HOVER_COLOR = '#3370ff40';
const MARQUEE_FILL = 'rgba(51, 112, 255, 0.08)';
const MARQUEE_STROKE = '#3370ff';
const GRID_COLOR = '#e8e8e8';

export class CanvasRenderer implements ICanvasRenderer {
  private dirty = true;
  private animFrameId: number | null = null;

  setDirty(): void {
    this.dirty = true;
  }

  render(
    ctx: CanvasRenderingContext2D,
    scene: ISceneGraph,
    view: IViewTransform,
    selection: SelectionState,
    interaction: InteractionState,
    presences: UserPresence[],
  ): void {
    const vp = view.getViewport();
    const vs = view.getViewState();
    const canvas = ctx.canvas;

    // Retina: set backing store size
    canvas.width = vp.width * vp.dpr;
    canvas.height = vp.height * vp.dpr;

    ctx.save();

    // Scale for retina
    ctx.scale(vp.dpr, vp.dpr);

    // 1. Clear
    ctx.clearRect(0, 0, vp.width, vp.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, vp.width, vp.height);

    // 2. Draw subtle dot grid (Lark-style)
    this.renderGrid(ctx, view);

    // 3. Apply view transform
    ctx.save();
    ctx.translate(-vs.panX * vs.zoom, -vs.panY * vs.zoom);
    ctx.scale(vs.zoom, vs.zoom);

    // 4. Cull and render objects
    const visibleRect = view.getVisibleWorldRect();
    const objects = scene.getAllObjects();
    for (const obj of objects) {
      const bounds = SceneGraph.getBounds(obj);
      if (!rectsOverlap(bounds, visibleRect)) continue;

      // Hover highlight
      if (selection.hoveredId === obj.id && !selection.selectedIds.has(obj.id)) {
        this.renderHoverHighlight(ctx, obj);
      }

      this.renderObject(ctx, obj);
    }

    // 5. Drawing preview (tool in use)
    if (interaction.drawingObject) {
      this.renderObject(ctx, interaction.drawingObject);
    }

    ctx.restore(); // undo view transform

    // 6. Selection UI (in screen space)
    for (const id of selection.selectedIds) {
      const obj = scene.getObject(id);
      if (obj) this.renderSelectionUI(ctx, obj, view);
    }

    // 7. Marquee rectangle
    if (interaction.mode === 'marquee' && interaction.marqueeRect) {
      this.renderMarquee(ctx, interaction.marqueeRect, view);
    }

    // 8. Remote cursors
    for (const p of presences) {
      if (p.cursor) {
        this.renderRemoteCursor(ctx, p, view);
      }
    }

    ctx.restore(); // undo DPR scale

    this.dirty = false;
  }

  // ─── Object Rendering ───────────────────────────────────────

  private renderObject(ctx: CanvasRenderingContext2D, obj: BoardObject): void {
    ctx.save();

    if (obj.rotation) {
      const bounds = SceneGraph.getBounds(obj);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    const style = obj.style;

    switch (obj.type) {
      case 'rect':
        this.renderRect(ctx, obj, style);
        break;
      case 'ellipse':
        this.renderEllipse(ctx, obj, style);
        break;
      case 'arrow':
        this.renderArrow(ctx, obj, style);
        break;
      case 'path':
        this.renderPath(ctx, obj, style);
        break;
      case 'text':
        this.renderText(ctx, obj, style);
        break;
    }

    ctx.restore();
  }

  private renderRect(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    style: BoardObject['style'],
  ): void {
    const w = obj.width ?? 100;
    const h = obj.height ?? 100;
    const radius = 4;

    ctx.beginPath();
    this.roundRect(ctx, obj.x, obj.y, w, h, radius);

    if (style.fill && style.fill !== 'transparent') {
      ctx.fillStyle = style.fill;
      ctx.fill();
    }
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.strokeWidth ?? 2;
      ctx.stroke();
    }
  }

  private renderEllipse(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    style: BoardObject['style'],
  ): void {
    const w = obj.width ?? 100;
    const h = obj.height ?? 100;
    const cx = obj.x + w / 2;
    const cy = obj.y + h / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);

    if (style.fill && style.fill !== 'transparent') {
      ctx.fillStyle = style.fill;
      ctx.fill();
    }
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.strokeWidth ?? 2;
      ctx.stroke();
    }
  }

  private renderArrow(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    style: BoardObject['style'],
  ): void {
    const sx = obj.startPoint?.x ?? obj.x;
    const sy = obj.startPoint?.y ?? obj.y;
    const ex = obj.endPoint?.x ?? (obj.x + (obj.width ?? 100));
    const ey = obj.endPoint?.y ?? (obj.y + (obj.height ?? 0));

    ctx.strokeStyle = style.stroke ?? '#1e1e1e';
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Line
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(ey - sy, ex - sx);
    const headLen = 12;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(
      ex - headLen * Math.cos(angle - Math.PI / 6),
      ey - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(ex, ey);
    ctx.lineTo(
      ex - headLen * Math.cos(angle + Math.PI / 6),
      ey - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  }

  private renderPath(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    style: BoardObject['style'],
  ): void {
    if (!obj.points || obj.points.length < 2) return;

    ctx.strokeStyle = style.stroke ?? '#1e1e1e';
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(obj.points[0].x, obj.points[0].y);

    // Catmull-Rom smoothing for natural freehand feel
    if (obj.points.length > 2) {
      for (let i = 1; i < obj.points.length - 1; i++) {
        const xc = (obj.points[i].x + obj.points[i + 1].x) / 2;
        const yc = (obj.points[i].y + obj.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(obj.points[i].x, obj.points[i].y, xc, yc);
      }
      const last = obj.points[obj.points.length - 1];
      const prev = obj.points[obj.points.length - 2];
      ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    } else {
      ctx.lineTo(obj.points[1].x, obj.points[1].y);
    }

    ctx.stroke();
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    style: BoardObject['style'],
  ): void {
    if (!obj.text) return;

    const fontSize = style.fontSize ?? 16;
    const fontFamily = style.fontFamily ?? 'Inter, system-ui, sans-serif';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = style.stroke ?? '#1e1e1e';
    ctx.textBaseline = 'top';

    // Simple word-wrap within width
    const maxWidth = obj.width ?? 200;
    const lineHeight = fontSize * 1.4;
    const words = obj.text.split(' ');
    let line = '';
    let y = obj.y;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, obj.x, y);
        line = word;
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, obj.x, y);
  }

  // ─── Selection UI ───────────────────────────────────────────

  private renderHoverHighlight(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
  ): void {
    const bounds = SceneGraph.getBounds(obj);
    ctx.strokeStyle = HOVER_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  private renderSelectionUI(
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    view: IViewTransform,
  ): void {
    const bounds = SceneGraph.getBounds(obj);
    const tl = view.worldToScreen({ x: bounds.x, y: bounds.y });
    const br = view.worldToScreen({
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    });

    const screenW = br.x - tl.x;
    const screenH = br.y - tl.y;

    // Selection rectangle
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(tl.x, tl.y, screenW, screenH);

    // Handles (white squares with blue border)
    const handlePositions = getHandlePositions(bounds);
    const halfH = HANDLE_SIZE / 2;

    for (const [, worldPos] of handlePositions) {
      const sp = view.worldToScreen(worldPos);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sp.x - halfH, sp.y - halfH, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sp.x - halfH, sp.y - halfH, HANDLE_SIZE, HANDLE_SIZE);
    }
  }

  // ─── Marquee ────────────────────────────────────────────────

  private renderMarquee(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    view: IViewTransform,
  ): void {
    const tl = view.worldToScreen({ x: rect.x, y: rect.y });
    const br = view.worldToScreen({
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    });

    ctx.fillStyle = MARQUEE_FILL;
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.strokeStyle = MARQUEE_STROKE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.setLineDash([]);
  }

  // ─── Remote Cursors ─────────────────────────────────────────

  private renderRemoteCursor(
    ctx: CanvasRenderingContext2D,
    presence: UserPresence,
    view: IViewTransform,
  ): void {
    if (!presence.cursor) return;
    const sp = view.worldToScreen(presence.cursor);

    // Cursor arrow
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.fillStyle = presence.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(4.5, 12);
    ctx.lineTo(10, 18);
    ctx.lineTo(13, 15.5);
    ctx.lineTo(7, 9.5);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();

    // Name label
    ctx.font = '11px Inter, system-ui, sans-serif';
    const labelW = ctx.measureText(presence.name).width + 8;
    ctx.fillStyle = presence.color;
    this.roundRect(ctx, 4, 18, labelW, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(presence.name, 8, 31);
    ctx.restore();
  }

  // ─── Grid ───────────────────────────────────────────────────

  private renderGrid(
    ctx: CanvasRenderingContext2D,
    view: IViewTransform,
  ): void {
    const vs = view.getViewState();
    const vp = view.getViewport();
    if (vs.zoom < 0.3) return; // hide grid at extreme zoom-out

    const spacing = 20;
    const visibleWorld = view.getVisibleWorldRect();
    const startX = Math.floor(visibleWorld.x / spacing) * spacing;
    const startY = Math.floor(visibleWorld.y / spacing) * spacing;

    ctx.fillStyle = GRID_COLOR;
    const dotSize = Math.max(1, 1.5 / vs.zoom);

    for (let wx = startX; wx < visibleWorld.x + visibleWorld.width; wx += spacing) {
      for (let wy = startY; wy < visibleWorld.y + visibleWorld.height; wy += spacing) {
        const sp = view.worldToScreen({ x: wx, y: wy });
        ctx.fillRect(sp.x - dotSize / 2, sp.y - dotSize / 2, dotSize, dotSize);
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
