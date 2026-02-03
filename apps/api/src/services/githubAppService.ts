import { createSign, createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { githubAppInstallations } from '../lib/schema.js';
import { env } from '../lib/env.js';

const GITHUB_API = 'https://api.github.com';

// ─── JWT signing (RS256) ─────────────────────────────────────

function base64url(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64url');
}

function createAppJwt(): string {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error('GitHub App not configured (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY missing)');
  }

  const pem = Buffer.from(env.GITHUB_APP_PRIVATE_KEY, 'base64').toString('utf-8');
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: env.GITHUB_APP_ID,
      iat: now - 60, // 1 minute drift tolerance
      exp: now + 600, // 10 minute max
    })
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(pem, 'base64url');

  return `${header}.${payload}.${signature}`;
}

// ─── GitHub API helpers ──────────────────────────────────────

async function ghFetch<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Installation token ──────────────────────────────────────

interface InstallationToken {
  token: string;
  expires_at: string;
}

export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = createAppJwt();
  const data = await ghFetch<InstallationToken>(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    jwt,
    { method: 'POST' }
  );
  return data.token;
}

export async function getInstallationTokenForWorkspace(
  workspaceId: string
): Promise<string | null> {
  const [installation] = await db
    .select()
    .from(githubAppInstallations)
    .where(eq(githubAppInstallations.workspaceId, workspaceId))
    .limit(1);

  if (!installation) return null;

  return getInstallationToken(installation.installationId);
}

// ─── Installation info ───────────────────────────────────────

interface GHInstallation {
  id: number;
  account: { login: string; avatar_url: string; type: string };
  repository_selection: 'all' | 'selected';
}

export async function getInstallationInfo(
  installationId: number
): Promise<GHInstallation> {
  const jwt = createAppJwt();
  return ghFetch<GHInstallation>(
    `${GITHUB_API}/app/installations/${installationId}`,
    jwt
  );
}

// ─── List repos accessible to installation ───────────────────

interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  html_url: string;
  description: string | null;
}

interface GHRepoList {
  total_count: number;
  repositories: GHRepo[];
}

export async function listInstallationRepos(
  installationId: number
): Promise<GHRepo[]> {
  const token = await getInstallationToken(installationId);
  const data = await ghFetch<GHRepoList>(
    `${GITHUB_API}/installation/repositories?per_page=100`,
    token
  );
  return data.repositories;
}

// ─── Webhook signature verification ──────────────────────────

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!env.GITHUB_APP_WEBHOOK_SECRET) return false;

  const expected =
    'sha256=' +
    createHmac('sha256', env.GITHUB_APP_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Check if GitHub App is configured ───────────────────────

export function isGitHubAppConfigured(): boolean {
  return !!(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
}
