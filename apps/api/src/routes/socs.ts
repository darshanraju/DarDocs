import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { requireApiKey } from '../lib/requireApiKey.js';
import { requireAuth } from '../lib/requireAuth.js';
import { db } from '../lib/db.js';
import { socConfigs, documents } from '../lib/schema.js';
import { ensureClone } from '../services/repoCloneService.js';
import { analyzeRepo } from '../services/repoAnalyzer.js';
import { createDefaultProviders } from '../services/providers/index.js';
import {
  isGitHubAppConfigured,
  getInstallationTokenForWorkspace,
} from '../services/githubAppService.js';
import type {
  GodModeConfig,
  GodModeAnalysisResult,
  RepoAnalysis,
  AIConfig,
  CreateSocConfigRequest,
  UpdateSocConfigRequest,
} from '@dardocs/core';
import { generateGodModeDocument } from '@dardocs/core';

// ─── Helper: check scope ─────────────────────────────────────

function hasScope(request: any, scope: string): boolean {
  const scopes = (request as any).apiKeyScopes as string[] | undefined;
  return scopes?.includes(scope) ?? false;
}

// ─── Helper: run the GodMode analysis pipeline ───────────────

async function runGodModeAnalysis(
  config: GodModeConfig,
  aiConfig: AIConfig | null | undefined,
  workspaceId: string
): Promise<GodModeAnalysisResult> {
  // Resolve GitHub token from workspace installation
  let resolvedToken: string | undefined;
  if (isGitHubAppConfigured()) {
    resolvedToken =
      (await getInstallationTokenForWorkspace(workspaceId)) ?? undefined;
  }

  const providers = createDefaultProviders(aiConfig);
  const repoAnalyses: RepoAnalysis[] = [];

  for (const repo of config.repos) {
    const clone = await ensureClone(repo.owner, repo.repo, resolvedToken);
    const otherRepos = config.repos
      .filter((r) => r.id !== repo.id)
      .map((r) => r.repo);

    const analysis = await analyzeRepo(
      repo,
      clone.diskPath,
      otherRepos,
      providers
    );
    repoAnalyses.push(analysis);
  }

  return {
    config,
    repos: repoAnalyses,
    generatedAt: new Date().toISOString(),
  };
}

export async function socRoutes(app: FastifyInstance) {
  // ─── Regenerate (API key auth) ──────────────────────────────
  // This is the endpoint the GitHub Action calls.

  app.post('/api/socs/:id/regenerate', {
    preHandler: requireApiKey,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const workspaceId = (request as any).workspaceId as string;

      if (!hasScope(request, 'soc:regenerate')) {
        return reply
          .status(403)
          .send({ error: 'API key missing required scope: soc:regenerate' });
      }

      // Load the SOC config
      const [soc] = await db
        .select()
        .from(socConfigs)
        .where(
          and(eq(socConfigs.id, id), eq(socConfigs.workspaceId, workspaceId))
        )
        .limit(1);

      if (!soc) {
        return reply.status(404).send({ error: 'SOC config not found' });
      }

      if (!soc.documentId) {
        return reply
          .status(400)
          .send({ error: 'SOC config has no linked document' });
      }

      // Verify the document exists
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, soc.documentId))
        .limit(1);

      if (!doc) {
        return reply
          .status(400)
          .send({ error: 'Linked document no longer exists' });
      }

      // Run the analysis
      const config = soc.config as GodModeConfig;
      const aiConfig = (soc.aiConfig as AIConfig) ?? null;

      let result: GodModeAnalysisResult;
      try {
        result = await runGodModeAnalysis(config, aiConfig, workspaceId);
      } catch (err) {
        return reply.status(500).send({
          error: 'Analysis failed',
          message: err instanceof Error ? err.message : String(err),
        });
      }

      // Generate new document content
      const newContent = generateGodModeDocument(result, [], false);
      const now = new Date();

      // Update the document
      await db
        .update(documents)
        .set({
          content: newContent,
          title: `System Overview — ${result.repos.map((r) => r.repoName).join(' / ')}`,
          updatedAt: now,
        })
        .where(eq(documents.id, soc.documentId));

      // Update SOC config lastGeneratedAt
      await db
        .update(socConfigs)
        .set({ lastGeneratedAt: now, updatedAt: now })
        .where(eq(socConfigs.id, soc.id));

      return reply.status(200).send({
        socConfigId: soc.id,
        documentId: soc.documentId,
        generatedAt: now.toISOString(),
        repos: result.repos.map((r) => r.repoName),
      });
    },
  });

  // ─── Session-authenticated CRUD routes ──────────────────────

  app.register(async (authedApp) => {
    authedApp.addHook('preHandler', requireAuth);

    // List SOC configs for a workspace
    authedApp.get('/api/socs', async (request) => {
      const { workspaceId } = request.query as { workspaceId: string };
      if (!workspaceId) {
        return { error: 'workspaceId query parameter required' };
      }

      const rows = await db
        .select()
        .from(socConfigs)
        .where(eq(socConfigs.workspaceId, workspaceId));

      return rows;
    });

    // Get a single SOC config
    authedApp.get('/api/socs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const [row] = await db
        .select()
        .from(socConfigs)
        .where(eq(socConfigs.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'SOC config not found' });
      }
      return row;
    });

    // Create a SOC config
    authedApp.post('/api/socs', async (request, reply) => {
      const body = request.body as CreateSocConfigRequest & {
        workspaceId: string;
      };
      const userId = (request as any).userId as string;

      if (!body.workspaceId || !body.name || !body.config?.repos?.length) {
        return reply
          .status(400)
          .send({ error: 'workspaceId, name, and config.repos are required' });
      }

      const id = randomUUID();
      const now = new Date();

      await db.insert(socConfigs).values({
        id,
        workspaceId: body.workspaceId,
        documentId: body.documentId ?? null,
        name: body.name,
        type: body.type ?? 'godmode',
        config: body.config,
        aiConfig: body.aiConfig ?? null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [row] = await db
        .select()
        .from(socConfigs)
        .where(eq(socConfigs.id, id))
        .limit(1);

      return reply.status(201).send(row);
    });

    // Update a SOC config
    authedApp.patch('/api/socs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateSocConfigRequest;

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.name !== undefined) updates.name = body.name;
      if (body.config !== undefined) updates.config = body.config;
      if (body.aiConfig !== undefined) updates.aiConfig = body.aiConfig;

      await db.update(socConfigs).set(updates).where(eq(socConfigs.id, id));

      const [row] = await db
        .select()
        .from(socConfigs)
        .where(eq(socConfigs.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'SOC config not found' });
      }
      return row;
    });

    // Delete a SOC config
    authedApp.delete('/api/socs/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await db
        .delete(socConfigs)
        .where(eq(socConfigs.id, id))
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ error: 'SOC config not found' });
      }
      return { deleted: true };
    });
  });
}
