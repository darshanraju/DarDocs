import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const WikiLinkMark = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      docId: { default: null },
      docTitle: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wiki-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'wiki-link',
        class: 'wiki-link',
      }),
      0,
    ];
  },
});
