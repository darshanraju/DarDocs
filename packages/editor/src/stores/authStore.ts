import { create } from 'zustand';
import { authApi, type AuthUser, ApiError } from '../lib/api.js';

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;

  checkSession: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOkta: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  checkSession: async () => {
    set({ loading: true, error: null });
    try {
      const { user } = await authApi.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  signUp: async (name, email, password) => {
    set({ error: null, loading: true });
    try {
      await authApi.signUp(name, email, password);
      // After sign-up, check session (Better Auth auto-signs-in)
      const { user } = await authApi.me();
      set({ user, loading: false });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Sign up failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  signIn: async (email, password) => {
    set({ error: null, loading: true });
    try {
      await authApi.signIn(email, password);
      const { user } = await authApi.me();
      set({ user, loading: false });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Sign in failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  signInWithOkta: async () => {
    set({ error: null, loading: true });
    try {
      await authApi.signInWithOkta();
      // Browser navigates away to Okta; no further action needed
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Okta sign in failed';
      set({ error: msg, loading: false });
    }
  },

  signOut: async () => {
    await authApi.signOut();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
