import { create } from 'zustand';
import type { JSONContent } from '@tiptap/react';
import type {
  TechDocsConfig,
  TechDocsRepoConfig,
  QAAnswer,
  TechDocsAnalysisResult,
  TechDocsAnalysisProgress,
} from '@dardocs/core';
import {
  TECH_DOCS_USE_MOCK_DATA,
  runTechDocsAnalysis,
  generateTechDocsDocument,
  parseGitHubRepoUrl,
} from '@dardocs/core';

export type TechDocsPhase = 'configuring' | 'qa' | 'analyzing' | 'preview' | 'error';

interface TechDocsStore {
  // Configuration
  config: TechDocsConfig;
  phase: TechDocsPhase;

  // Q&A state
  answers: QAAnswer[];
  currentRoundIndex: number;

  // Analysis state
  analysisResult: TechDocsAnalysisResult | null;
  generatedContent: JSONContent | null;
  generatedTitle: string | null;
  progress: TechDocsAnalysisProgress | null;
  error: string | null;

  // Config actions
  setRepo: (url: string) => void;
  removeRepo: () => void;
  updateRepoDescription: (description: string) => void;
  setPrdContent: (content: string) => void;
  setFeatureTitle: (title: string) => void;
  startQA: () => void;

  // Q&A actions
  setAnswer: (questionId: string, answer: string) => void;
  nextRound: () => void;
  prevRound: () => void;
  backToConfig: () => void;

  // Analysis actions
  runAnalysis: () => Promise<void>;
  backToQA: () => void;
  reset: () => void;
}

const initialConfig: TechDocsConfig = {
  repo: null,
  prdContent: '',
  featureTitle: '',
};

const initialProgress: TechDocsAnalysisProgress = {
  phase: 'idle',
  percent: 0,
  message: '',
};

export const useTechDocsStore = create<TechDocsStore>((set, get) => ({
  config: { ...initialConfig },
  phase: 'configuring',
  answers: [],
  currentRoundIndex: 0,
  analysisResult: null,
  generatedContent: null,
  generatedTitle: null,
  progress: initialProgress,
  error: null,

  setRepo: (url: string) => {
    const parsed = parseGitHubRepoUrl(url);
    if (!parsed) return;

    const repo: TechDocsRepoConfig = {
      id: crypto.randomUUID(),
      url: url.trim(),
      owner: parsed.owner,
      repo: parsed.repo,
      description: '',
    };

    set((state) => ({
      config: { ...state.config, repo },
    }));
  },

  removeRepo: () => {
    set((state) => ({
      config: { ...state.config, repo: null },
    }));
  },

  updateRepoDescription: (description: string) => {
    set((state) => ({
      config: {
        ...state.config,
        repo: state.config.repo ? { ...state.config.repo, description } : null,
      },
    }));
  },

  setPrdContent: (content: string) => {
    set((state) => ({
      config: { ...state.config, prdContent: content },
    }));
  },

  setFeatureTitle: (title: string) => {
    set((state) => ({
      config: { ...state.config, featureTitle: title },
    }));
  },

  startQA: () => {
    set({ phase: 'qa', currentRoundIndex: 0 });
  },

  setAnswer: (questionId: string, answer: string) => {
    set((state) => {
      const existing = state.answers.find((a) => a.questionId === questionId);
      if (existing) {
        return {
          answers: state.answers.map((a) =>
            a.questionId === questionId ? { ...a, answer } : a,
          ),
        };
      }
      return {
        answers: [...state.answers, { questionId, answer }],
      };
    });
  },

  nextRound: () => {
    set((state) => ({
      currentRoundIndex: state.currentRoundIndex + 1,
    }));
  },

  prevRound: () => {
    set((state) => ({
      currentRoundIndex: Math.max(0, state.currentRoundIndex - 1),
    }));
  },

  backToConfig: () => {
    set({
      phase: 'configuring',
      currentRoundIndex: 0,
    });
  },

  runAnalysis: async () => {
    const { config, answers } = get();
    set({ phase: 'analyzing', error: null });

    try {
      let result: TechDocsAnalysisResult;

      if (TECH_DOCS_USE_MOCK_DATA) {
        result = await runTechDocsAnalysis(config, answers, (progress) => {
          set({ progress });
        });
      } else {
        throw new Error('Real analysis not yet implemented');
      }

      const content = generateTechDocsDocument(result);
      const title = `Tech Design — ${config.featureTitle || 'Untitled'}`;

      set({
        analysisResult: result,
        generatedContent: content,
        generatedTitle: title,
        phase: 'preview',
        progress: { phase: 'complete', percent: 100, message: 'Document generated' },
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

  backToQA: () => {
    set({
      phase: 'qa',
      analysisResult: null,
      generatedContent: null,
      generatedTitle: null,
      progress: initialProgress,
      error: null,
    });
  },

  reset: () => {
    set({
      config: { ...initialConfig },
      phase: 'configuring',
      answers: [],
      currentRoundIndex: 0,
      analysisResult: null,
      generatedContent: null,
      generatedTitle: null,
      progress: initialProgress,
      error: null,
    });
  },
}));
