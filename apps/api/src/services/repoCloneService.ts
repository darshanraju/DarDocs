import { execFile } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq, and, lt } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { repoClones } from '../lib/schema.js';
import { env } from '../lib/env.js';

const CLONE_TIMEOUT_MS = 120_000; // 2 min
const FETCH_TIMEOUT_MS = 60_000; // 1 min
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface CloneResult {
  diskPath: string;
  cloneId: string;
  fromCache: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function exec(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { ...opts, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr?.toString().trim() || error.message;
        reject(new Error(msg));
      } else {
        resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
      }
    });
  });
}

function buildCloneUrl(owner: string, repo: string, token?: string): string {
  if (token) {
    return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  }
  return `https://github.com/${owner}/${repo}.git`;
}

function publicCloneUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}.git`;
}

function diskPathFor(owner: string, repo: string): string {
  return join(env.CLONE_DIR, `${owner}_${repo}`);
}

// ─── Core operations ─────────────────────────────────────────

async function gitClone(
  cloneUrl: string,
  diskPath: string,
  depth: number
): Promise<void> {
  await mkdir(diskPath, { recursive: true });
  await exec(
    'git',
    ['clone', '--depth', String(depth), '--single-branch', cloneUrl, diskPath],
    { timeout: CLONE_TIMEOUT_MS }
  );
}

async function gitFetch(diskPath: string): Promise<void> {
  await exec('git', ['fetch', '--depth', '500', 'origin'], {
    cwd: diskPath,
    timeout: FETCH_TIMEOUT_MS,
  });
  // Reset to latest remote HEAD
  await exec('git', ['reset', '--hard', 'origin/HEAD'], {
    cwd: diskPath,
    timeout: 30_000,
  });
}

async function getDiskSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await exec('du', ['-sb', dirPath], { timeout: 30_000 });
    const bytes = parseInt(stdout.split('\t')[0], 10);
    return isNaN(bytes) ? 0 : bytes;
  } catch {
    return 0;
  }
}

// ─── Public API ──────────────────────────────────────────────

export async function ensureClone(
  owner: string,
  repo: string,
  githubToken?: string
): Promise<CloneResult> {
  // Ensure the clone directory exists
  await mkdir(env.CLONE_DIR, { recursive: true });

  // Check for an existing clone in the DB
  const existing = await db
    .select()
    .from(repoClones)
    .where(and(eq(repoClones.owner, owner), eq(repoClones.repo, repo)))
    .limit(1);

  const record = existing[0];

  if (record && record.status === 'ready') {
    const age = Date.now() - (record.lastSyncedAt?.getTime() ?? 0);

    if (age < STALE_THRESHOLD_MS) {
      // Fresh enough — return cached
      return { diskPath: record.diskPath, cloneId: record.id, fromCache: true };
    }

    // Stale — try to fetch updates
    try {
      await db
        .update(repoClones)
        .set({ status: 'cloning', updatedAt: new Date() })
        .where(eq(repoClones.id, record.id));

      await gitFetch(record.diskPath);

      const sizeBytes = await getDiskSize(record.diskPath);
      await db
        .update(repoClones)
        .set({
          status: 'ready',
          lastSyncedAt: new Date(),
          diskSizeBytes: sizeBytes,
          updatedAt: new Date(),
        })
        .where(eq(repoClones.id, record.id));

      return { diskPath: record.diskPath, cloneId: record.id, fromCache: true };
    } catch (err) {
      // Fetch failed — try a fresh clone below
      await rm(record.diskPath, { recursive: true, force: true }).catch(() => {});
      await db.delete(repoClones).where(eq(repoClones.id, record.id));
    }
  }

  // If record exists but is in error/evicted state, clean up
  if (record && record.status !== 'ready') {
    await rm(record.diskPath, { recursive: true, force: true }).catch(() => {});
    await db.delete(repoClones).where(eq(repoClones.id, record.id));
  }

  // Fresh clone
  const id = randomUUID();
  const diskPath = diskPathFor(owner, repo);
  const cloneUrl = buildCloneUrl(owner, repo, githubToken);

  await db.insert(repoClones).values({
    id,
    owner,
    repo,
    cloneUrl: publicCloneUrl(owner, repo), // Never persist the token
    diskPath,
    status: 'cloning',
    cloneDepth: 500,
  });

  try {
    // Remove any stale directory first
    await rm(diskPath, { recursive: true, force: true }).catch(() => {});
    await gitClone(cloneUrl, diskPath, 500);

    const sizeBytes = await getDiskSize(diskPath);
    await db
      .update(repoClones)
      .set({
        status: 'ready',
        lastSyncedAt: new Date(),
        diskSizeBytes: sizeBytes,
        updatedAt: new Date(),
      })
      .where(eq(repoClones.id, id));

    return { diskPath, cloneId: id, fromCache: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clone failed';
    await db
      .update(repoClones)
      .set({ status: 'error', errorMessage: message, updatedAt: new Date() })
      .where(eq(repoClones.id, id));
    throw new Error(`Failed to clone ${owner}/${repo}: ${message}`);
  }
}

export async function evictStaleClones(maxAgeDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const stale = await db
    .select()
    .from(repoClones)
    .where(and(eq(repoClones.status, 'ready'), lt(repoClones.lastSyncedAt, cutoff)));

  let evicted = 0;
  for (const record of stale) {
    await rm(record.diskPath, { recursive: true, force: true }).catch(() => {});
    await db
      .update(repoClones)
      .set({ status: 'evicted', updatedAt: new Date() })
      .where(eq(repoClones.id, record.id));
    evicted++;
  }

  return evicted;
}
