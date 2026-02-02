import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/requireAuth.js';
import { ensureClone, evictStaleClones } from '../services/repoCloneService.js';
import { analyzeRepo } from '../services/repoAnalyzer.js';
import { createDefaultProviders } from '../services/providers/index.js';
import type {
  GodModeConfig,
  GodModeAnalysisResult,
  AnalysisProgress,
  RepoAnalysis,
  AIConfig,
} from '@dardocs/core';

interface AnalyzeBody {
  config: GodModeConfig;
  githubToken?: string;
  aiConfig?: AIConfig;
}

export async function godModeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // POST /api/god-mode/analyze — clone repos and run full analysis (SSE stream)
  app.post('/api/god-mode/analyze', async (request, reply) => {
    const { config, githubToken, aiConfig } = request.body as AnalyzeBody;

    if (!config?.repos?.length) {
      return reply.status(400).send({ error: 'No repos configured' });
    }

    // Set up SSE streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const providers = createDefaultProviders(aiConfig);
      const repoAnalyses: RepoAnalysis[] = [];
      const totalRepos = config.repos.length;

      for (let i = 0; i < config.repos.length; i++) {
        const repo = config.repos[i];
        const basePercent = Math.round((i / totalRepos) * 80);

        // Phase: fetching-metadata
        send({
          phase: 'fetching-metadata',
          currentRepo: repo.repo,
          percent: basePercent + 2,
          message: `Validating ${repo.owner}/${repo.repo}...`,
        } satisfies AnalysisProgress);

        // Phase: cloning
        send({
          phase: 'cloning',
          currentRepo: repo.repo,
          percent: basePercent + 5,
          message: `Cloning ${repo.owner}/${repo.repo}...`,
        } satisfies AnalysisProgress);

        const clone = await ensureClone(repo.owner, repo.repo, githubToken);

        if (clone.fromCache) {
          send({
            phase: 'cloning',
            currentRepo: repo.repo,
            percent: basePercent + 15,
            message: `Using cached clone of ${repo.owner}/${repo.repo}`,
          } satisfies AnalysisProgress);
        }

        // Phase: analyzing-structure
        send({
          phase: 'analyzing-structure',
          currentRepo: repo.repo,
          percent: basePercent + 20,
          message: `Analyzing structure of ${repo.repo}...`,
        } satisfies AnalysisProgress);

        // Phase: analyzing-contributors
        send({
          phase: 'analyzing-contributors',
          currentRepo: repo.repo,
          percent: basePercent + 35,
          message: `Analyzing contributors of ${repo.repo}...`,
        } satisfies AnalysisProgress);

        // Phase: analyzing-connections
        send({
          phase: 'analyzing-connections',
          currentRepo: repo.repo,
          percent: basePercent + 50,
          message: `Detecting cross-repo connections for ${repo.repo}...`,
        } satisfies AnalysisProgress);

        // Phase: analyzing-glossary
        send({
          phase: 'analyzing-glossary',
          currentRepo: repo.repo,
          percent: basePercent + 60,
          message: `Scanning domain terminology in ${repo.repo}...`,
        } satisfies AnalysisProgress);

        const otherRepos = config.repos
          .filter((r) => r.id !== repo.id)
          .map((r) => r.repo);

        const analysis = await analyzeRepo(repo, clone.diskPath, otherRepos, providers, (phase, message) => {
          send({
            phase,
            currentRepo: repo.repo,
            percent: basePercent + 65,
            message,
          } satisfies AnalysisProgress);
        });
        repoAnalyses.push(analysis);

        send({
          phase: 'analyzing-glossary',
          currentRepo: repo.repo,
          percent: basePercent + Math.round(80 / totalRepos),
          message: `Finished analyzing ${repo.repo}`,
        } satisfies AnalysisProgress);
      }

      // Phase: generating-document
      send({
        phase: 'generating-document',
        percent: 90,
        message: 'Assembling analysis results...',
      } satisfies AnalysisProgress);

      const result: GodModeAnalysisResult = {
        config,
        repos: repoAnalyses,
        generatedAt: new Date().toISOString(),
      };

      send({ type: 'result', result });

      send({
        phase: 'complete',
        percent: 100,
        message: 'Analysis complete',
      } satisfies AnalysisProgress);
    } catch (err) {
      send({
        phase: 'error',
        percent: 0,
        message: err instanceof Error ? err.message : 'Analysis failed',
      } satisfies AnalysisProgress);
    }

    reply.raw.end();
  });

  // DELETE /api/god-mode/clones — evict stale clones
  app.delete('/api/god-mode/clones', async (request) => {
    const { maxAgeDays } = (request.query as { maxAgeDays?: string }) ?? {};
    const days = parseInt(maxAgeDays || '7', 10);
    const evicted = await evictStaleClones(isNaN(days) ? 7 : days);
    return { evicted };
  });
}
