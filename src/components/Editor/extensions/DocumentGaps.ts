/**
 * DocumentGaps — Ensures the document always has a text block (paragraph)
 * at the start and end, so users can click above/below block nodes
 * (tables, boards, embeds, etc.) to type.
 *
 * Uses appendTransaction to insert an empty paragraph when the first or
 * last child of the document is a non-textblock node.
 */
import { Extension } from '@tiptap/core';

export const DocumentGaps = Extension.create({
  name: 'documentGaps',

  addOptions() {
    return {
      /**
       * Node types considered "block" for gap purposes.
       * If the doc starts or ends with one of these, a paragraph is inserted.
       * Using `isTextblock` check makes this automatic for all non-text blocks.
       */
    };
  },

  appendTransaction({ transactions }, _oldState, newState) {
    // Only act when the document content actually changed
    if (!transactions.some((t) => t.docChanged)) return null;

    const { schema } = newState;
    const paragraphType = schema.nodes.paragraph;
    if (!paragraphType) return null;

    const tr = newState.tr;
    let modified = false;

    // If the document starts with a non-text block, insert an empty paragraph before it
    const firstChild = tr.doc.firstChild;
    if (firstChild && !firstChild.isTextblock) {
      tr.insert(0, paragraphType.create());
      modified = true;
    }

    // If the document ends with a non-text block, insert an empty paragraph after it
    // (use tr.doc which reflects any prior insert)
    const lastChild = tr.doc.lastChild;
    if (lastChild && !lastChild.isTextblock) {
      tr.insert(tr.doc.content.size, paragraphType.create());
      modified = true;
    }

    return modified ? tr : null;
  },
});
