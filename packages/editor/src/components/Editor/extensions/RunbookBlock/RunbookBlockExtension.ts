import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { RunbookBlockComponent } from './RunbookBlockComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    runbookBlock: {
      insertRunbook: (options?: { title?: string }) => ReturnType;
    };
  }
}

export const RunbookBlockExtension = Node.create({
  name: 'runbookBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      runbookId: {
        default: null,
      },
      title: {
        default: 'Untitled Runbook',
      },
      steps: {
        default: [],
      },
      status: {
        default: 'idle',
      },
      startedAt: {
        default: null,
      },
      completedAt: {
        default: null,
      },
      conclusion: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="runbook-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'runbook-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RunbookBlockComponent);
  },

  addCommands() {
    return {
      insertRunbook:
        (options?: { title?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              runbookId: crypto.randomUUID(),
              title: options?.title || 'Untitled Runbook',
              steps: [],
              status: 'idle',
            },
          });
        },
    };
  },
});
