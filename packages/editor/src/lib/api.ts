const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('/api') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

// ─── Auth ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export const authApi = {
  me: () => request<{ user: AuthUser }>('/api/me'),

  signUp: (name: string, email: string, password: string) =>
    request('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  signIn: (email: string, password: string) =>
    request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signOut: () =>
    request('/api/auth/sign-out', { method: 'POST' }),
};

// ─── Workspaces ────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export const workspacesApi = {
  list: () => request<Workspace[]>('/api/workspaces'),

  create: (name: string) =>
    request<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  get: (id: string) => request<Workspace>(`/api/workspaces/${id}`),
};

// ─── Documents ────────────────────────────────────────────────

export interface DocTreeItem {
  id: string;
  parentId: string;
  position: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocFull extends DocTreeItem {
  workspaceId: string;
  content: unknown;
  boards: unknown;
  createdBy: string;
}

export const documentsApi = {
  tree: (workspaceId: string) =>
    request<DocTreeItem[]>(`/api/workspaces/${workspaceId}/documents`),

  create: (workspaceId: string, title: string, parentId: string | null) =>
    request<DocFull>(`/api/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title, parentId }),
    }),

  get: (id: string) => request<DocFull>(`/api/documents/${id}`),

  update: (
    id: string,
    data: {
      title?: string;
      content?: unknown;
      boards?: unknown;
      parentId?: string | null;
      position?: number;
    }
  ) =>
    request<DocFull>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/documents/${id}`, { method: 'DELETE' }),
};
