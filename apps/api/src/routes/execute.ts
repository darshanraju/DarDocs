import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/requireAuth.js';
import { execFile } from 'node:child_process';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TIMEOUT_MS = 10_000;
const MAX_OUTPUT = 10_000; // chars

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

async function runInSandbox(
  language: string,
  code: string
): Promise<ExecResult> {
  const dir = await mkdtemp(join(tmpdir(), 'dardocs-exec-'));
  let filePath: string;
  let cmd: string;
  let args: string[];

  switch (language) {
    case 'javascript':
    case 'js': {
      filePath = join(dir, 'script.mjs');
      await writeFile(filePath, code, 'utf-8');
      cmd = process.execPath; // node
      args = ['--experimental-vm-modules', filePath];
      break;
    }
    case 'python':
    case 'py': {
      filePath = join(dir, 'script.py');
      await writeFile(filePath, code, 'utf-8');
      cmd = 'python3';
      args = [filePath];
      break;
    }
    case 'bash':
    case 'sh': {
      filePath = join(dir, 'script.sh');
      await writeFile(filePath, code, 'utf-8');
      cmd = 'bash';
      args = [filePath];
      break;
    }
    default:
      return {
        stdout: '',
        stderr: `Unsupported language: ${language}. Supported: javascript, python, bash`,
        exitCode: 1,
        timedOut: false,
      };
  }

  return new Promise<ExecResult>((resolve) => {
    const child = execFile(
      cmd,
      args,
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, NODE_ENV: 'sandbox' },
      },
      (error, stdout, stderr) => {
        // Cleanup temp files
        unlink(filePath).catch(() => {});

        const timedOut = error?.killed === true;
        const exitCode = timedOut ? 124 : (error as any)?.code ?? 0;

        resolve({
          stdout: String(stdout).slice(0, MAX_OUTPUT),
          stderr: String(stderr).slice(0, MAX_OUTPUT),
          exitCode: typeof exitCode === 'number' ? exitCode : 1,
          timedOut,
        });
      }
    );
  });
}

export async function executeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // POST /api/execute — run code and return output
  app.post('/api/execute', async (request, reply) => {
    const { language, code } = request.body as {
      language: string;
      code: string;
    };

    if (!code?.trim()) {
      return reply.status(400).send({ error: 'No code provided' });
    }

    if (!language?.trim()) {
      return reply
        .status(400)
        .send({ error: 'Language is required (javascript, python, bash)' });
    }

    const result = await runInSandbox(language.toLowerCase(), code);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
    };
  });
}
