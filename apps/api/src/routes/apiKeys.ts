import type { FastifyInstance } from 'fastify';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';
import { db } from '../lib/db.js';
import { apiKeys, workspaceMembers } from '../lib/schema.js';
import type { CreateApiKeyRequest } from '@dardocs/core';

function generateApiKey(): string {
  // Format: dardocs_ + 40 random hex chars
  return `dardocs_${randomBytes(20).toString('hex')}`;
}

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Create an API key for a workspace
  app.post('/api/workspaces/:workspaceId/api-keys', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = (request as any).userId as string;
    const body = request.body as CreateApiKeyRequest;

    if (!body.name) {
      return reply.status(400).send({ error: 'name is required' });
    }

    // Verify user has admin/owner access to the workspace
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

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return reply
        .status(403)
        .send({ error: 'Only workspace owners and admins can create API keys' });
    }

    const rawKey = generateApiKey();
    const id = randomUUID();
    const now = new Date();

    await db.insert(apiKeys).values({
      id,
      workspaceId,
      name: body.name,
      keyHash: hashKey(rawKey),
      keyPrefix: rawKey.slice(0, 16), // "dardocs_" + first 8 hex chars
      scopes: body.scopes ?? ['soc:regenerate'],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: userId,
      createdAt: now,
    });

    // Return the full key only once — it's never stored in plain text
    return reply.status(201).send({
      key: rawKey,
      apiKey: {
        id,
        workspaceId,
        name: body.name,
        keyPrefix: rawKey.slice(0, 16),
        scopes: body.scopes ?? ['soc:regenerate'],
        lastUsedAt: null,
        expiresAt: body.expiresAt ?? null,
        createdBy: userId,
        createdAt: now.toISOString(),
      },
    });
  });

  // List API keys for a workspace (metadata only, no secrets)
  app.get('/api/workspaces/:workspaceId/api-keys', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const rows = await db
      .select({
        id: apiKeys.id,
        workspaceId: apiKeys.workspaceId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdBy: apiKeys.createdBy,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.workspaceId, workspaceId));

    return rows;
  });

  // Revoke (delete) an API key
  app.delete('/api/api-keys/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId as string;

    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!key) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    // Verify user has admin/owner access
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, key.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return reply
        .status(403)
        .send({ error: 'Only workspace owners and admins can revoke API keys' });
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return { deleted: true };
  });
}
