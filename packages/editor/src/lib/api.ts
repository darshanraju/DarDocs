const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('/api') ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
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

  signInWithOkta: async () => {
    const data = await request<{ url: string; redirect: boolean }>(
      '/api/auth/sign-in/oauth2',
      {
        method: 'POST',
        body: JSON.stringify({
          providerId: 'okta',
          callbackURL: '/',
          disableRedirect: true,
        }),
      },
    );
    window.location.href = data.url;
  },
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
  teamId: string | null;
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

  create: (
    workspaceId: string,
    title: string,
    parentId: string | null,
    teamId?: string | null
  ) =>
    request<DocFull>(`/api/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title, parentId, teamId }),
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
      teamId?: string | null;
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

// ─── Teams ──────────────────────────────────────────────────

export type TeamVisibility = 'open' | 'closed' | 'private';
export type TeamRole = 'owner' | 'member';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  visibility: TeamVisibility;
  icon: string | null;
  memberCount: number;
  isMember: boolean;
  role: TeamRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: TeamRole;
  joinedAt: string;
}

// ─── GitHub Integration ──────────────────────────────────────

export interface GitHubInstallationStatus {
  configured: boolean;
  installed: boolean;
  githubOrg?: string;
  installationId?: number;
  accountType?: string;
  avatarUrl?: string;
  repoSelection?: 'all' | 'selected';
  stale?: boolean;
}

export interface GitHubRepo {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  url: string;
  description: string | null;
}

export const githubIntegrationApi = {
  status: (workspaceId: string) =>
    request<GitHubInstallationStatus>(
      `/api/integrations/github/status?workspaceId=${workspaceId}`
    ),

  getInstallUrl: (workspaceId: string) =>
    `/api/integrations/github/install?workspaceId=${workspaceId}`,

  listRepos: (workspaceId: string) =>
    request<GitHubRepo[]>(
      `/api/integrations/github/repos?workspaceId=${workspaceId}`
    ),

  disconnect: (workspaceId: string) =>
    request<{ ok: boolean }>(
      `/api/integrations/github?workspaceId=${workspaceId}`,
      { method: 'DELETE' }
    ),
};

// ─── Teams ──────────────────────────────────────────────────

export const teamsApi = {
  list: (workspaceId: string) =>
    request<Team[]>(`/api/workspaces/${workspaceId}/teams`),

  create: (
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      visibility?: TeamVisibility;
      icon?: string;
    }
  ) =>
    request<Team>(`/api/workspaces/${workspaceId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    teamId: string,
    data: {
      name?: string;
      description?: string;
      visibility?: TeamVisibility;
      icon?: string;
    }
  ) =>
    request<Team>(`/api/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (teamId: string) =>
    request<void>(`/api/teams/${teamId}`, { method: 'DELETE' }),

  join: (teamId: string) =>
    request<TeamMember>(`/api/teams/${teamId}/join`, { method: 'POST' }),

  listMembers: (teamId: string) =>
    request<TeamMember[]>(`/api/teams/${teamId}/members`),

  addMember: (teamId: string, userId: string, role?: TeamRole) =>
    request<TeamMember>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  updateMemberRole: (teamId: string, memberId: string, role: TeamRole) =>
    request<{ ok: boolean }>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (teamId: string, memberId: string) =>
    request<void>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    }),
};
