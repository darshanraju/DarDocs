import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { documents, teams } from '../lib/schema.js';
import { eq, and, isNull, sql, or, inArray } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';
import {
  getWorkspaceMembership,
  isWorkspaceAdmin,
  canAccessDocument,
  canEditDocument,
  getUserTeamIds,
  getTeamMembership,
} from '../lib/teamAccess.js';

function serializeDoc(doc: typeof documents.$inferSelect) {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    teamId: doc.teamId ?? null,
    parentId: doc.parentId ?? '__root__',
    position: doc.position,
    title: doc.title,
    content: doc.content,
    boards: doc.boards,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/workspaces/:workspaceId/documents — get the doc tree filtered by team access
  app.get('/api/workspaces/:workspaceId/documents', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { workspaceId } = request.params as { workspaceId: string };

    const membership = await getWorkspaceMembership(userId, workspaceId);
    if (!membership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const wsAdmin = isWorkspaceAdmin(membership.role);

    // Fetch all non-archived docs
    const allDocs = await db
      .select({
        id: documents.id,
        teamId: documents.teamId,
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

    // Workspace admins see everything
    if (wsAdmin) {
      return allDocs.map((d) => ({
        ...d,
        teamId: d.teamId ?? null,
        parentId: d.parentId ?? '__root__',
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }

    // Get teams the user has access to
    const userTeamIds = new Set(await getUserTeamIds(userId, workspaceId));

    // Get all open teams in the workspace
    const openTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(
        and(eq(teams.workspaceId, workspaceId), eq(teams.visibility, 'open'))
      );
    const openTeamIds = new Set(openTeams.map((t) => t.id));

    // Filter: workspace-level (no team), open teams, or user's teams
    const filtered = allDocs.filter((d) => {
      if (!d.teamId) return true; // workspace-level
      if (openTeamIds.has(d.teamId)) return true; // open team
      if (userTeamIds.has(d.teamId)) return true; // member
      return false;
    });

    return filtered.map((d) => ({
      ...d,
      teamId: d.teamId ?? null,
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
      const body = request.body as {
        title?: string;
        parentId?: string | null;
        teamId?: string | null;
      };

      const membership = await getWorkspaceMembership(userId, workspaceId);
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Access denied' });
      }

      let teamId: string | null = body.teamId ?? null;

      // If creating under a parent, inherit the parent's teamId
      if (body.parentId && body.parentId !== '__root__') {
        const [parent] = await db
          .select({ teamId: documents.teamId })
          .from(documents)
          .where(eq(documents.id, body.parentId));
        if (parent && parent.teamId) {
          teamId = parent.teamId;
        }
      }

      // Validate team access if teamId is specified
      if (teamId) {
        const [team] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, teamId));

        if (!team || team.workspaceId !== workspaceId) {
          return reply.status(400).send({ error: 'Invalid team' });
        }

        if (!isWorkspaceAdmin(membership.role)) {
          if (team.visibility === 'open') {
            // Anyone in workspace can create in open teams
          } else {
            const teamMembership = await getTeamMembership(userId, teamId);
            if (!teamMembership) {
              return reply
                .status(403)
                .send({ error: 'You must be a team member to create documents in this team' });
            }
          }
        }
      }

      // Calculate next position among siblings
      const parentId = body.parentId && body.parentId !== '__root__' ? body.parentId : null;
      const parentCondition = parentId
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
        teamId,
        parentId,
        position: (maxPos?.max ?? -1) + 1,
        title: body.title?.trim() || 'Untitled',
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

      return reply.status(201).send(serializeDoc(doc));
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

    const hasAccess = await canAccessDocument(userId, doc);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return serializeDoc(doc);
  });

  // PATCH /api/documents/:id — update title, content, boards, parent, position, teamId
  app.patch('/api/documents/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };
    const body = request.body as {
      title?: string;
      content?: unknown;
      boards?: unknown;
      parentId?: string | null;
      position?: number;
      teamId?: string | null;
    };

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const hasEditAccess = await canEditDocument(userId, doc);
    if (!hasEditAccess) {
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

    // Handle teamId changes (moving doc between teams)
    if (body.teamId !== undefined) {
      const wsMembership = await getWorkspaceMembership(userId, doc.workspaceId);
      const wsAdmin = wsMembership && isWorkspaceAdmin(wsMembership.role);

      if (body.teamId === null) {
        // Moving to workspace-level: need access to source team
        if (!wsAdmin && doc.teamId) {
          const srcMembership = await getTeamMembership(userId, doc.teamId);
          if (!srcMembership) {
            return reply
              .status(403)
              .send({ error: 'Must be a member of the source team' });
          }
        }
        updates.teamId = null;
      } else {
        // Moving to a team: validate target team access
        const [targetTeam] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, body.teamId));

        if (!targetTeam || targetTeam.workspaceId !== doc.workspaceId) {
          return reply.status(400).send({ error: 'Invalid team' });
        }

        if (!wsAdmin) {
          // Need membership in target team (unless open)
          if (targetTeam.visibility !== 'open') {
            const targetMembership = await getTeamMembership(userId, body.teamId);
            if (!targetMembership) {
              return reply
                .status(403)
                .send({ error: 'Must be a member of the target team' });
            }
          }
          // Need membership in source team (if moving from another team)
          if (doc.teamId) {
            const srcMembership = await getTeamMembership(userId, doc.teamId);
            if (!srcMembership) {
              return reply
                .status(403)
                .send({ error: 'Must be a member of the source team' });
            }
          }
        }

        updates.teamId = body.teamId;
      }
    }

    await db.update(documents).set(updates).where(eq(documents.id, id));

    const [updated] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    return serializeDoc(updated);
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

    const hasEditAccess = await canEditDocument(userId, doc);
    if (!hasEditAccess) {
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
