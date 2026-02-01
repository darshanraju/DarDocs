import { create } from 'zustand';
import { db } from '@dardocs/core';
import type {
  WorkspaceConfig,
  RepoConfig,
  ProviderCredentials,
  AIConfig,
} from '@dardocs/core';
import { DEFAULT_WORKSPACE_CONFIG, parseGitHubRepoUrl } from '@dardocs/core';

interface WorkspaceConfigStore {
  config: WorkspaceConfig;
  loading: boolean;
  settingsOpen: boolean;

  // Init
  loadConfig: () => Promise<void>;

  // Settings modal
  openSettings: () => void;
  closeSettings: () => void;

  // Repos
  addRepo: (url: string, token?: string) => Promise<void>;
  removeRepo: (id: string) => Promise<void>;
  updateRepoToken: (id: string, token: string) => Promise<void>;

  // Provider credentials
  updateProviderCredentials: <K extends keyof ProviderCredentials>(
    provider: K,
    credentials: ProviderCredentials[K]
  ) => Promise<void>;
  clearProviderCredentials: (provider: keyof ProviderCredentials) => Promise<void>;

  // AI config
  updateAIConfig: (ai: AIConfig) => Promise<void>;
  clearAIConfig: () => Promise<void>;
}

async function persist(config: WorkspaceConfig): Promise<void> {
  await db.workspaceConfig.put(config);
}

export const useWorkspaceConfigStore = create<WorkspaceConfigStore>((set, get) => ({
  config: DEFAULT_WORKSPACE_CONFIG,
  loading: true,
  settingsOpen: false,

  loadConfig: async () => {
    set({ loading: true });
    const stored = await db.workspaceConfig.get('config');
    if (stored) {
      set({ config: stored, loading: false });
    } else {
      await db.workspaceConfig.put(DEFAULT_WORKSPACE_CONFIG);
      set({ config: DEFAULT_WORKSPACE_CONFIG, loading: false });
    }
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  addRepo: async (url, token) => {
    const parsed = parseGitHubRepoUrl(url);
    if (!parsed) return;

    const repo: RepoConfig = {
      id: crypto.randomUUID(),
      name: parsed.name,
      url: url.trim(),
      owner: parsed.owner,
      repo: parsed.repo,
      token,
      addedAt: new Date().toISOString(),
    };

    const config = { ...get().config };
    config.repos = [...config.repos, repo];
    await persist(config);
    set({ config });
  },

  removeRepo: async (id) => {
    const config = { ...get().config };
    config.repos = config.repos.filter((r) => r.id !== id);
    await persist(config);
    set({ config });
  },

  updateRepoToken: async (id, token) => {
    const config = { ...get().config };
    config.repos = config.repos.map((r) =>
      r.id === id ? { ...r, token } : r
    );
    await persist(config);
    set({ config });
  },

  updateProviderCredentials: async (provider, credentials) => {
    const config = { ...get().config };
    config.providers = { ...config.providers, [provider]: credentials };
    await persist(config);
    set({ config });
  },

  clearProviderCredentials: async (provider) => {
    const config = { ...get().config };
    const providers = { ...config.providers };
    delete providers[provider];
    config.providers = providers;
    await persist(config);
    set({ config });
  },

  updateAIConfig: async (ai) => {
    const config = { ...get().config, ai };
    await persist(config);
    set({ config });
  },

  clearAIConfig: async () => {
    const config = { ...get().config, ai: null };
    await persist(config);
    set({ config });
  },
}));
