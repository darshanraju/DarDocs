import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SlackEmbedComponent } from './SlackEmbedComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    slackEmbed: {
      insertSlackEmbed: (url: string) => ReturnType;
    };
  }
}

export const SlackEmbedExtension = Node.create({
  name: 'slackEmbed',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      channel: { default: '' },
      timestamp: { default: '' },
      workspace: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="slack-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'slack-embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SlackEmbedComponent);
  },

  addCommands() {
    return {
      insertSlackEmbed:
        (url: string) =>
        ({ commands }) => {
          // Parse Slack URL to extract info
          const parsed = parseSlackUrl(url);
          return commands.insertContent({
            type: this.name,
            attrs: {
              url,
              channel: parsed.channel,
              timestamp: parsed.timestamp,
              workspace: parsed.workspace,
            },
          });
        },
    };
  },
});

function parseSlackUrl(url: string): { channel: string; timestamp: string; workspace: string } {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Slack URLs: https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP
    return {
      workspace: urlObj.hostname.replace('.slack.com', ''),
      channel: pathParts[1] || '',
      timestamp: pathParts[2] || '',
    };
  } catch {
    return { channel: '', timestamp: '', workspace: '' };
  }
}
