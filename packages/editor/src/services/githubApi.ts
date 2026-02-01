import type { RepoConfig } from '@dardocs/core';

interface GitHubTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface RepoFile {
  path: string;
  content: string;
}

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx',
  '.go', '.py', '.rb', '.java', '.kt',
  '.rs', '.cs', '.cpp', '.c', '.h',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules', 'vendor', 'dist', 'build', '.git', '__pycache__', '.next',
]);

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function isCodeFile(path: string): boolean {
  const ext = path.slice(path.lastIndexOf('.'));
  return CODE_EXTENSIONS.has(ext);
}

function isExcludedDir(path: string): boolean {
  return path.split('/').some((part) => EXCLUDED_DIRS.has(part));
}

/**
 * Get the recursive file tree of a repo (default branch).
 * Returns only code files, excluding common non-source dirs.
 */
export async function getRepoTree(repo: RepoConfig): Promise<string[]> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/HEAD?recursive=1`;
  const res = await fetch(url, { headers: headers(repo.token) });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const entries: GitHubTreeEntry[] = data.tree || [];

  return entries
    .filter((e) => e.type === 'blob' && isCodeFile(e.path) && !isExcludedDir(e.path))
    .map((e) => e.path);
}

/**
 * Fetch the content of a single file from the repo.
 */
export async function getFileContent(repo: RepoConfig, path: string): Promise<string> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${path}`;
  const res = await fetch(url, { headers: headers(repo.token) });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json();
  if (data.encoding === 'base64') {
    return atob(data.content);
  }
  return data.content;
}

/**
 * Use GitHub code search to find files containing a query string.
 * Note: Only works on public repos or with authenticated requests.
 */
export async function searchCode(
  repo: RepoConfig,
  query: string
): Promise<string[]> {
  const q = encodeURIComponent(`${query} repo:${repo.owner}/${repo.repo}`);
  const url = `https://api.github.com/search/code?q=${q}&per_page=30`;
  const res = await fetch(url, { headers: headers(repo.token) });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map((item: { path: string }) => item.path);
}
