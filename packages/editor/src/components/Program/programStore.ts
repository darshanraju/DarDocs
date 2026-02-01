import { create } from 'zustand';
import type { ProgramDefinition, ProgramRunResult, ProgramNode } from './registry';
import type { Edge } from '@xyflow/react';

interface ProgramStore {
  programs: Map<string, ProgramDefinition>;
  runResults: Map<string, ProgramRunResult>;
  runningPrograms: Set<string>;

  getProgram: (id: string) => ProgramDefinition | undefined;
  createProgram: (id: string, name?: string) => ProgramDefinition;
  updateNodes: (programId: string, nodes: ProgramNode[]) => void;
  updateEdges: (programId: string, edges: Edge[]) => void;
  updateNodeConfig: (programId: string, nodeId: string, config: Record<string, any>) => void;

  renameProgram: (programId: string, name: string) => void;
  setRunning: (programId: string, running: boolean) => void;
  setRunResult: (programId: string, result: ProgramRunResult) => void;
  getRunResult: (programId: string) => ProgramRunResult | undefined;

  deleteProgram: (id: string) => void;
}

export const useProgramStore = create<ProgramStore>((set, get) => ({
  programs: new Map(),
  runResults: new Map(),
  runningPrograms: new Set(),

  getProgram: (id) => get().programs.get(id),

  createProgram: (id, name = 'Untitled Program') => {
    const existing = get().programs.get(id);
    if (existing) return existing;

    const program: ProgramDefinition = {
      id,
      name,
      nodes: [],
      edges: [],
    };
    set((state) => {
      const programs = new Map(state.programs);
      programs.set(id, program);
      return { programs };
    });
    return program;
  },

  updateNodes: (programId, nodes) => {
    set((state) => {
      const programs = new Map(state.programs);
      const program = programs.get(programId);
      if (!program) return state;
      programs.set(programId, { ...program, nodes });
      return { programs };
    });
  },

  updateEdges: (programId, edges) => {
    set((state) => {
      const programs = new Map(state.programs);
      const program = programs.get(programId);
      if (!program) return state;
      programs.set(programId, { ...program, edges });
      return { programs };
    });
  },

  updateNodeConfig: (programId, nodeId, config) => {
    set((state) => {
      const programs = new Map(state.programs);
      const program = programs.get(programId);
      if (!program) return state;
      const nodes = program.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
      );
      programs.set(programId, { ...program, nodes });
      return { programs };
    });
  },

  renameProgram: (programId, name) => {
    set((state) => {
      const programs = new Map(state.programs);
      const program = programs.get(programId);
      if (!program) return state;
      programs.set(programId, { ...program, name });
      return { programs };
    });
  },

  setRunning: (programId, running) => {
    set((state) => {
      const runningPrograms = new Set(state.runningPrograms);
      if (running) runningPrograms.add(programId);
      else runningPrograms.delete(programId);
      return { runningPrograms };
    });
  },

  setRunResult: (programId, result) => {
    set((state) => {
      const runResults = new Map(state.runResults);
      runResults.set(programId, result);

      // Also update lastOutput/lastError on each node
      const programs = new Map(state.programs);
      const program = programs.get(programId);
      if (program) {
        const nodes = program.nodes.map((n) => {
          const nodeResult = result.nodeOutputs[n.id];
          if (!nodeResult) return n;
          return {
            ...n,
            data: {
              ...n.data,
              lastOutput: nodeResult.output,
              lastError: nodeResult.error,
            },
          };
        });
        programs.set(programId, { ...program, nodes });
      }

      return { runResults, programs };
    });
  },

  getRunResult: (programId) => get().runResults.get(programId),

  deleteProgram: (id) => {
    set((state) => {
      const programs = new Map(state.programs);
      const runResults = new Map(state.runResults);
      programs.delete(id);
      runResults.delete(id);
      return { programs, runResults };
    });
  },
}));
