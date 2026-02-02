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
  generateGodModeDocument,
  parseGitHubRepoUrl,
} from '@dardocs/core';
import { useWorkspaceConfigStore } from './workspaceConfigStore';

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

  // Swagger toggles (repo names that should use swagger embed)
  swaggerRepos: string[];

  // Config actions
  addRepo: (url: string, role: RepoRole, description: string) => void;
  removeRepo: (id: string) => void;
  updateRepo: (id: string, updates: Partial<GodModeRepoConfig>) => void;
  addTeamMember: (repoId: string, member: TeamMember) => void;
  removeTeamMember: (repoId: string, memberName: string) => void;

  // Analysis actions
  runAnalysis: () => Promise<void>;
  toggleSwagger: (repoName: string) => void;
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
  swaggerRepos: [],

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
      const result = await runRealAnalysis(config, (progress) => {
        set({ progress });
      });

      console.log('[GodMode] Analysis result received:', {
        repoCount: result.repos.length,
        repos: result.repos.map((r) => ({
          name: r.repoName,
          contributors: r.contributors.length,
          endpoints: r.apiEndpoints.length,
          glossary: r.glossary.length,
          hotZones: r.hotZones.length,
          errors: r.errorPatterns.length,
          archDecisions: r.archDecisions.length,
          setupSteps: r.setupSteps.length,
        })),
      });

      // Generate the document content from results (preview mode, no swagger yet)
      const content = generateGodModeDocument(result, [], true);

      console.log('[GodMode] Generated document content:', {
        type: content.type,
        topLevelNodes: content.content?.length ?? 0,
        nodeTypes: content.content?.map((n) => n.type).join(', '),
      });

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

  toggleSwagger: (repoName: string) => {
    const { swaggerRepos, analysisResult } = get();
    const next = swaggerRepos.includes(repoName)
      ? swaggerRepos.filter((r) => r !== repoName)
      : [...swaggerRepos, repoName];

    const content = analysisResult
      ? generateGodModeDocument(analysisResult, next, true)
      : get().generatedContent;

    set({ swaggerRepos: next, generatedContent: content });
  },

  backToConfig: () => {
    set({
      phase: 'configuring',
      analysisResult: null,
      generatedContent: null,
      generatedTitle: null,
      progress: initialProgress,
      error: null,
      swaggerRepos: [],
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
      swaggerRepos: [],
    });
  },
}));

// ─── Real analysis via backend SSE ──────────────────────────

async function runRealAnalysis(
  config: GodModeConfig,
  onProgress: (progress: AnalysisProgress) => void
): Promise<GodModeAnalysisResult> {
  const response = await fetch('/api/god-mode/analyze', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config,
      aiConfig: useWorkspaceConfigStore.getState().config.ai || undefined,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Analysis failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: GodModeAnalysisResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data: ')) continue;

      try {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'result') {
          result = data.result as GodModeAnalysisResult;
        } else if (data.phase) {
          onProgress(data as AnalysisProgress);
        }
      } catch {
        // Skip malformed SSE chunks
      }
    }
  }

  if (!result) {
    throw new Error('Analysis completed without returning results');
  }

  return result;
}
