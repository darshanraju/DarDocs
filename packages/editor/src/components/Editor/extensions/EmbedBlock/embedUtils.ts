export type EmbedType = 'figma' | 'google-sheet' | 'github' | 'github-gist' | 'grafana' | 'swagger' | 'webview';

export interface EmbedConfig {
  label: string;
  iconColor: string;
  placeholder: string;
  urlPattern: RegExp;
  getEmbedUrl: (url: string) => string;
  renderMode: 'iframe' | 'github-card' | 'gist' | 'swagger';
  defaultHeight: number;
}

export const EMBED_CONFIGS: Record<EmbedType, EmbedConfig> = {
  figma: {
    label: 'Figma',
    iconColor: '#a259ff',
    placeholder: 'Paste a Figma URL (e.g., https://www.figma.com/file/...)',
    urlPattern: /^https:\/\/(www\.)?figma\.com\/(file|design|proto|board)\//,
    getEmbedUrl: (url) =>
      `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
    renderMode: 'iframe',
    defaultHeight: 450,
  },
  'google-sheet': {
    label: 'Google Sheet',
    iconColor: '#0f9d58',
    placeholder: 'Paste a Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/...)',
    urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets\/d\//,
    getEmbedUrl: (url) => {
      // Extract the spreadsheet base path (up to and including the ID)
      const base = url.split('?')[0].replace(/\/(edit|preview|pubhtml)$/, '').replace(/\/$/, '');
      // Preserve gid param if present so a specific sheet tab is shown
      const gidMatch = url.match(/gid=(\d+)/);
      const gidParam = gidMatch ? `?gid=${gidMatch[1]}` : '';
      // Use /preview which works with "anyone with the link" sharing
      return `${base}/preview${gidParam}`;
    },
    renderMode: 'iframe',
    defaultHeight: 400,
  },
  github: {
    label: 'GitHub',
    iconColor: '#24292e',
    placeholder: 'Paste a GitHub URL (repo, issue, or pull request)',
    urlPattern: /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/,
    getEmbedUrl: (url) => url,
    renderMode: 'github-card',
    defaultHeight: 0,
  },
  'github-gist': {
    label: 'GitHub Gist',
    iconColor: '#24292e',
    placeholder: 'Paste a GitHub Gist URL (e.g., https://gist.github.com/user/...)',
    urlPattern: /^https:\/\/gist\.github\.com\//,
    getEmbedUrl: (url) => url,
    renderMode: 'gist',
    defaultHeight: 300,
  },
  grafana: {
    label: 'Grafana',
    iconColor: '#f46800',
    placeholder: 'Paste a Grafana dashboard or panel URL',
    urlPattern: /^https?:\/\/.+\/(d|d-solo|dashboard)\//,
    getEmbedUrl: (url) => {
      let embedUrl = url;
      if (url.includes('/d/') && !url.includes('/d-solo/')) {
        embedUrl = url.replace('/d/', '/d-solo/');
      }
      const separator = embedUrl.includes('?') ? '&' : '?';
      return `${embedUrl}${separator}kiosk`;
    },
    renderMode: 'iframe',
    defaultHeight: 350,
  },
  swagger: {
    label: 'Swagger / OpenAPI',
    iconColor: '#49cc90',
    placeholder: 'Paste an OpenAPI spec URL (e.g., https://petstore.swagger.io/v2/swagger.json)',
    urlPattern: /^https?:\/\/.+/,
    getEmbedUrl: (url) => url,
    renderMode: 'swagger',
    defaultHeight: 500,
  },
  webview: {
    label: 'Webview',
    iconColor: '#3b82f6',
    placeholder: 'Paste any URL to embed as a webview (e.g., https://example.com)',
    urlPattern: /^https?:\/\/.+/,
    getEmbedUrl: (url) => url,
    renderMode: 'iframe',
    defaultHeight: 500,
  },
};

export interface GitHubUrlInfo {
  owner: string;
  repo: string;
  type: 'repo' | 'issue' | 'pull' | 'discussion' | 'other';
  number?: number;
}

export function parseGitHubUrl(url: string): GitHubUrlInfo | null {
  const match = url.match(
    /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:\/(issues|pull|discussions)\/(\d+))?/
  );
  if (!match) return null;

  const [, owner, repo, type, number] = match;
  const typeMap: Record<string, GitHubUrlInfo['type']> = {
    issues: 'issue',
    pull: 'pull',
    discussions: 'discussion',
  };

  return {
    owner,
    repo,
    type: type ? typeMap[type] || 'other' : 'repo',
    number: number ? parseInt(number) : undefined,
  };
}

export function parseGistUrl(url: string): { user: string; gistId: string } | null {
  const match = url.match(/^https:\/\/gist\.github\.com\/([\w.-]+)\/([\da-f]+)/);
  if (!match) return null;
  return { user: match[1], gistId: match[2] };
}
