import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';

export const GIT_TIMEOUT = 30_000;
export const GREP_TIMEOUT = 15_000;

export const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.rb',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift',
  '.vue', '.svelte',
]);

export const IGNORE_DIRS = new Set([
  'node_modules', 'vendor', 'dist', 'build', '.git',
  '__pycache__', '.next', '.nuxt', 'coverage', '.cache',
]);

export function exec(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeout?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd: opts.cwd, timeout: opts.timeout ?? GIT_TIMEOUT, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        // For grep/git log, exit code 1 = no matches, not an error
        if (error && (error as any).code !== 1) {
          reject(error);
        } else {
          resolve(stdout?.toString() ?? '');
        }
      }
    );
  });
}

export async function readFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}
