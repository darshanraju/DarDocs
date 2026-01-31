/**
 * WhiteboardBlockExtension — Tiptap Node extension for Whiteboard2.
 *
 * Registers as an atomic, draggable block node with boardId, width, height attrs.
 * Uses ReactNodeViewRenderer to render WhiteboardBlock component.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { WhiteboardBlock } from './components/WhiteboardBlock';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    whiteboard2Block: {
      insertWhiteboard2: (options?: { boardId?: string }) => ReturnType;
    };
  }
}

export const Whiteboard2BlockExtension = Node.create({
  name: 'whiteboard2Block',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      boardId: {
        default: null,
      },
      width: {
        default: 100,
      },
      height: {
        default: 500,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="whiteboard2-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'whiteboard2-block' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardBlock);
  },

  addCommands() {
    return {
      insertWhiteboard2:
        (options?: { boardId?: string }) =>
        ({ commands }) => {
          const boardId = options?.boardId || crypto.randomUUID();
          return commands.insertContent({
            type: this.name,
            attrs: {
              boardId,
              width: 100,
              height: 500,
            },
          });
        },
    };
  },
});
