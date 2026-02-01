import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { documents, workspaceMembers } from '../lib/schema.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';

async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
  return membership ?? null;
}

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/workspaces/:workspaceId/documents — get the full doc tree
  app.get('/api/workspaces/:workspaceId/documents', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { workspaceId } = request.params as { workspaceId: string };

    const membership = await assertWorkspaceAccess(userId, workspaceId);
    if (!membership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const docs = await db
      .select({
        id: documents.id,
        parentId: documents.parentId,
        position: documents.position,
        title: documents.title,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.workspaceId, workspaceId),
          eq(documents.isArchived, false)
        )
      )
      .orderBy(documents.position);

    return docs.map((d) => ({
      ...d,
      parentId: d.parentId ?? '__root__',
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  });

  // POST /api/workspaces/:workspaceId/documents — create a document
  app.post(
    '/api/workspaces/:workspaceId/documents',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId } = request.params as { workspaceId: string };
      const { title, parentId } = request.body as {
        title?: string;
        parentId?: string | null;
      };

      const membership = await assertWorkspaceAccess(userId, workspaceId);
      if (!membership) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Calculate next position among siblings
      const parentCondition =
        parentId && parentId !== '__root__'
          ? eq(documents.parentId, parentId)
          : isNull(documents.parentId);

      const [maxPos] = await db
        .select({ max: sql<number>`COALESCE(MAX(${documents.position}), -1)` })
        .from(documents)
        .where(
          and(eq(documents.workspaceId, workspaceId), parentCondition)
        );

      const id = crypto.randomUUID();
      const now = new Date();
      const defaultContent = {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      };

      await db.insert(documents).values({
        id,
        workspaceId,
        parentId: parentId && parentId !== '__root__' ? parentId : null,
        position: (maxPos?.max ?? -1) + 1,
        title: title?.trim() || 'Untitled',
        content: defaultContent,
        boards: {},
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id));

      return reply.status(201).send({
        id: doc.id,
        workspaceId: doc.workspaceId,
        parentId: doc.parentId ?? '__root__',
        position: doc.position,
        title: doc.title,
        content: doc.content,
        boards: doc.boards,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      });
    }
  );

  // GET /api/documents/:id — get a single document with full content
  app.get('/api/documents/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const membership = await assertWorkspaceAccess(userId, doc.workspaceId);
    if (!membership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return {
      id: doc.id,
      workspaceId: doc.workspaceId,
      parentId: doc.parentId ?? '__root__',
      position: doc.position,
      title: doc.title,
      content: doc.content,
      boards: doc.boards,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  });

  // PATCH /api/documents/:id — update title, content, boards, parent, position
  app.patch('/api/documents/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };
    const body = request.body as {
      title?: string;
      content?: unknown;
      boards?: unknown;
      parentId?: string | null;
      position?: number;
    };

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const membership = await assertWorkspaceAccess(userId, doc.workspaceId);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.boards !== undefined) updates.boards = body.boards;
    if (body.parentId !== undefined) {
      updates.parentId =
        body.parentId && body.parentId !== '__root__' ? body.parentId : null;
    }
    if (body.position !== undefined) updates.position = body.position;

    await db.update(documents).set(updates).where(eq(documents.id, id));

    const [updated] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      parentId: updated.parentId ?? '__root__',
      position: updated.position,
      title: updated.title,
      content: updated.content,
      boards: updated.boards,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  // DELETE /api/documents/:id — soft delete (archive)
  app.delete('/api/documents/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const membership = await assertWorkspaceAccess(userId, doc.workspaceId);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Archive document and all descendants
    await archiveDescendants(id, doc.workspaceId);

    return reply.status(204).send();
  });
}

async function archiveDescendants(parentId: string, workspaceId: string) {
  await db
    .update(documents)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(documents.id, parentId));

  const children = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.parentId, parentId),
        eq(documents.workspaceId, workspaceId)
      )
    );

  for (const child of children) {
    await archiveDescendants(child.id, workspaceId);
  }
}
