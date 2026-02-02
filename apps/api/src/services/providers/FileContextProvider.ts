import { join } from 'node:path';
import type { ContextProvider } from '@dardocs/core';
import { readFileIfExists } from './utils.js';

const README_NAMES = ['README.md', 'readme.md', 'README.rst', 'README', 'README.txt'];
const MAX_CONTEXT_LENGTH = 8000;
const MAX_FILE_SLICE = 3000;
const MAX_README_SLICE = 3000;

export class FileContextProvider implements ContextProvider {
  async getRepoContext(cwd: string, relevantFiles?: string[]): Promise<string> {
    const parts: string[] = [];

    // 1. README
    for (const name of README_NAMES) {
      const content = await readFileIfExists(join(cwd, name));
      if (content) {
        parts.push(`# README\n${content.slice(0, MAX_README_SLICE)}`);
        break;
      }
    }

    // 2. package.json / pyproject.toml for project metadata
    const pkgJson = await readFileIfExists(join(cwd, 'package.json'));
    if (pkgJson) {
      try {
        const pkg = JSON.parse(pkgJson);
        const meta = [`Project: ${pkg.name || 'unknown'}`];
        if (pkg.description) meta.push(pkg.description);
        parts.push(meta.join('\n'));
      } catch { /* skip */ }
    }

    const pyproject = await readFileIfExists(join(cwd, 'pyproject.toml'));
    if (pyproject && !pkgJson) {
      parts.push(`# pyproject.toml (excerpt)\n${pyproject.slice(0, 500)}`);
    }

    // 3. Explicitly requested files
    if (relevantFiles) {
      for (const file of relevantFiles.slice(0, 5)) {
        const content = await readFileIfExists(join(cwd, file));
        if (content) {
          parts.push(`# ${file}\n${content.slice(0, 1500)}`);
        }
      }
    }

    return parts.join('\n\n---\n\n').slice(0, MAX_CONTEXT_LENGTH);
  }

  async getFileContext(cwd: string, filePath: string): Promise<string> {
    const content = await readFileIfExists(join(cwd, filePath));
    return content?.slice(0, MAX_FILE_SLICE) || '';
  }
}
