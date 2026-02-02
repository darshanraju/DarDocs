import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type {
  GodModeRepoConfig,
  Contributor,
  SystemConnection,
  GlossaryTerm,
  HotZone,
  ApiEndpoint,
  ErrorPattern,
  SetupStep,
  ArchDecision,
  RepoAnalysis,
} from '@dardocs/core';

const GIT_TIMEOUT = 30_000;
const GREP_TIMEOUT = 15_000;

// ─── Helpers ─────────────────────────────────────────────────

function exec(
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

async function readFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.rb',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift',
  '.vue', '.svelte',
]);

const IGNORE_DIRS = new Set([
  'node_modules', 'vendor', 'dist', 'build', '.git',
  '__pycache__', '.next', '.nuxt', 'coverage', '.cache',
]);

// ─── Sub-analyzers ───────────────────────────────────────────

async function analyzeContributors(cwd: string): Promise<Contributor[]> {
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

async function analyzeHotZones(cwd: string): Promise<HotZone[]> {
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

async function analyzeTechStack(cwd: string): Promise<{
  techStack: string[];
  testFrameworks: string[];
  cicdPlatform: string;
}> {
  const techStack: string[] = [];
  const testFrameworks: string[] = [];
  let cicdPlatform = 'unknown';

  // ── package.json detection ──
  const pkgJson = await readFileIfExists(join(cwd, 'package.json'));
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Frameworks
      if (allDeps['react']) techStack.push('React');
      if (allDeps['next']) techStack.push('Next.js');
      if (allDeps['vue']) techStack.push('Vue');
      if (allDeps['nuxt']) techStack.push('Nuxt');
      if (allDeps['svelte']) techStack.push('Svelte');
      if (allDeps['@angular/core']) techStack.push('Angular');
      if (allDeps['express']) techStack.push('Express');
      if (allDeps['fastify']) techStack.push('Fastify');
      if (allDeps['nestjs'] || allDeps['@nestjs/core']) techStack.push('NestJS');
      if (allDeps['hono']) techStack.push('Hono');
      if (allDeps['typescript']) techStack.push('TypeScript');
      if (allDeps['tailwindcss']) techStack.push('Tailwind CSS');
      if (allDeps['prisma'] || allDeps['@prisma/client']) techStack.push('Prisma');
      if (allDeps['drizzle-orm']) techStack.push('Drizzle');
      if (allDeps['zustand']) techStack.push('Zustand');
      if (allDeps['redux'] || allDeps['@reduxjs/toolkit']) techStack.push('Redux');

      // Test frameworks
      if (allDeps['jest']) testFrameworks.push('Jest');
      if (allDeps['vitest']) testFrameworks.push('Vitest');
      if (allDeps['mocha']) testFrameworks.push('Mocha');
      if (allDeps['cypress']) testFrameworks.push('Cypress');
      if (allDeps['playwright'] || allDeps['@playwright/test']) testFrameworks.push('Playwright');
    } catch {
      // Invalid JSON
    }
  }

  // ── Python detection ──
  const requirements = await readFileIfExists(join(cwd, 'requirements.txt'));
  if (requirements) {
    techStack.push('Python');
    if (requirements.includes('django')) techStack.push('Django');
    if (requirements.includes('flask')) techStack.push('Flask');
    if (requirements.includes('fastapi')) techStack.push('FastAPI');
    if (requirements.includes('pytest')) testFrameworks.push('pytest');
  }
  const pyproject = await readFileIfExists(join(cwd, 'pyproject.toml'));
  if (pyproject) {
    if (!techStack.includes('Python')) techStack.push('Python');
    if (pyproject.includes('pytest')) testFrameworks.push('pytest');
  }

  // ── Go detection ──
  const goMod = await readFileIfExists(join(cwd, 'go.mod'));
  if (goMod) {
    techStack.push('Go');
    testFrameworks.push('go test');
  }

  // ── Rust detection ──
  const cargoToml = await readFileIfExists(join(cwd, 'Cargo.toml'));
  if (cargoToml) {
    techStack.push('Rust');
    testFrameworks.push('cargo test');
  }

  // ── Docker detection ──
  if (await fileExists(join(cwd, 'Dockerfile'))) {
    techStack.push('Docker');
  }
  if (await fileExists(join(cwd, 'docker-compose.yml')) || await fileExists(join(cwd, 'docker-compose.yaml'))) {
    techStack.push('Docker Compose');
  }

  // ── CI/CD detection ──
  if (await fileExists(join(cwd, '.github/workflows'))) {
    cicdPlatform = 'GitHub Actions';
  } else if (await fileExists(join(cwd, '.gitlab-ci.yml'))) {
    cicdPlatform = 'GitLab CI';
  } else if (await fileExists(join(cwd, 'Jenkinsfile'))) {
    cicdPlatform = 'Jenkins';
  } else if (await fileExists(join(cwd, '.circleci/config.yml'))) {
    cicdPlatform = 'CircleCI';
  }

  return { techStack, testFrameworks, cicdPlatform };
}

async function analyzeApiEndpoints(cwd: string): Promise<ApiEndpoint[]> {
  const endpoints: ApiEndpoint[] = [];

  // Express/Fastify route patterns
  const patterns = [
    { regex: /\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/, style: 'express' },
    { regex: /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]([^'"`]+)['"`]/, style: 'decorator' },
  ];

  for (const { regex, style } of patterns) {
    try {
      const raw = await exec(
        'grep',
        ['-rn', '--include=*.ts', '--include=*.js', '--include=*.tsx', '--include=*.jsx',
         '-E', regex.source, '.'],
        { cwd, timeout: GREP_TIMEOUT }
      );

      for (const line of raw.trim().split('\n')) {
        if (!line) continue;
        const colonIdx = line.indexOf(':');
        const secondColon = line.indexOf(':', colonIdx + 1);
        if (colonIdx < 0 || secondColon < 0) continue;

        const sourceFile = line.substring(0, colonIdx).replace(/^\.\//, '');
        const content = line.substring(secondColon + 1);

        // Skip node_modules, dist, etc.
        if (IGNORE_DIRS.has(sourceFile.split('/')[0])) continue;

        const match = content.match(regex);
        if (match) {
          const method = match[1].toUpperCase();
          const path = match[2];
          endpoints.push({
            method,
            path,
            description: '',
            sourceFile,
          });
        }
      }
    } catch {
      // grep returned no matches or errored
    }
  }

  return endpoints;
}

async function analyzeErrorPatterns(cwd: string): Promise<ErrorPattern[]> {
  const errors: ErrorPattern[] = [];

  try {
    const raw = await exec(
      'grep',
      ['-rn', '--include=*.ts', '--include=*.js',
       '-E', 'class\\s+\\w*(Error|Exception)\\s+extends', '.'],
      { cwd, timeout: GREP_TIMEOUT }
    );

    for (const line of raw.trim().split('\n')) {
      if (!line) continue;
      const colonIdx = line.indexOf(':');
      const secondColon = line.indexOf(':', colonIdx + 1);
      if (colonIdx < 0 || secondColon < 0) continue;

      const sourceFile = line.substring(0, colonIdx).replace(/^\.\//, '');
      const content = line.substring(secondColon + 1);

      if (IGNORE_DIRS.has(sourceFile.split('/')[0])) continue;

      const match = content.match(/class\s+(\w+)\s+extends/);
      if (match) {
        // Try to extract a message or status from the same line or next
        const statusMatch = content.match(/(\d{3})/);
        errors.push({
          className: match[1],
          message: '',
          sourceFile,
          httpStatus: statusMatch ? parseInt(statusMatch[1], 10) : undefined,
        });
      }
    }
  } catch {
    // No matches
  }

  return errors;
}

async function analyzeGlossary(cwd: string): Promise<GlossaryTerm[]> {
  // Scan source files for short uppercase tokens (likely abbreviations/jargon)
  const stoplist = new Set([
    'API', 'URL', 'HTML', 'CSS', 'JSON', 'XML', 'SQL', 'DOM', 'HTTP', 'HTTPS',
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
    'UTF', 'ASCII', 'NULL', 'TRUE', 'FALSE', 'TODO', 'FIXME', 'HACK',
    'ENV', 'EOF', 'EOL', 'NPM', 'CLI', 'IDE', 'SDK', 'CDN', 'DNS',
    'SSH', 'SSL', 'TLS', 'TCP', 'UDP', 'FTP', 'AWS', 'GCP',
    'NOT', 'AND', 'FOR', 'THE', 'USE', 'NEW', 'VAR', 'LET', 'INT',
  ]);

  const termCounts = new Map<string, { count: number; files: Set<string> }>();

  try {
    const raw = await exec(
      'grep',
      ['-roh', '--include=*.ts', '--include=*.js', '--include=*.tsx', '--include=*.py',
       '-E', '\\b[A-Z]{2,6}\\b', '.'],
      { cwd, timeout: GREP_TIMEOUT }
    );

    // This gives us one match per line with -o, but no file info with -h
    // Instead, let's use a simpler approach
    for (const term of raw.trim().split('\n')) {
      const t = term.trim();
      if (!t || stoplist.has(t) || t.length < 2) continue;
      const entry = termCounts.get(t) || { count: 0, files: new Set<string>() };
      entry.count++;
      termCounts.set(t, entry);
    }
  } catch {
    // No matches
  }

  // Also scan with file info for top terms
  const glossary: GlossaryTerm[] = [];
  const sorted = [...termCounts.entries()]
    .filter(([, v]) => v.count >= 5)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

  for (const [term, { count }] of sorted) {
    // Find which files contain this term
    let files: string[] = [];
    try {
      const filesRaw = await exec(
        'grep',
        ['-rl', '--include=*.ts', '--include=*.js', '--include=*.tsx',
         '-w', term, '.'],
        { cwd, timeout: GREP_TIMEOUT }
      );
      files = filesRaw.trim().split('\n')
        .filter(Boolean)
        .map(f => f.replace(/^\.\//, ''))
        .filter(f => !IGNORE_DIRS.has(f.split('/')[0]))
        .slice(0, 5);
    } catch {
      // Skip
    }

    glossary.push({
      term,
      occurrences: count,
      files,
      inferredDefinition: '',
      context: `Found ${count} occurrences across ${files.length} files`,
    });
  }

  return glossary;
}

async function analyzeSetupSteps(cwd: string): Promise<SetupStep[]> {
  const steps: SetupStep[] = [];
  let order = 1;

  // Check for .nvmrc or .node-version
  const nvmrc = await readFileIfExists(join(cwd, '.nvmrc'));
  const nodeVersion = await readFileIfExists(join(cwd, '.node-version'));
  if (nvmrc || nodeVersion) {
    const version = (nvmrc || nodeVersion)!.trim();
    steps.push({
      order: order++,
      command: `nvm use ${version}`,
      description: `Use Node.js ${version}`,
      notes: 'Requires nvm installed',
    });
  }

  // Check package manager
  const pkgJson = await readFileIfExists(join(cwd, 'package.json'));
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      const pm = pkg.packageManager?.startsWith('pnpm') ? 'pnpm' :
                 pkg.packageManager?.startsWith('yarn') ? 'yarn' : 'npm';

      steps.push({
        order: order++,
        command: `${pm} install`,
        description: 'Install dependencies',
      });

      // Check for common scripts
      if (pkg.scripts?.['db:push'] || pkg.scripts?.['db:migrate']) {
        steps.push({
          order: order++,
          command: `${pm} run ${pkg.scripts['db:migrate'] ? 'db:migrate' : 'db:push'}`,
          description: 'Set up database',
          notes: 'Ensure DATABASE_URL is configured',
        });
      }

      if (pkg.scripts?.dev) {
        steps.push({
          order: order++,
          command: `${pm} run dev`,
          description: 'Start development server',
        });
      }
    } catch {
      // Invalid JSON
    }
  }

  // Python
  const requirements = await readFileIfExists(join(cwd, 'requirements.txt'));
  if (requirements) {
    steps.push({
      order: order++,
      command: 'python -m venv venv && source venv/bin/activate',
      description: 'Create and activate virtual environment',
    });
    steps.push({
      order: order++,
      command: 'pip install -r requirements.txt',
      description: 'Install Python dependencies',
    });
  }

  // Go
  if (await fileExists(join(cwd, 'go.mod'))) {
    steps.push({
      order: order++,
      command: 'go mod download',
      description: 'Download Go dependencies',
    });
  }

  // Rust
  if (await fileExists(join(cwd, 'Cargo.toml'))) {
    steps.push({
      order: order++,
      command: 'cargo build',
      description: 'Build Rust project',
    });
  }

  // .env example
  if (await fileExists(join(cwd, '.env.example'))) {
    steps.push({
      order: order++,
      command: 'cp .env.example .env',
      description: 'Copy environment variables template',
      notes: 'Edit .env with your local values',
    });
  }

  // Docker
  if (await fileExists(join(cwd, 'docker-compose.yml')) || await fileExists(join(cwd, 'docker-compose.yaml'))) {
    steps.push({
      order: order++,
      command: 'docker compose up -d',
      description: 'Start Docker services',
    });
  }

  return steps;
}

async function analyzeArchDecisions(cwd: string): Promise<ArchDecision[]> {
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

async function analyzeConnections(
  cwd: string,
  repoName: string,
  otherRepoNames: string[]
): Promise<SystemConnection[]> {
  const connections: SystemConnection[] = [];

  for (const otherRepo of otherRepoNames) {
    // Search for references to the other repo name in source files
    try {
      const raw = await exec(
        'grep',
        ['-rl', '--include=*.ts', '--include=*.js', '--include=*.py', '--include=*.go',
         '-i', otherRepo, '.'],
        { cwd, timeout: GREP_TIMEOUT }
      );

      const files = raw.trim().split('\n').filter(Boolean);
      if (files.length > 0) {
        connections.push({
          fromRepo: repoName,
          toRepo: otherRepo,
          connectionType: 'import',
          description: `References found in ${files.length} files`,
          endpoints: files.slice(0, 5).map(f => f.replace(/^\.\//, '')),
        });
      }
    } catch {
      // No references
    }
  }

  // Look for API URL patterns (fetch/axios calls to external services)
  try {
    const raw = await exec(
      'grep',
      ['-rn', '--include=*.ts', '--include=*.js',
       '-E', '(fetch|axios|http\\.)(get|post|put|delete)?\\s*\\(\\s*[\'"`](https?://)', '.'],
      { cwd, timeout: GREP_TIMEOUT }
    );

    const urls = new Set<string>();
    for (const line of raw.trim().split('\n')) {
      const urlMatch = line.match(/(https?:\/\/[^'"`\s]+)/);
      if (urlMatch) urls.add(urlMatch[1]);
    }

    if (urls.size > 0) {
      connections.push({
        fromRepo: repoName,
        toRepo: 'external-apis',
        connectionType: 'api',
        description: `Makes HTTP calls to ${urls.size} external URLs`,
        endpoints: [...urls].slice(0, 10),
      });
    }
  } catch {
    // No matches
  }

  return connections;
}

// ─── Main entry ──────────────────────────────────────────────

export async function analyzeRepo(
  config: GodModeRepoConfig,
  clonePath: string,
  otherRepoNames: string[]
): Promise<RepoAnalysis> {
  const [
    contributors,
    hotZones,
    { techStack, testFrameworks, cicdPlatform },
    apiEndpoints,
    errorPatterns,
    glossary,
    setupSteps,
    archDecisions,
    connections,
  ] = await Promise.all([
    analyzeContributors(clonePath),
    analyzeHotZones(clonePath),
    analyzeTechStack(clonePath),
    analyzeApiEndpoints(clonePath),
    analyzeErrorPatterns(clonePath),
    analyzeGlossary(clonePath),
    analyzeSetupSteps(clonePath),
    analyzeArchDecisions(clonePath),
    analyzeConnections(clonePath, config.repo, otherRepoNames),
  ]);

  const pms = config.teamMembers.filter((m) => m.role === 'pm');

  return {
    repoId: config.id,
    repoName: config.repo,
    repoRole: config.role,
    description: config.description,
    contributors,
    pms,
    connections,
    glossary,
    hotZones,
    apiEndpoints,
    errorPatterns,
    setupSteps,
    archDecisions,
    techStack,
    testFrameworks,
    cicdPlatform,
    lastAnalyzedAt: new Date().toISOString(),
  };
}
