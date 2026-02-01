import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { readFileAsDataURL, isImageFile, isVideoFile } from './mediaUtils';

export const DropPasteHandler = Extension.create({
  name: 'dropPasteHandler',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handleDrop(view, event, _slice, moved) {
            if (moved) return false;

            const files = event.dataTransfer?.files;
            if (!files?.length) return false;

            const mediaFiles = Array.from(files).filter(
              (f) => isImageFile(f) || isVideoFile(f)
            );
            if (!mediaFiles.length) return false;

            event.preventDefault();

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!coordinates) return false;

            for (const file of mediaFiles) {
              readFileAsDataURL(file).then((dataUrl) => {
                if (isImageFile(file)) {
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(coordinates.pos, {
                      type: 'image',
                      attrs: { src: dataUrl },
                    })
                    .run();
                } else if (isVideoFile(file)) {
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(coordinates.pos, {
                      type: 'videoBlock',
                      attrs: { src: dataUrl },
                    })
                    .run();
                }
              });
            }

            return true;
          },

          handlePaste(_view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            // Check for image files in clipboard
            const imageItem = Array.from(items).find((item) =>
              item.type.startsWith('image/')
            );
            if (!imageItem) return false;

            const file = imageItem.getAsFile();
            if (!file) return false;

            event.preventDefault();

            readFileAsDataURL(file).then((dataUrl) => {
              editor.chain().focus().setImage({ src: dataUrl }).run();
            });

            return true;
          },
        },
      }),
    ];
  },
});
