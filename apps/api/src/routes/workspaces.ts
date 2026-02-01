import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { workspaces, workspaceMembers } from '../lib/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';

export async function workspaceRoutes(app: FastifyInstance) {
  // All workspace routes require auth
  app.addHook('preHandler', requireAuth);

  // GET /api/workspaces — list workspaces for current user
  app.get('/api/workspaces', async (request) => {
    const userId = (request as any).userId as string;

    const memberships = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  });

  // POST /api/workspaces — create a workspace
  app.post('/api/workspaces', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { name } = request.body as { name: string };

    if (!name?.trim()) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(workspaces).values({
      id,
      name: name.trim(),
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as member
    await db.insert(workspaceMembers).values({
      id: crypto.randomUUID(),
      workspaceId: id,
      userId,
      role: 'owner',
      createdAt: now,
    });

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id));

    return reply.status(201).send({ ...workspace, role: 'owner' });
  });

  // GET /api/workspaces/:id — get a single workspace
  app.get('/api/workspaces/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };

    const [membership] = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId)
        )
      );

    if (!membership) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    return { ...membership.workspace, role: membership.role };
  });
}
