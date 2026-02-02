import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitProvider } from '@dardocs/core';
import type { Contributor, HotZone, ArchDecision } from '@dardocs/core';
import { exec, readFileIfExists } from './utils.js';

export class GitCliProvider implements GitProvider {
  async getContributors(cwd: string): Promise<Contributor[]> {
    const raw = await exec('git', ['shortlog', '-sne', '--all', 'HEAD'], { cwd });
    if (!raw.trim()) return [];

    const lines = raw.trim().split('\n');
    const contributors: Contributor[] = [];

    for (const line of lines.slice(0, 30)) {
      const match = line.trim().match(/^(\d+)\t(.+?)\s+<(.+?)>$/);
      if (!match) continue;

      const [, commits, name, email] = match;
      const github = email.includes('@users.noreply.github.com')
        ? email.split('@')[0].replace(/^\d+\+/, '')
        : '';

      // Get lines added/removed
      let linesAdded = 0;
      let linesRemoved = 0;
      try {
        const numstat = await exec(
          'git',
          ['log', `--author=${name}`, '--pretty=tformat:', '--numstat', '-100', 'HEAD'],
          { cwd }
        );
        for (const nline of numstat.trim().split('\n')) {
          const parts = nline.split('\t');
          if (parts.length >= 2) {
            const added = parseInt(parts[0], 10);
            const removed = parseInt(parts[1], 10);
            if (!isNaN(added)) linesAdded += added;
            if (!isNaN(removed)) linesRemoved += removed;
          }
        }
      } catch {
        // Skip if we can't get numstat
      }

      // Get last active date
      let lastActive = '';
      try {
        const dateOut = await exec(
          'git',
          ['log', `--author=${name}`, '-1', '--format=%aI', 'HEAD'],
          { cwd }
        );
        lastActive = dateOut.trim();
      } catch {
        // Skip
      }

      contributors.push({
        name,
        github,
        commits: parseInt(commits, 10),
        linesAdded,
        linesRemoved,
        lastActive,
      });
    }

    return contributors;
  }

  async getHotZones(cwd: string): Promise<HotZone[]> {
    // Get files changed in the last 500 commits
    const raw = await exec(
      'git',
      ['log', '--pretty=format:', '--name-only', '-500', 'HEAD'],
      { cwd }
    );

    if (!raw.trim()) return [];

    // Count changes per file
    const counts = new Map<string, number>();
    for (const line of raw.split('\n')) {
      const file = line.trim();
      if (!file) continue;
      counts.set(file, (counts.get(file) || 0) + 1);
    }

    // Sort by change count and take top 20
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const hotZones: HotZone[] = [];
    for (const [filePath, changeCount] of sorted) {
      // Get last change date
      let lastChanged = '';
      try {
        const dateOut = await exec(
          'git',
          ['log', '-1', '--format=%aI', '--', filePath],
          { cwd }
        );
        lastChanged = dateOut.trim();
      } catch {
        // Skip
      }

      // Get contributors for this file
      let fileContributors: string[] = [];
      try {
        const authorsOut = await exec(
          'git',
          ['log', '--format=%an', '--', filePath],
          { cwd }
        );
        fileContributors = [...new Set(authorsOut.trim().split('\n').filter(Boolean))].slice(0, 5);
      } catch {
        // Skip
      }

      hotZones.push({
        filePath,
        changeCount,
        lastChanged,
        contributors: fileContributors,
        description: `Changed ${changeCount} times in the last 500 commits`,
      });
    }

    return hotZones;
  }

  async getArchDecisions(cwd: string): Promise<ArchDecision[]> {
    const decisions: ArchDecision[] = [];
    const keywords = ['migrate', 'adopt', 'switch to', 'replace', 'introduce', 'deprecate', 'remove', 'rfc', 'adr'];
    const keywordPattern = keywords.join('|');

    try {
      const raw = await exec(
        'git',
        ['log', '--format=%aI|||%s|||%b', '-500', 'HEAD'],
        { cwd }
      );

      for (const entry of raw.split('\n')) {
        if (!entry.trim()) continue;
        const parts = entry.split('|||');
        if (parts.length < 2) continue;

        const [date, subject, body] = parts;
        const combined = `${subject} ${body || ''}`.toLowerCase();

        if (new RegExp(keywordPattern, 'i').test(combined)) {
          decisions.push({
            date: date.trim(),
            summary: subject.trim(),
            source: 'commit',
            context: (body || '').trim().slice(0, 200),
          });
        }
      }
    } catch {
      // Skip
    }

    // Also check for ADR directories
    const adrDirs = ['docs/decisions', 'docs/adr', 'adr', 'decisions'];
    for (const dir of adrDirs) {
      try {
        const entries = await readdir(join(cwd, dir));
        for (const entry of entries.filter(e => e.endsWith('.md'))) {
          const content = await readFileIfExists(join(cwd, dir, entry));
          if (content) {
            const titleMatch = content.match(/^#\s+(.+)/m);
            decisions.push({
              date: '',
              summary: titleMatch?.[1] || entry.replace('.md', ''),
              source: `${dir}/${entry}`,
              context: content.slice(0, 200),
            });
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }

    return decisions.slice(0, 20);
  }
}
