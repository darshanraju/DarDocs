import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MediaBlockComponent } from './MediaBlockComponent';

export const MediaBlockExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const w = element.getAttribute('data-width');
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.width) return {};
          return { 'data-width': attributes.width };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-alignment') || 'center',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-alignment': attributes.alignment || 'center',
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaBlockComponent);
  },
});
