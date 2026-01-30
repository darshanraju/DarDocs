import { create } from 'zustand';

export interface MockUser {
  id: string;
  name: string;
  color: string;
}

export interface CommentReply {
  id: string;
  text: string;
  author: MockUser;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  quotedText: string;
  author: MockUser;
  createdAt: string;
  replies: CommentReply[];
  resolved: boolean;
}

export const MOCK_USERS: MockUser[] = [
  { id: 'user-1', name: 'Alex Chen', color: '#3370ff' },
  { id: 'user-2', name: 'Jordan Kim', color: '#00b386' },
  { id: 'user-3', name: 'Sam Rivera', color: '#cf8a00' },
  { id: 'user-4', name: 'Taylor Park', color: '#7c3aed' },
];

function getRandomUser(): MockUser {
  return MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
}

const currentUser = getRandomUser();

interface CommentStore {
  comments: Comment[];
  activeCommentId: string | null;
  currentUser: MockUser;

  addComment: (commentId: string, text: string, quotedText: string) => void;
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

  addComment: (commentId, text, quotedText) => {
    const comment: Comment = {
      id: commentId,
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
