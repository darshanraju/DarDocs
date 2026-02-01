import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TableOfContentsComponent } from './TableOfContentsComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
    };
  }
}

export const TableOfContentsExtension = Node.create({
  name: 'tableOfContents',

  group: 'block',

  atom: true,

  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="table-of-contents"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'table-of-contents' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsComponent);
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },
});
