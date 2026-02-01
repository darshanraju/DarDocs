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
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

// ─── Comments ────────────────────────────────────────────────

export interface ApiComment {
  id: string;
  type: 'inline' | 'document';
  text: string;
  quotedText: string | null;
  resolved: boolean;
  author: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
  replies: ApiCommentReply[];
}

export interface ApiCommentReply {
  id: string;
  text: string;
  author: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export const commentsApi = {
  list: (documentId: string) =>
    request<ApiComment[]>(`/api/documents/${documentId}/comments`),

  create: (
    documentId: string,
    data: {
      id?: string;
      type?: 'inline' | 'document';
      text: string;
      quotedText?: string;
    }
  ) =>
    request<ApiComment>(`/api/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reply: (commentId: string, text: string) =>
    request<ApiCommentReply>(`/api/comments/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  update: (commentId: string, data: { text?: string; resolved?: boolean }) =>
    request<{ ok: boolean }>(`/api/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (commentId: string) =>
    request<void>(`/api/comments/${commentId}`, { method: 'DELETE' }),
};

// ─── Code Execution ──────────────────────────────────────────

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export const executeApi = {
  run: (language: string, code: string) =>
    request<ExecResult>('/api/execute', {
      method: 'POST',
      body: JSON.stringify({ language, code }),
    }),
};

// ─── Members ─────────────────────────────────────────────────

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: string;
}

export const membersApi = {
  list: (workspaceId: string) =>
    request<WorkspaceMember[]>(
      `/api/workspaces/${workspaceId}/members`
    ),

  invite: (workspaceId: string, email: string, role?: string) =>
    request<WorkspaceMember>(
      `/api/workspaces/${workspaceId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role: role || 'editor' }),
      }
    ),

  updateRole: (workspaceId: string, memberId: string, role: string) =>
    request<{ ok: boolean }>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    ),

  remove: (workspaceId: string, memberId: string) =>
    request<void>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      { method: 'DELETE' }
    ),
};
