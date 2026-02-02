import { join } from 'node:path';
import type { CodeProvider } from '@dardocs/core';
import type {
  ApiEndpoint,
  ErrorPattern,
  GlossaryTerm,
  SystemConnection,
  SetupStep,
} from '@dardocs/core';
import { exec, readFileIfExists, fileExists, GREP_TIMEOUT, IGNORE_DIRS } from './utils.js';

export class GrepCodeProvider implements CodeProvider {
  async getApiEndpoints(cwd: string): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];

    // Express/Fastify route patterns
    const patterns = [
      { regex: /\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/, style: 'express' },
      { regex: /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]([^'"`]+)['"`]/, style: 'decorator' },
    ];

    for (const { regex } of patterns) {
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

  async getErrorPatterns(cwd: string): Promise<ErrorPattern[]> {
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

  async getGlossaryTerms(cwd: string): Promise<GlossaryTerm[]> {
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

    const glossary: GlossaryTerm[] = [];
    const sorted = [...termCounts.entries()]
      .filter(([, v]) => v.count >= 5)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    for (const [term, { count }] of sorted) {
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

  async getConnections(cwd: string, repoName: string, otherRepos: string[]): Promise<SystemConnection[]> {
    const connections: SystemConnection[] = [];

    for (const otherRepo of otherRepos) {
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

  async getTechStack(cwd: string): Promise<{
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

  async getSetupSteps(cwd: string): Promise<SetupStep[]> {
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
}
