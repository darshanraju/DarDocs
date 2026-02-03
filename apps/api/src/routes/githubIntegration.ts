import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';
import { db } from '../lib/db.js';
import { githubAppInstallations, workspaceMembers } from '../lib/schema.js';
import { env } from '../lib/env.js';
import {
  isGitHubAppConfigured,
  getInstallationInfo,
  listInstallationRepos,
  verifyWebhookSignature,
} from '../services/githubAppService.js';

// ─── Helpers ─────────────────────────────────────────────────

async function requireAdmin(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return !!membership && (membership.role === 'owner' || membership.role === 'admin');
}

// ─── Routes ──────────────────────────────────────────────────

export async function githubIntegrationRoutes(app: FastifyInstance) {
  // ── Status: check if GitHub App is configured & if workspace has an installation
  app.get('/api/integrations/github/status', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.query as { workspaceId?: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId is required' });
    }

    if (!isGitHubAppConfigured()) {
      return { configured: false, installed: false };
    }

    const [installation] = await db
      .select()
      .from(githubAppInstallations)
      .where(eq(githubAppInstallations.workspaceId, workspaceId))
      .limit(1);

    if (!installation) {
      return { configured: true, installed: false };
    }

    try {
      const info = await getInstallationInfo(installation.installationId);
      return {
        configured: true,
        installed: true,
        githubOrg: installation.githubOrg,
        installationId: installation.installationId,
        accountType: info.account.type,
        avatarUrl: info.account.avatar_url,
        repoSelection: info.repository_selection,
      };
    } catch {
      // Installation may have been removed from GitHub's side
      return {
        configured: true,
        installed: true,
        githubOrg: installation.githubOrg,
        installationId: installation.installationId,
        stale: true,
      };
    }
  });

  // ── Install: redirect to GitHub App installation page
  app.get('/api/integrations/github/install', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const { workspaceId } = request.query as { workspaceId?: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId is required' });
    }

    if (!isGitHubAppConfigured()) {
      return reply.status(400).send({ error: 'GitHub App not configured on this server' });
    }

    const isAdmin = await requireAdmin(userId, workspaceId);
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only workspace owners/admins can install GitHub App' });
    }

    // state param carries workspaceId so the callback knows which workspace to link
    const installUrl =
      `https://github.com/apps/${env.GITHUB_APP_CLIENT_ID}/installations/new` +
      `?state=${workspaceId}`;

    return reply.redirect(installUrl);
  });

  // ── Setup callback: GitHub redirects here after installation
  app.get('/api/integrations/github/setup/callback', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const { installation_id, setup_action, state } = request.query as {
      installation_id?: string;
      setup_action?: string;
      state?: string;
    };

    const workspaceId = state;

    if (!installation_id || !workspaceId) {
      return reply.redirect(`${env.CORS_ORIGIN}?github_error=missing_params`);
    }

    // Only allow admins/owners
    const isAdmin = await requireAdmin(userId, workspaceId);
    if (!isAdmin) {
      return reply.redirect(`${env.CORS_ORIGIN}?github_error=forbidden`);
    }

    const installId = parseInt(installation_id, 10);
    if (isNaN(installId)) {
      return reply.redirect(`${env.CORS_ORIGIN}?github_error=invalid_installation`);
    }

    try {
      // Fetch installation details from GitHub
      const info = await getInstallationInfo(installId);

      // Remove any previous installation for this workspace
      await db
        .delete(githubAppInstallations)
        .where(eq(githubAppInstallations.workspaceId, workspaceId));

      // Save the new installation
      await db.insert(githubAppInstallations).values({
        id: crypto.randomUUID(),
        workspaceId,
        installationId: installId,
        githubOrg: info.account.login,
        installedBy: userId,
      });

      return reply.redirect(`${env.CORS_ORIGIN}?github_installed=true`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[GitHub] Setup callback error:', msg);
      return reply.redirect(`${env.CORS_ORIGIN}?github_error=setup_failed`);
    }
  });

  // ── List repos accessible to the workspace's installation
  app.get('/api/integrations/github/repos', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = request.query as { workspaceId?: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId is required' });
    }

    const [installation] = await db
      .select()
      .from(githubAppInstallations)
      .where(eq(githubAppInstallations.workspaceId, workspaceId))
      .limit(1);

    if (!installation) {
      return reply.status(404).send({ error: 'No GitHub installation for this workspace' });
    }

    try {
      const repos = await listInstallationRepos(installation.installationId);
      return repos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        url: r.html_url,
        description: r.description,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to list repos';
      return reply.status(502).send({ error: msg });
    }
  });

  // ── Disconnect: remove the installation link from this workspace
  app.delete('/api/integrations/github', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const { workspaceId } = request.query as { workspaceId?: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId is required' });
    }

    const isAdmin = await requireAdmin(userId, workspaceId);
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only workspace owners/admins can disconnect GitHub' });
    }

    await db
      .delete(githubAppInstallations)
      .where(eq(githubAppInstallations.workspaceId, workspaceId));

    return { ok: true };
  });

  // ── Webhook: receive installation events from GitHub
  app.post('/api/integrations/github/webhook', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const event = request.headers['x-github-event'] as string | undefined;

    if (!signature || !event) {
      return reply.status(400).send({ error: 'Missing webhook headers' });
    }

    const rawBody = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const payload = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (event === 'installation' && payload.action === 'deleted') {
      const installId = payload.installation?.id;
      if (installId) {
        await db
          .delete(githubAppInstallations)
          .where(eq(githubAppInstallations.installationId, installId));
      }
    }

    return { ok: true };
  });
}
