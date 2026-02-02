import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ArchDiagramComponent } from './ArchDiagramComponent';

export const ArchDiagramExtension = Node.create({
  name: 'archDiagram',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      diagramData: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-arch-diagram]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-arch-diagram': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArchDiagramComponent);
  },
});
