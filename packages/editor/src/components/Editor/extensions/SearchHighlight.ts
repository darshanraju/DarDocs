import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const searchHighlightKey = new PluginKey('searchHighlight');

export interface SearchResult {
  from: number;
  to: number;
}

export interface SearchState {
  searchTerm: string;
  currentIndex: number;
  results: SearchResult[];
}

function findMatches(doc: any, searchTerm: string): SearchResult[] {
  if (!searchTerm) return [];

  const results: SearchResult[] = [];
  const termLower = searchTerm.toLowerCase();

  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return;

    const textLower = node.text.toLowerCase();
    let index = 0;

    while ((index = textLower.indexOf(termLower, index)) !== -1) {
      results.push({
        from: pos + index,
        to: pos + index + searchTerm.length,
      });
      index += searchTerm.length;
    }
  });

  return results;
}

function buildDecorations(doc: any, results: SearchResult[], currentIndex: number): DecorationSet {
  if (results.length === 0) return DecorationSet.empty;

  const decorations = results.map((result, i) =>
    Decoration.inline(result.from, result.to, {
      class: i === currentIndex ? 'search-highlight-current' : 'search-highlight',
    })
  );

  return DecorationSet.create(doc, decorations);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchTerm: (term: string) => ReturnType;
      goToNextSearchResult: () => ReturnType;
      goToPrevSearchResult: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addStorage() {
    return {
      searchTerm: '',
      currentIndex: 0,
      results: [] as SearchResult[],
    } as SearchState;
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ editor, tr, dispatch }) => {
          this.storage.searchTerm = term;
          this.storage.currentIndex = 0;

          if (dispatch) {
            tr.setMeta(searchHighlightKey, { searchTerm: term });
            dispatch(tr);
          }

          // Scroll to first match if available
          if (this.storage.results.length > 0) {
            const result = this.storage.results[0];
            const scrollContainer = document.getElementById('main-scroll-container');
            if (scrollContainer && result) {
              requestAnimationFrame(() => {
                const el = document.querySelector('.search-highlight-current');
                if (el) {
                  const containerRect = scrollContainer.getBoundingClientRect();
                  const elRect = el.getBoundingClientRect();
                  if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }
                }
              });
            }
          }

          return true;
        },

      goToNextSearchResult:
        () =>
        ({ editor, tr, dispatch }) => {
          if (this.storage.results.length === 0) return false;

          this.storage.currentIndex =
            (this.storage.currentIndex + 1) % this.storage.results.length;

          if (dispatch) {
            tr.setMeta(searchHighlightKey, { navigate: true });
            dispatch(tr);
          }

          requestAnimationFrame(() => {
            const el = document.querySelector('.search-highlight-current');
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          });

          return true;
        },

      goToPrevSearchResult:
        () =>
        ({ editor, tr, dispatch }) => {
          if (this.storage.results.length === 0) return false;

          this.storage.currentIndex =
            (this.storage.currentIndex - 1 + this.storage.results.length) %
            this.storage.results.length;

          if (dispatch) {
            tr.setMeta(searchHighlightKey, { navigate: true });
            dispatch(tr);
          }

          requestAnimationFrame(() => {
            const el = document.querySelector('.search-highlight-current');
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          });

          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          this.storage.searchTerm = '';
          this.storage.currentIndex = 0;
          this.storage.results = [];

          if (dispatch) {
            tr.setMeta(searchHighlightKey, { searchTerm: '' });
            dispatch(tr);
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage as SearchState;

    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _oldSet, _oldState, newState) {
            const searchTerm = storage.searchTerm;
            if (!searchTerm) {
              storage.results = [];
              storage.currentIndex = 0;
              return DecorationSet.empty;
            }

            const results = findMatches(newState.doc, searchTerm);
            storage.results = results;

            if (storage.currentIndex >= results.length) {
              storage.currentIndex = Math.max(0, results.length - 1);
            }

            return buildDecorations(newState.doc, results, storage.currentIndex);
          },
        },
        props: {
          decorations(state) {
            return searchHighlightKey.getState(state);
          },
        },
      }),
    ];
  },
});
