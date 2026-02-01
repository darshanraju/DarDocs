/**
 * Whiteboard2 — Type Contracts & Module Interfaces
 *
 * Architecture:
 *   WhiteboardBlock (React)
 *    ├── CanvasRenderer      — pure render from scene + view state
 *    ├── SceneGraph           — object storage, spatial queries
 *    ├── InteractionController — pointer/keyboard → commands
 *    ├── OverlayLayer (DOM)   — text editing, comments, cursors
 *    ├── CommentSystem        — anchored comments
 *    └── CollaborationAdapter — Yjs CRDT binding
 *
 * Coordinate Systems:
 *   World:  infinite 2D plane where objects live (origin top-left conceptually)
 *   Screen: canvas pixel coordinates (0,0 = canvas top-left)
 *   Transform: screen = (world - pan) * zoom
 *   Inverse:  world = screen / zoom + pan
 *
 * All rendering, syncing, and persistence derive from BoardObject.
 */

// ─── Core Data Model (Canonical) ─────────────────────────────────

export interface BoardObjectStyle {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface BoardObject {
  id: string;
  type: 'rect' | 'ellipse' | 'arrow' | 'path' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  style: BoardObjectStyle;
  text?: string;
  /** Freehand path points (type='path') */
  points?: Point[];
  /** Arrow endpoint anchors (type='arrow') */
  startPoint?: Point;
  endPoint?: Point;
}

// ─── Geometry Primitives ─────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── View Transform ──────────────────────────────────────────────

export interface ViewState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

export interface IViewTransform {
  worldToScreen(p: Point): Point;
  screenToWorld(p: Point): Point;
  getViewState(): ViewState;
  setViewState(state: ViewState): void;
  pan(dx: number, dy: number): void;
  zoomTo(zoom: number, center?: Point): void;
  zoomBy(factor: number, center: Point): void;
  getViewport(): Viewport;
  setViewport(vp: Viewport): void;
  getVisibleWorldRect(): Rect;
}

// ─── Scene Graph ─────────────────────────────────────────────────

export type SceneChangeType = 'add' | 'remove' | 'update' | 'batch' | 'reset';

export interface SceneChange {
  type: SceneChangeType;
  objectIds: string[];
  objects?: BoardObject[];
}

export type SceneChangeListener = (change: SceneChange) => void;

export interface ISceneGraph {
  addObject(obj: BoardObject): void;
  removeObject(id: string): void;
  updateObject(id: string, partial: Partial<BoardObject>): void;
  getObject(id: string): BoardObject | undefined;
  getAllObjects(): BoardObject[];
  getObjectsInRect(rect: Rect): BoardObject[];
  clear(): void;
  loadObjects(objects: BoardObject[]): void;
  subscribe(listener: SceneChangeListener): () => void;
}

// ─── Canvas Renderer ─────────────────────────────────────────────

export interface ICanvasRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    scene: ISceneGraph,
    view: IViewTransform,
    selection: SelectionState,
    interaction: InteractionState,
    presences: UserPresence[],
  ): void;
  setDirty(): void;
}

// ─── Hit Testing ─────────────────────────────────────────────────

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w'  |        'e'
  | 'sw' | 's' | 'se'
  | 'rotate';

export interface HitTestResult {
  objectId: string;
  handle?: ResizeHandle;
}

// ─── Selection ───────────────────────────────────────────────────

export interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;
}

// ─── Interaction ─────────────────────────────────────────────────

export type ToolType = 'select' | 'rect' | 'ellipse' | 'arrow' | 'path' | 'text';

export type InteractionMode =
  | 'idle'
  | 'dragging'
  | 'resizing'
  | 'drawing'
  | 'marquee'
  | 'panning'
  | 'textEditing';

export interface InteractionState {
  tool: ToolType;
  mode: InteractionMode;
  dragStart?: Point;
  dragCurrent?: Point;
  resizeHandle?: ResizeHandle;
  resizeOrigin?: Rect;
  drawingObject?: BoardObject;
  marqueeRect?: Rect;
}

export interface IInteractionController {
  handlePointerDown(e: PointerEvent, canvas: HTMLCanvasElement): void;
  handlePointerMove(e: PointerEvent, canvas: HTMLCanvasElement): void;
  handlePointerUp(e: PointerEvent, canvas: HTMLCanvasElement): void;
  handleWheel(e: WheelEvent): void;
  handleKeyDown(e: KeyboardEvent): void;
  handleDoubleClick(e: MouseEvent, canvas: HTMLCanvasElement): void;
  setTool(tool: ToolType): void;
  getTool(): ToolType;
  getInteractionState(): InteractionState;
  getSelection(): SelectionState;
  subscribe(listener: () => void): () => void;
}

// ─── Command Stack (Undo / Redo) ─────────────────────────────────

export interface Command {
  id: string;
  description: string;
  execute(): void;
  undo(): void;
}

export interface ICommandStack {
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

// ─── Text Editing Bridge ─────────────────────────────────────────

export interface TextEditState {
  objectId: string;
  text: string;
  worldRect: Rect;
  style: BoardObjectStyle;
}

export interface ITextEditBridge {
  startEdit(objectId: string): void;
  commitEdit(): void;
  cancelEdit(): void;
  isEditing(): boolean;
  getEditState(): TextEditState | null;
  updateText(text: string): void;
  subscribe(listener: () => void): () => void;
}

// ─── Comment System ──────────────────────────────────────────────

export interface Comment {
  id: string;
  objectId: string;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

export interface ICommentSystem {
  addComment(objectId: string, text: string, author: string): Comment;
  removeComment(commentId: string): void;
  resolveComment(commentId: string): void;
  getCommentsForObject(objectId: string): Comment[];
  getAllComments(): Comment[];
  getAnchorScreenPos(
    commentId: string,
    view: IViewTransform,
    scene: ISceneGraph,
  ): Point | null;
  subscribe(listener: () => void): () => void;
}

// ─── Collaboration (Yjs CRDT) ────────────────────────────────────

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
  selectedIds: string[];
}

export type CollaborationEventType =
  | 'remote-change'
  | 'presence-update'
  | 'connect'
  | 'disconnect';

export interface CollaborationEvent {
  type: CollaborationEventType;
  objects?: BoardObject[];
  presences?: UserPresence[];
}

export type CollaborationListener = (event: CollaborationEvent) => void;

export interface ICollaborationAdapter {
  connect(roomId: string): void;
  disconnect(): void;
  isConnected(): boolean;
  applyLocalChange(change: SceneChange, objects: BoardObject[]): void;
  setPresence(presence: Partial<UserPresence>): void;
  getRemotePresences(): UserPresence[];
  onRemoteChange(listener: (objects: BoardObject[]) => void): () => void;
  subscribe(listener: CollaborationListener): () => void;
}

// ─── Persistence & Snapshots ─────────────────────────────────────

export interface WhiteboardSnapshot {
  version: string;
  objects: BoardObject[];
  viewState: ViewState;
  comments: Comment[];
}

// ─── Whiteboard Block Lifecycle ──────────────────────────────────

export type WhiteboardLifecycle =
  | 'unmounted'
  | 'initializing'
  | 'ready'
  | 'disposing';

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_STYLE: BoardObjectStyle = {
  stroke: '#1e1e1e',
  fill: 'transparent',
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const DEFAULT_VIEW_STATE: ViewState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const HANDLE_SIZE = 8;
export const ROTATION_HANDLE_OFFSET = 24;
export const SNAP_THRESHOLD = 5;
