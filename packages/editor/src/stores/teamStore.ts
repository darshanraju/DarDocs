import { create } from 'zustand';
import { teamsApi } from '../lib/api.js';
import type { Team, TeamVisibility } from '../lib/api.js';

interface TeamStore {
  teams: Team[];
  loading: boolean;

  loadTeams: (workspaceId: string) => Promise<void>;
  createTeam: (
    workspaceId: string,
    name: string,
    visibility?: TeamVisibility
  ) => Promise<Team>;
  updateTeam: (
    teamId: string,
    data: { name?: string; description?: string; visibility?: TeamVisibility; icon?: string }
  ) => Promise<void>;
  deleteTeam: (teamId: string, workspaceId: string) => Promise<void>;
  joinTeam: (teamId: string, workspaceId: string) => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  loading: false,

  loadTeams: async (workspaceId: string) => {
    set({ loading: true });
    try {
      const teams = await teamsApi.list(workspaceId);
      set({ teams, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTeam: async (workspaceId, name, visibility) => {
    const team = await teamsApi.create(workspaceId, { name, visibility });
    set((state) => ({ teams: [...state.teams, team] }));
    return team;
  },

  updateTeam: async (teamId, data) => {
    const updated = await teamsApi.update(teamId, data);
    set((state) => ({
      teams: state.teams.map((t) => (t.id === teamId ? updated : t)),
    }));
  },

  deleteTeam: async (teamId, workspaceId) => {
    await teamsApi.delete(teamId);
    set((state) => ({
      teams: state.teams.filter((t) => t.id !== teamId),
    }));
  },

  joinTeam: async (teamId, workspaceId) => {
    await teamsApi.join(teamId);
    // Reload to get updated membership info
    const teams = await teamsApi.list(workspaceId);
    set({ teams });
  },
}));
