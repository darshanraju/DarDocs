import { create } from 'zustand';
import type { JSONContent } from '@tiptap/react';
import type {
  GodModeConfig,
  GodModeRepoConfig,
  TeamMember,
  GodModeAnalysisResult,
  AnalysisProgress,
  RepoRole,
} from '@dardocs/core';
import {
  GOD_MODE_USE_MOCK_DATA,
  runMockAnalysis,
  generateGodModeDocument,
  parseGitHubRepoUrl,
} from '@dardocs/core';

export type GodModePhase = 'configuring' | 'analyzing' | 'preview' | 'error';

interface GodModeStore {
  // Configuration
  config: GodModeConfig;
  phase: GodModePhase;

  // Analysis state
  analysisResult: GodModeAnalysisResult | null;
  generatedContent: JSONContent | null;
  generatedTitle: string | null;
  progress: AnalysisProgress | null;
  error: string | null;

  // Config actions
  addRepo: (url: string, role: RepoRole, description: string) => void;
  removeRepo: (id: string) => void;
  updateRepo: (id: string, updates: Partial<GodModeRepoConfig>) => void;
  addTeamMember: (repoId: string, member: TeamMember) => void;
  removeTeamMember: (repoId: string, memberName: string) => void;

  // Analysis actions
  runAnalysis: () => Promise<void>;
  backToConfig: () => void;
  reset: () => void;
}

const initialProgress: AnalysisProgress = {
  phase: 'idle',
  percent: 0,
  message: '',
};

export const useGodModeStore = create<GodModeStore>((set, get) => ({
  config: { repos: [] },
  phase: 'configuring',
  analysisResult: null,
  generatedContent: null,
  generatedTitle: null,
  progress: initialProgress,
  error: null,

  addRepo: (url, role, description) => {
    const parsed = parseGitHubRepoUrl(url);
    if (!parsed) return;

    const repo: GodModeRepoConfig = {
      id: crypto.randomUUID(),
      url: url.trim(),
      owner: parsed.owner,
      repo: parsed.repo,
      role,
      description,
      teamMembers: [],
    };

    set((state) => ({
      config: { ...state.config, repos: [...state.config.repos, repo] },
    }));
  },

  removeRepo: (id) => {
    set((state) => ({
      config: {
        ...state.config,
        repos: state.config.repos.filter((r) => r.id !== id),
      },
    }));
  },

  updateRepo: (id, updates) => {
    set((state) => ({
      config: {
        ...state.config,
        repos: state.config.repos.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      },
    }));
  },

  addTeamMember: (repoId, member) => {
    set((state) => ({
      config: {
        ...state.config,
        repos: state.config.repos.map((r) =>
          r.id === repoId
            ? { ...r, teamMembers: [...r.teamMembers, member] }
            : r
        ),
      },
    }));
  },

  removeTeamMember: (repoId, memberName) => {
    set((state) => ({
      config: {
        ...state.config,
        repos: state.config.repos.map((r) =>
          r.id === repoId
            ? { ...r, teamMembers: r.teamMembers.filter((m) => m.name !== memberName) }
            : r
        ),
      },
    }));
  },

  runAnalysis: async () => {
    const { config } = get();
    set({ phase: 'analyzing', error: null });

    try {
      let result: GodModeAnalysisResult;

      if (GOD_MODE_USE_MOCK_DATA) {
        result = await runMockAnalysis(config, (progress) => {
          set({ progress });
        });
      } else {
        // TODO: Real analysis pipeline (Phase 1: API, Phase 2: shallow clone)
        throw new Error('Real analysis not yet implemented');
      }

      // Generate the document content from results
      const content = generateGodModeDocument(result);
      const primaryRepo = config.repos.find((r) => r.role === 'primary');
      const title = `God Mode — ${primaryRepo?.repo || 'System Overview'}`;

      set({
        analysisResult: result,
        generatedContent: content,
        generatedTitle: title,
        phase: 'preview',
        progress: { phase: 'complete', percent: 100, message: 'Analysis complete' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      set({
        phase: 'error',
        error: message,
        progress: { phase: 'error', percent: 0, message },
      });
    }
  },

  backToConfig: () => {
    set({
      phase: 'configuring',
      analysisResult: null,
      generatedContent: null,
      generatedTitle: null,
      progress: initialProgress,
      error: null,
    });
  },

  reset: () => {
    set({
      config: { repos: [] },
      phase: 'configuring',
      analysisResult: null,
      generatedContent: null,
      generatedTitle: null,
      progress: initialProgress,
      error: null,
    });
  },
}));
