import { create } from 'zustand';
import type { Comment, CommentAuthor, CommentReply } from '@dardocs/core';
import { commentsApi } from '../lib/api.js';
import type { ApiComment } from '../lib/api.js';

// Re-export types for consumers
export type { Comment, CommentReply, CommentAuthor } from '@dardocs/core';

/** Convert API comment shape to client Comment shape */
function toClientComment(c: ApiComment): Comment {
  return {
    id: c.id,
    type: c.type as 'inline' | 'document',
    text: c.text,
    quotedText: c.quotedText ?? undefined,
    author: {
      id: c.author.id,
      name: c.author.name,
      avatarUrl: c.author.avatarUrl ?? undefined,
    },
    createdAt: c.createdAt,
    replies: c.replies.map((r) => ({
      id: r.id,
      text: r.text,
      author: {
        id: r.author.id,
        name: r.author.name,
        avatarUrl: r.author.avatarUrl ?? undefined,
      },
      createdAt: r.createdAt,
    })),
    resolved: c.resolved,
  };
}

interface CommentStore {
  comments: Comment[];
  activeCommentId: string | null;
  currentUser: CommentAuthor;
  documentId: string | null;

  // Persistence: load comments from API, get comments for serialization
  loadComments: (comments: Comment[]) => void;
  loadFromApi: (documentId: string) => Promise<void>;
  getComments: () => Comment[];
  clearComments: () => void;
  setCurrentUser: (user: CommentAuthor) => void;

  // Inline comment (text-anchored)
  addComment: (commentId: string, text: string, quotedText: string) => void;

  // Document-level comment
  addDocumentComment: (text: string, imageUrl?: string) => void;

  updateCommentText: (commentId: string, text: string) => void;
  addReply: (commentId: string, text: string) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  setActiveComment: (commentId: string | null) => void;
}

export const useCommentStore = create<CommentStore>((set, get) => ({
  comments: [],
  activeCommentId: null,
  currentUser: { id: 'anonymous', name: 'Anonymous' },
  documentId: null,

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  loadComments: (comments) => {
    set({ comments, activeCommentId: null });
  },

  loadFromApi: async (documentId) => {
    set({ documentId });
    try {
      const apiComments = await commentsApi.list(documentId);
      set({
        comments: apiComments.map(toClientComment),
        activeCommentId: null,
      });
    } catch {
      // If API fails (e.g., offline), keep empty
      set({ comments: [], activeCommentId: null });
    }
  },

  getComments: () => get().comments,

  clearComments: () => {
    set({ comments: [], activeCommentId: null, documentId: null });
  },

  addComment: (commentId, text, quotedText) => {
    const { currentUser, documentId } = get();
    const comment: Comment = {
      id: commentId,
      type: 'inline',
      text,
      quotedText,
      author: currentUser,
      createdAt: new Date().toISOString(),
      replies: [],
      resolved: false,
    };
    set(state => ({
      comments: [...state.comments, comment],
      activeCommentId: commentId,
    }));

    // Persist to API
    if (documentId) {
      commentsApi.create(documentId, {
        id: commentId,
        type: 'inline',
        text,
        quotedText,
      }).catch(() => { /* best-effort */ });
    }
  },

  addDocumentComment: (text, _imageUrl) => {
    const { currentUser, documentId } = get();
    const id = crypto.randomUUID();
    const comment: Comment = {
      id,
      type: 'document',
      text,
      author: currentUser,
      createdAt: new Date().toISOString(),
      replies: [],
      resolved: false,
    };
    set(state => ({
      comments: [...state.comments, comment],
    }));

    if (documentId) {
      commentsApi.create(documentId, {
        id,
        type: 'document',
        text,
      }).catch(() => {});
    }
  },

  updateCommentText: (commentId, text) => {
    set(state => ({
      comments: state.comments.map(c =>
        c.id === commentId ? { ...c, text } : c
      ),
    }));

    commentsApi.update(commentId, { text }).catch(() => {});
  },

  addReply: (commentId, text) => {
    const { currentUser } = get();
    const reply: CommentReply = {
      id: crypto.randomUUID(),
      text,
      author: currentUser,
      createdAt: new Date().toISOString(),
    };
    set(state => ({
      comments: state.comments.map(c =>
        c.id === commentId
          ? { ...c, replies: [...c.replies, reply] }
          : c
      ),
    }));

    // Persist — the API will generate its own reply ID
    commentsApi.reply(commentId, text).catch(() => {});
  },

  resolveComment: (commentId) => {
    set(state => ({
      comments: state.comments.map(c =>
        c.id === commentId ? { ...c, resolved: true } : c
      ),
      activeCommentId: state.activeCommentId === commentId ? null : state.activeCommentId,
    }));

    commentsApi.update(commentId, { resolved: true }).catch(() => {});
  },

  deleteComment: (commentId) => {
    set(state => ({
      comments: state.comments.filter(c => c.id !== commentId),
      activeCommentId: state.activeCommentId === commentId ? null : state.activeCommentId,
    }));

    commentsApi.delete(commentId).catch(() => {});
  },

  setActiveComment: (commentId) => {
    set({ activeCommentId: commentId });
  },
}));
