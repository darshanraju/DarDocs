import { create } from 'zustand';

export type CommandType = 'api_fetch' | 'javascript' | 'web_scraper' | 'static_data';
export type DisplayMode = 'auto' | 'key_value' | 'metric' | 'table' | 'custom';

export interface CustomCommandConfig {
  // API Fetch
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: string;
  body?: string;

  // JavaScript
  code?: string;

  // Web Scraper
  scrapeUrl?: string;
  selectors?: string;

  // Static Data
  staticData?: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  intervalSeconds: number;
}

export interface CustomCommand {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
  type: CommandType;
  config: CustomCommandConfig;
  displayMode: DisplayMode;
  customTemplate?: string;
  schedule: ScheduleConfig;
  createdAt: string;
  updatedAt: string;
}

export type CustomCommandDraft = Omit<CustomCommand, 'id' | 'createdAt' | 'updatedAt'>;

interface CustomCommandStore {
  commands: CustomCommand[];
  builderOpen: boolean;
  editingCommandId: string | null;

  openBuilder: (editId?: string) => void;
  closeBuilder: () => void;

  addCommand: (draft: CustomCommandDraft) => CustomCommand;
  updateCommand: (id: string, updates: Partial<CustomCommand>) => void;
  deleteCommand: (id: string) => void;
  getCommand: (id: string) => CustomCommand | undefined;

  loadCommands: (commands: CustomCommand[]) => void;
}

export const useCustomCommandStore = create<CustomCommandStore>((set, get) => ({
  commands: [],
  builderOpen: false,
  editingCommandId: null,

  openBuilder: (editId?: string) => {
    set({ builderOpen: true, editingCommandId: editId || null });
  },

  closeBuilder: () => {
    set({ builderOpen: false, editingCommandId: null });
  },

  addCommand: (draft) => {
    const now = new Date().toISOString();
    const command: CustomCommand = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ commands: [...state.commands, command] }));
    return command;
  },

  updateCommand: (id, updates) => {
    set((state) => ({
      commands: state.commands.map((cmd) =>
        cmd.id === id
          ? { ...cmd, ...updates, updatedAt: new Date().toISOString() }
          : cmd
      ),
    }));
  },

  deleteCommand: (id) => {
    set((state) => ({
      commands: state.commands.filter((cmd) => cmd.id !== id),
    }));
  },

  getCommand: (id) => get().commands.find((cmd) => cmd.id === id),

  loadCommands: (commands) => {
    set({ commands });
  },
}));

// Template presets for the builder
export const COMMAND_TEMPLATES: {
  label: string;
  description: string;
  draft: Partial<CustomCommandDraft>;
}[] = [
  {
    label: 'GitHub Repo Stats',
    description: 'Fetch stars, forks, issues from a GitHub repository',
    draft: {
      name: 'GitHub Stats',
      icon: '📊',
      type: 'api_fetch',
      config: {
        url: 'https://api.github.com/repos/facebook/react',
        method: 'GET',
        headers: JSON.stringify({ Accept: 'application/vnd.github.v3+json' }, null, 2),
      },
      displayMode: 'custom',
      customTemplate: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
  <div style="padding:8px;background:#f0f9ff;border-radius:6px;text-align:center">
    <div style="font-size:20px;font-weight:700;color:#1e40af">{{stargazers_count}}</div>
    <div style="font-size:11px;color:#6b7280">Stars</div>
  </div>
  <div style="padding:8px;background:#f0fdf4;border-radius:6px;text-align:center">
    <div style="font-size:20px;font-weight:700;color:#166534">{{forks_count}}</div>
    <div style="font-size:11px;color:#6b7280">Forks</div>
  </div>
  <div style="padding:8px;background:#fefce8;border-radius:6px;text-align:center">
    <div style="font-size:20px;font-weight:700;color:#854d0e">{{open_issues_count}}</div>
    <div style="font-size:11px;color:#6b7280">Issues</div>
  </div>
  <div style="padding:8px;background:#fdf2f8;border-radius:6px;text-align:center">
    <div style="font-size:20px;font-weight:700;color:#9d174d">{{language}}</div>
    <div style="font-size:11px;color:#6b7280">Language</div>
  </div>
</div>`,
      description: 'GitHub repository statistics',
      keywords: ['github', 'repo', 'stats'],
      schedule: { enabled: false, intervalSeconds: 300 },
    },
  },
  {
    label: 'Live Clock',
    description: 'JavaScript-powered live date/time display',
    draft: {
      name: 'Live Clock',
      icon: '🕐',
      type: 'javascript',
      config: {
        code: `// Return an object — its fields become template variables
const now = new Date();
return {
  time: now.toLocaleTimeString(),
  date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  unix: Math.floor(now.getTime() / 1000),
};`,
      },
      displayMode: 'metric',
      description: 'Current date and time',
      keywords: ['clock', 'time', 'date'],
      schedule: { enabled: true, intervalSeconds: 1 },
    },
  },
  {
    label: 'REST API Card',
    description: 'Generic card for any JSON REST API endpoint',
    draft: {
      name: 'API Data',
      icon: '🔌',
      type: 'api_fetch',
      config: {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
        headers: '{}',
      },
      displayMode: 'key_value',
      description: 'Fetches data from a REST endpoint',
      keywords: ['api', 'rest', 'fetch'],
      schedule: { enabled: false, intervalSeconds: 60 },
    },
  },
  {
    label: 'Server Status Monitor',
    description: 'Ping an endpoint and display up/down status',
    draft: {
      name: 'Server Status',
      icon: '🟢',
      type: 'javascript',
      config: {
        code: `// Ping an endpoint and measure latency
const url = 'https://jsonplaceholder.typicode.com/posts/1';
const start = performance.now();
try {
  const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
  const latency = Math.round(performance.now() - start);
  return {
    title: 'API Server',
    value: 'Online',
    unit: latency + 'ms',
    change: latency < 200 ? 'Healthy' : 'Slow',
  };
} catch (e) {
  return { title: 'API Server', value: 'Offline', change: 'Down' };
}`,
      },
      displayMode: 'metric',
      description: 'Monitors server health',
      keywords: ['status', 'server', 'health', 'monitor'],
      schedule: { enabled: true, intervalSeconds: 30 },
    },
  },
  {
    label: 'Data Table',
    description: 'Fetch an array of records and display as a table',
    draft: {
      name: 'Data Table',
      icon: '📋',
      type: 'api_fetch',
      config: {
        url: 'https://jsonplaceholder.typicode.com/users',
        method: 'GET',
        headers: '{}',
      },
      displayMode: 'table',
      description: 'Tabular data from an API',
      keywords: ['table', 'data', 'list'],
      schedule: { enabled: false, intervalSeconds: 120 },
    },
  },
  {
    label: 'Static Status Card',
    description: 'Hard-coded dashboard data you define as JSON',
    draft: {
      name: 'Status Card',
      icon: '📌',
      type: 'static_data',
      config: {
        staticData: JSON.stringify(
          {
            service: 'API Gateway',
            status: 'Operational',
            uptime: '99.97%',
            latency: '42ms',
            region: 'us-east-1',
          },
          null,
          2
        ),
      },
      displayMode: 'key_value',
      description: 'Static key-value dashboard card',
      keywords: ['status', 'static', 'card'],
      schedule: { enabled: false, intervalSeconds: 0 },
    },
  },
  {
    label: 'Web Scraper',
    description: 'Extract data from a page via CSS selectors (needs proxy)',
    draft: {
      name: 'Web Scraper',
      icon: '🕷️',
      type: 'web_scraper',
      config: {
        scrapeUrl: 'https://example.com',
        selectors: JSON.stringify(
          { title: 'h1', description: 'p:first-of-type' },
          null,
          2
        ),
      },
      displayMode: 'key_value',
      description: 'Scrape structured data from a webpage',
      keywords: ['scrape', 'crawl', 'web', 'extract'],
      schedule: { enabled: false, intervalSeconds: 3600 },
    },
  },
  {
    label: 'Countdown Timer',
    description: 'Days/hours until a target date',
    draft: {
      name: 'Countdown',
      icon: '⏳',
      type: 'javascript',
      config: {
        code: `// Edit the target date below
const target = new Date('2026-12-31T00:00:00');
const now = new Date();
const diff = target - now;
const days = Math.floor(diff / 86400000);
const hours = Math.floor((diff % 86400000) / 3600000);
const mins = Math.floor((diff % 3600000) / 60000);
return {
  title: 'New Year 2027',
  value: days,
  unit: 'days',
  change: hours + 'h ' + mins + 'm remaining today',
};`,
      },
      displayMode: 'metric',
      description: 'Countdown to a target date',
      keywords: ['countdown', 'timer', 'deadline'],
      schedule: { enabled: true, intervalSeconds: 60 },
    },
  },
];
