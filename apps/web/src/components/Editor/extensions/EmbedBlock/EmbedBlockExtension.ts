import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EmbedBlockComponent } from './EmbedBlockComponent';
import type { EmbedType } from './embedUtils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedBlock: {
      insertEmbed: (options: { embedType: EmbedType; url?: string }) => ReturnType;
    };
  }
}

export const EmbedBlockExtension = Node.create({
  name: 'embedBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      embedType: {
        default: 'figma',
      },
      url: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'embed-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedBlockComponent);
  },

  addCommands() {
    return {
      insertEmbed:
        (options: { embedType: EmbedType; url?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              embedType: options.embedType,
              url: options.url || null,
            },
          });
        },
    };
  },
});
