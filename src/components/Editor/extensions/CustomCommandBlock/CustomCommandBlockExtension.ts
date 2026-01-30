import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CustomCommandBlockComponent } from './CustomCommandBlockComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customCommandBlock: {
      insertCustomCommand: (options: { commandConfig: string }) => ReturnType;
    };
  }
}

export const CustomCommandBlockExtension = Node.create({
  name: 'customCommandBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      commandConfig: {
        default: '{}',
      },
      lastData: {
        default: null,
      },
      lastUpdated: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="custom-command-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'custom-command-block' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomCommandBlockComponent);
  },

  addCommands() {
    return {
      insertCustomCommand:
        (options: { commandConfig: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              commandConfig: options.commandConfig,
              lastData: null,
              lastUpdated: null,
            },
          });
        },
    };
  },
});
