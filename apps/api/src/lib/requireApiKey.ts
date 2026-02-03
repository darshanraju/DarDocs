import { createHash } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gt, or, isNull } from 'drizzle-orm';
import { db } from './db.js';
import { apiKeys } from './schema.js';

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Fastify preHandler that authenticates via `Authorization: Bearer dardocs_...`
 * API keys. On success, attaches `workspaceId` and `apiKeyScopes` to the request.
 */
export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer dardocs_')) {
    return reply
      .status(401)
      .send({ error: 'Missing or invalid API key. Expected Bearer dardocs_...' });
  }

  const rawKey = header.slice('Bearer '.length);
  const hash = hashKey(rawKey);

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, hash),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date()))
      )
    )
    .limit(1);

  if (!row) {
    return reply.status(401).send({ error: 'Invalid or expired API key' });
  }

  // Update lastUsedAt (fire and forget — don't block the request)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .execute()
    .catch(() => {});

  (request as any).workspaceId = row.workspaceId;
  (request as any).apiKeyId = row.id;
  (request as any).apiKeyScopes = row.scopes as string[];
}
