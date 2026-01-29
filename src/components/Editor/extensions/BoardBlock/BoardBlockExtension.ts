import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BoardBlockComponent } from './BoardBlockComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    boardBlock: {
      insertBoard: () => ReturnType;
    };
  }
}

export const BoardBlockExtension = Node.create({
  name: 'boardBlock',

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
        default: 400,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="board-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'board-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardBlockComponent);
  },

  addCommands() {
    return {
      insertBoard:
        () =>
        ({ commands }) => {
          const boardId = crypto.randomUUID();
          return commands.insertContent({
            type: this.name,
            attrs: {
              boardId,
              width: 100,
              height: 400,
            },
          });
        },
    };
  },
});
