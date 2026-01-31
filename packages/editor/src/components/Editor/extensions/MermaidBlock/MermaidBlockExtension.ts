import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidBlockComponent } from './MermaidBlockComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaid: (options?: { code?: string }) => ReturnType;
    };
  }
}

const DEFAULT_MERMAID_CODE = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[OK]
    B -->|No| D[Cancel]`;

export const MermaidBlockExtension = Node.create({
  name: 'mermaidBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      code: {
        default: DEFAULT_MERMAID_CODE,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockComponent);
  },

  addCommands() {
    return {
      insertMermaid:
        (options?: { code?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: options?.code || DEFAULT_MERMAID_CODE,
            },
          });
        },
    };
  },
});
