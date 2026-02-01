import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MonitorBlockComponent } from './MonitorBlockComponent';
import type { MonitorProviderId } from '@dardocs/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    monitorBlock: {
      insertMonitor: (options?: { provider?: MonitorProviderId; url?: string }) => ReturnType;
    };
  }
}

export const MonitorBlockExtension = Node.create({
  name: 'monitorBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      provider: {
        default: null,
      },
      url: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="monitor-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'monitor-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MonitorBlockComponent);
  },

  addCommands() {
    return {
      insertMonitor:
        (options?: { provider?: MonitorProviderId; url?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              provider: options?.provider || null,
              url: options?.url || null,
            },
          });
        },
    };
  },
});
