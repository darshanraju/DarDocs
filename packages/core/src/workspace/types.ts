export interface RepoConfig {
  id: string;
  name: string;
  url: string;
  owner: string;
  repo: string;
  token?: string;
  addedAt: string;
}

export interface GrafanaCredentials {
  url: string;
  apiKey: string;
  defaultDataSourceUid?: string;
}

export interface SentryCredentials {
  url: string;
  authToken: string;
  org: string;
  project?: string;
}

export interface DatadogCredentials {
  apiKey: string;
  appKey: string;
  site?: string;
}

export interface PagerDutyCredentials {
  apiKey: string;
}

export interface ProviderCredentials {
  grafana?: GrafanaCredentials;
  sentry?: SentryCredentials;
  datadog?: DatadogCredentials;
  pagerduty?: PagerDutyCredentials;
}

export interface AIConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
}

export interface WorkspaceConfig {
  key: 'config';
  repos: RepoConfig[];
  providers: ProviderCredentials;
  ai: AIConfig | null;
}

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  key: 'config',
  repos: [],
  providers: {},
  ai: null,
};

export function parseGitHubRepoUrl(url: string): { owner: string; repo: string; name: string } | null {
  const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) return null;
  const repo = match[2].replace(/\.git$/, '');
  return { owner: match[1], repo, name: repo };
}
