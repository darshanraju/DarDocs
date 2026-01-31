/**
 * SelectionHighlight — Tiptap extension that visually highlights block nodes
 * (images, videos, tables, boards, embeds, mermaid diagrams, whiteboards)
 * when they fall within a drag (text) selection.
 *
 * Uses view.nodeDOM() to apply a CSS class directly, which works reliably
 * across all node view implementations (React, plain DOM, etc.).
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';

const BLOCK_TYPES = new Set([
  'image',
  'videoBlock',
  'boardBlock',
  'embedBlock',
  'mermaidBlock',
  'whiteboard2Block',
  'table',
]);

const SELECTED_CLASS = 'block-node-selected';

export const SelectionHighlight = Extension.create({
  name: 'selectionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('selectionHighlight'),
        view() {
          let prevElements: HTMLElement[] = [];

          return {
            update(view) {
              // Clear previous highlights
              prevElements.forEach((el) => el.classList.remove(SELECTED_CLASS));
              prevElements = [];

              const { state } = view;
              const { selection } = state;

              // NodeSelection is handled by component's own `selected` prop
              if (selection instanceof NodeSelection) return;

              const { from, to } = selection;
              if (from === to) return;

              state.doc.nodesBetween(from, to, (node, pos) => {
                if (BLOCK_TYPES.has(node.type.name)) {
                  const nodeEnd = pos + node.nodeSize;
                  // Only highlight nodes fully contained in the selection
                  if (pos >= from && nodeEnd <= to) {
                    const dom = view.nodeDOM(pos);
                    if (dom instanceof HTMLElement) {
                      dom.classList.add(SELECTED_CLASS);
                      prevElements.push(dom);
                    }
                    return false; // Don't descend into highlighted nodes
                  }
                  // If not fully selected, still descend (e.g. image inside a table)
                }
              });
            },
            destroy() {
              prevElements.forEach((el) => el.classList.remove(SELECTED_CLASS));
              prevElements = [];
            },
          };
        },
      }),
    ];
  },
});
