import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ExecutableCodeBlock } from './ExecutableCodeBlock.js';

export const ExecutableCodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ExecutableCodeBlock);
  },
});
