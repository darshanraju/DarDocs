import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { GoogleSheetEmbedComponent } from './GoogleSheetEmbedComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    googleSheetEmbed: {
      insertGoogleSheet: (url: string) => ReturnType;
    };
  }
}

export const GoogleSheetEmbedExtension = Node.create({
  name: 'googleSheetEmbed',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      sheetId: { default: '' },
      height: { default: 400 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="google-sheet-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'google-sheet-embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GoogleSheetEmbedComponent);
  },

  addCommands() {
    return {
      insertGoogleSheet:
        (url: string) =>
        ({ commands }) => {
          const sheetId = extractSheetId(url);
          return commands.insertContent({
            type: this.name,
            attrs: {
              url,
              sheetId,
              height: 400,
            },
          });
        },
    };
  },
});

function extractSheetId(url: string): string {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match?.[1] || '';
  } catch {
    return '';
  }
}
