import type { TLEditorSnapshot } from 'tldraw';

export function createEmptyBoardSnapshot(): TLEditorSnapshot {
  return {} as TLEditorSnapshot;
}

export function isBoardEmpty(snapshot: TLEditorSnapshot | undefined): boolean {
  if (!snapshot) return true;
  return Object.keys(snapshot).length === 0;
}

export function mergeBoardSnapshots(
  base: Record<string, TLEditorSnapshot>,
  updates: Record<string, TLEditorSnapshot>
): Record<string, TLEditorSnapshot> {
  return {
    ...base,
    ...updates,
  };
}
