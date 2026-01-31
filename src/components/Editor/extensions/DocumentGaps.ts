/**
 * DocumentGaps — Ensures the document always ends with a text block
 * (paragraph) so users can click below block nodes (tables, boards,
 * embeds, etc.) to type.
 *
 * For the top of the document, paragraphs are created on demand
 * (e.g. pressing Enter in the title) rather than enforced continuously,
 * so users can freely delete empty lines above blocks.
 */
import { Extension } from '@tiptap/core';

export const DocumentGaps = Extension.create({
  name: 'documentGaps',

  appendTransaction({ transactions }, _oldState, newState) {
    // Only act when the document content actually changed
    if (!transactions.some((t) => t.docChanged)) return null;

    const { schema } = newState;
    const paragraphType = schema.nodes.paragraph;
    if (!paragraphType) return null;

    // If the document ends with a non-text block, insert an empty paragraph after it
    const lastChild = newState.doc.lastChild;
    if (lastChild && !lastChild.isTextblock) {
      const tr = newState.tr;
      tr.insert(tr.doc.content.size, paragraphType.create());
      return tr;
    }

    return null;
  },
});
