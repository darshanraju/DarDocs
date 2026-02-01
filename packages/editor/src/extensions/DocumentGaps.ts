/**
 * DocumentGaps — Ensures the document always ends with a text block
 * (paragraph) so users can click below block nodes (tables, boards,
 * embeds, etc.) to type.
 *
 * Also handles Backspace in empty paragraphs adjacent to block nodes,
 * where ProseMirror's default join-backward has nothing to join with.
 */
import { Extension } from '@tiptap/core';

export const DocumentGaps = Extension.create({
  name: 'documentGaps',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Only handle a collapsed cursor, not a range selection
        if (!selection.empty) return false;

        // Cursor must be at the very start of the block
        if ($from.parentOffset !== 0) return false;

        const parent = $from.parent;
        // Only act on completely empty paragraphs
        if (parent.type.name !== 'paragraph' || parent.textContent.length > 0) return false;

        const depth = $from.depth;
        const grandParent = $from.node(depth - 1);
        const indexInParent = $from.index(depth - 1);

        // Never delete the last remaining child
        if (grandParent.childCount <= 1) return false;

        // If the previous sibling is a textblock, default backspace
        // (join-backward) handles it fine — don't interfere
        if (indexInParent > 0) {
          const prevSibling = grandParent.child(indexInParent - 1);
          if (prevSibling.isTextblock) return false;
        }

        // Delete the empty paragraph
        const from = $from.before(depth);
        const to = $from.after(depth);
        editor.view.dispatch(state.tr.delete(from, to));
        return true;
      },
    };
  },

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
