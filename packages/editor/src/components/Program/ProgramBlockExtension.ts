import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ProgramBlockComponent } from './ProgramBlockComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    programBlock: {
      insertProgram: (options?: { programId?: string }) => ReturnType;
    };
  }
}

export const ProgramBlockExtension = Node.create({
  name: 'programBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      programId: { default: null },
      height: { default: 500 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-program-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-program-block': '' })];
  },

  addCommands() {
    return {
      insertProgram:
        (options) =>
        ({ commands }) => {
          const programId = options?.programId || crypto.randomUUID();
          return commands.insertContent({
            type: this.name,
            attrs: { programId },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProgramBlockComponent);
  },
});
