import { create } from 'zustand';
import type { Comment, CommentAuthor, CommentReply } from '@dardocs/core';

// Re-export types for consumers
export type { Comment, CommentReply, CommentAuthor } from '@dardocs/core';

export const MOCK_USERS: CommentAuthor[] = [
  { id: 'user-1', name: 'Alex Chen', color: '#3370ff' },
  { id: 'user-2', name: 'Jordan Kim', color: '#00b386' },
  { id: 'user-3', name: 'Sam Rivera', color: '#cf8a00' },
  { id: 'user-4', name: 'Taylor Park', color: '#7c3aed' },
];

function getRandomUser(): CommentAuthor {
  return MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
}

const currentUser = getRandomUser();

interface CommentStore {
  comments: Comment[];
  activeCommentId: string | null;
  currentUser: CommentAuthor;

  // Persistence: load comments from a document, get comments for serialization
  loadComments: (comments: Comment[]) => void;
  getComments: () => Comment[];
  clearComments: () => void;

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
  currentUser,

  loadComments: (comments) => {
    set({ comments, activeCommentId: null });
  },

  getComments: () => get().comments,

  clearComments: () => {
    set({ comments: [], activeCommentId: null });
  },

  addComment: (commentId, text, quotedText) => {
    const comment: Comment = {
      id: commentId,
      type: 'inline',
      text,
      quotedText,
      author: get().currentUser,
      createdAt: new Date().toISOString(),
      replies: [],
      resolved: false,
    };
    set(state => ({
      comments: [...state.comments, comment],
      activeCommentId: commentId,
    }));
  },

  addDocumentComment: (text, imageUrl) => {
    const comment: Comment = {
      id: crypto.randomUUID(),
      type: 'document',
      text,
      author: get().currentUser,
      createdAt: new Date().toISOString(),
      replies: [],
      resolved: false,
      imageUrl,
    };
    set(state => ({
      comments: [...state.comments, comment],
    }));
  },

  updateCommentText: (commentId, text) => {
    set(state => ({
      comments: state.comments.map(c =>
        c.id === commentId ? { ...c, text } : c
      ),
    }));
  },

  addReply: (commentId, text) => {
    const otherUsers = MOCK_USERS.filter(u => u.id !== get().currentUser.id);
    const replyUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
    const reply: CommentReply = {
      id: crypto.randomUUID(),
      text,
      author: replyUser,
      createdAt: new Date().toISOString(),
    };
    set(state => ({
      comments: state.comments.map(c =>
        c.id === commentId
          ? { ...c, replies: [...c.replies, reply] }
          : c
      ),
    }));
  },

  resolveComment: (commentId) => {
    set(state => ({
      comments: state.comments.map(c =>
        c.id === commentId ? { ...c, resolved: true } : c
      ),
      activeCommentId: state.activeCommentId === commentId ? null : state.activeCommentId,
    }));
  },

  deleteComment: (commentId) => {
    set(state => ({
      comments: state.comments.filter(c => c.id !== commentId),
      activeCommentId: state.activeCommentId === commentId ? null : state.activeCommentId,
    }));
  },

  setActiveComment: (commentId) => {
    set({ activeCommentId: commentId });
  },
}));
