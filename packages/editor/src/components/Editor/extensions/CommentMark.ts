import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: (commentId: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.commentId) return {};
          return { 'data-comment-id': attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'comment-highlight',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId });
        },
      unsetComment:
        (commentId: string) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { doc } = state;
          const removals: { from: number; to: number }[] = [];

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (
                mark.type.name === this.name &&
                mark.attrs.commentId === commentId
              ) {
                removals.push({ from: pos, to: pos + node.nodeSize });
              }
            });
          });

          const markType = state.schema.marks[this.name];
          removals.reverse().forEach(({ from, to }) => {
            tr.removeMark(from, to, markType);
          });

          dispatch(tr);
          return true;
        },
    };
  },
});
