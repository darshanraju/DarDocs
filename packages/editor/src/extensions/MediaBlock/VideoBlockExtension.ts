import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { VideoBlockComponent } from './VideoBlockComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoBlock: {
      insertVideo: (options: { src: string }) => ReturnType;
    };
  }
}

export const VideoBlockExtension = Node.create({
  name: 'videoBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: null },
      alignment: { default: 'center' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'video-block' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockComponent);
  },

  addCommands() {
    return {
      insertVideo:
        (options: { src: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'videoBlock',
            attrs: { src: options.src },
          });
        },
    };
  },
});
