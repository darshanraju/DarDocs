import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface SlashCommandsOptions {
  onQuery: (query: string) => void;
  onClose: () => void;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      onQuery: () => {},
      onClose: () => {},
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let isActive = false;

    return [
      new Plugin({
        key: new PluginKey('slashCommands'),
        props: {
          handleKeyDown(view, event) {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // Check if slash menu is active
            if (isActive) {
              if (event.key === 'Escape') {
                isActive = false;
                options.onClose();
                return true;
              }
              return false;
            }

            // Detect "/" at start of line or after space
            if (event.key === '/') {
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
              const isValidPosition = textBefore === '' || textBefore.endsWith(' ');

              if (isValidPosition) {
                isActive = true;
                // Don't prevent default - let the "/" be typed
                setTimeout(() => {
                  options.onQuery('');
                }, 0);
              }
            }

            return false;
          },
          handleTextInput(view, _from, _to, _text) {
            if (!isActive) return false;

            // Update query as user types
            setTimeout(() => {
              const $from = view.state.selection.$from;
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset + 1);

              // Find the slash and get query after it
              const slashIndex = textBefore.lastIndexOf('/');
              if (slashIndex !== -1) {
                const query = textBefore.slice(slashIndex + 1);
                options.onQuery(query);
              }
            }, 0);

            return false;
          },
        },
        view() {
          return {
            update(view, _prevState) {
              if (!isActive) return;

              const { state } = view;
              const { selection } = state;
              const { $from } = selection;

              // Check if we should close the menu
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
              if (!textBefore.includes('/')) {
                isActive = false;
                options.onClose();
                return;
              }

              // Update query
              const slashIndex = textBefore.lastIndexOf('/');
              if (slashIndex !== -1) {
                const query = textBefore.slice(slashIndex + 1);
                options.onQuery(query);
              }
            },
          };
        },
      }),
    ];
  },
});
