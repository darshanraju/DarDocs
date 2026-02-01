import { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';

interface SlashCommandState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
}

export function useSlashCommands(editor: Editor | null) {
  const [state, setState] = useState<SlashCommandState>({
    isOpen: false,
    query: '',
    position: { top: 0, left: 0 },
  });

  const openMenu = useCallback(
    (query: string = '') => {
      if (!editor) return;

      const { view } = editor;
      const { state: editorState } = view;
      const { selection } = editorState;

      // Get cursor position
      const coords = view.coordsAtPos(selection.from);

      setState({
        isOpen: true,
        query,
        position: {
          top: coords.bottom + 8,
          left: coords.left,
        },
      });
    },
    [editor]
  );

  const closeMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      query: '',
    }));
  }, []);

  const updateQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      query,
    }));
  }, []);

  return {
    ...state,
    openMenu,
    closeMenu,
    updateQuery,
  };
}
