import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import {
  teams,
  teamMembers,
  workspaceMembers,
  users,
  documents,
} from '../lib/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';
import {
  getWorkspaceMembership,
  isWorkspaceAdmin,
  getTeamMembership,
} from '../lib/teamAccess.js';

export async function teamRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ─── Team CRUD ─────────────────────────────────────────────

  // GET /api/workspaces/:workspaceId/teams — list teams visible to user
  app.get(
    '/api/workspaces/:workspaceId/teams',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId } = request.params as { workspaceId: string };

      const wsMembership = await getWorkspaceMembership(userId, workspaceId);
      if (!wsMembership) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const wsAdmin = isWorkspaceAdmin(wsMembership.role);

      // Get all teams in the workspace
      const allTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.workspaceId, workspaceId))
        .orderBy(teams.name);

      // Get teams the user is a member of
      const userTeamMemberships = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      const userTeamMap = new Map(
        userTeamMemberships.map((m) => [m.teamId, m])
      );

      // Get member counts for all teams
      const memberCounts = await db
        .select({
          teamId: teamMembers.teamId,
          count: sql<number>`count(*)::int`,
        })
        .from(teamMembers)
        .groupBy(teamMembers.teamId);

      const countMap = new Map(
        memberCounts.map((r) => [r.teamId, r.count])
      );

      const result = [];
      for (const team of allTeams) {
        const membership = userTeamMap.get(team.id);
        const isMember = !!membership;

        // Private teams: only visible to members and workspace admins
        if (team.visibility === 'private' && !isMember && !wsAdmin) {
          continue;
        }

        result.push({
          id: team.id,
          name: team.name,
          description: team.description,
          visibility: team.visibility,
          icon: team.icon,
          memberCount: countMap.get(team.id) ?? 0,
          isMember,
          role: membership?.role ?? null,
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        });
      }

      return result;
    }
  );

  // POST /api/workspaces/:workspaceId/teams — create a team
  app.post(
    '/api/workspaces/:workspaceId/teams',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId } = request.params as { workspaceId: string };
      const body = request.body as {
        name: string;
        description?: string;
        visibility?: 'open' | 'closed' | 'private';
        icon?: string;
      };

      if (!body.name?.trim()) {
        return reply.status(400).send({ error: 'Team name is required' });
      }

      const wsMembership = await getWorkspaceMembership(userId, workspaceId);
      if (!wsMembership) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Viewers cannot create teams
      if (wsMembership.role === 'viewer') {
        return reply
          .status(403)
          .send({ error: 'Viewers cannot create teams' });
      }

      const teamId = crypto.randomUUID();
      const now = new Date();

      await db.insert(teams).values({
        id: teamId,
        workspaceId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        visibility: body.visibility || 'open',
        icon: body.icon || null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Add creator as team owner
      await db.insert(teamMembers).values({
        id: crypto.randomUUID(),
        teamId,
        userId,
        role: 'owner',
        createdAt: now,
      });

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      return reply.status(201).send({
        id: team.id,
        name: team.name,
        description: team.description,
        visibility: team.visibility,
        icon: team.icon,
        memberCount: 1,
        isMember: true,
        role: 'owner' as const,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      });
    }
  );

  // PATCH /api/teams/:teamId — update team metadata
  app.patch('/api/teams/:teamId', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { teamId } = request.params as { teamId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      visibility?: 'open' | 'closed' | 'private';
      icon?: string;
    };

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    // Must be team owner or workspace admin/owner
    const teamMembership = await getTeamMembership(userId, teamId);
    const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);

    if (!wsMembership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const isTeamOwner = teamMembership?.role === 'owner';
    const wsAdmin = isWorkspaceAdmin(wsMembership.role);

    if (!isTeamOwner && !wsAdmin) {
      return reply
        .status(403)
        .send({ error: 'Only team owners or workspace admins can update teams' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined)
      updates.description = body.description?.trim() || null;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.icon !== undefined) updates.icon = body.icon || null;

    await db.update(teams).set(updates).where(eq(teams.id, teamId));

    const [updated] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    // Get member count
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      visibility: updated.visibility,
      icon: updated.icon,
      memberCount: countRow?.count ?? 0,
      isMember: !!teamMembership,
      role: teamMembership?.role ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  // DELETE /api/teams/:teamId — delete a team (docs become workspace-level)
  app.delete('/api/teams/:teamId', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { teamId } = request.params as { teamId: string };

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const teamMembership = await getTeamMembership(userId, teamId);
    const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);

    if (!wsMembership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const isTeamOwner = teamMembership?.role === 'owner';
    const wsAdmin = isWorkspaceAdmin(wsMembership.role);

    if (!isTeamOwner && !wsAdmin) {
      return reply
        .status(403)
        .send({ error: 'Only team owners or workspace admins can delete teams' });
    }

    // Move all documents to workspace-level (teamId = null)
    await db
      .update(documents)
      .set({ teamId: null, updatedAt: new Date() })
      .where(eq(documents.teamId, teamId));

    // Delete team (cascades to team_members)
    await db.delete(teams).where(eq(teams.id, teamId));

    return reply.status(204).send();
  });

  // ─── Team Membership ───────────────────────────────────────

  // GET /api/teams/:teamId/members — list team members
  app.get('/api/teams/:teamId/members', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { teamId } = request.params as { teamId: string };

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);
    if (!wsMembership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Private teams: only members and ws admins can list members
    if (team.visibility === 'private') {
      const teamMembership = await getTeamMembership(userId, teamId);
      if (!teamMembership && !isWorkspaceAdmin(wsMembership.role)) {
        return reply.status(403).send({ error: 'Access denied' });
      }
    }

    const members = await db
      .select({
        id: teamMembers.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: teamMembers.role,
        joinedAt: teamMembers.createdAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.createdAt);

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      email: m.email,
      image: m.image,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }));
  });

  // POST /api/teams/:teamId/join — self-join an open team
  app.post('/api/teams/:teamId/join', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { teamId } = request.params as { teamId: string };

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    if (team.visibility !== 'open') {
      return reply
        .status(403)
        .send({ error: 'Can only self-join open teams' });
    }

    const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);
    if (!wsMembership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Check if already a member
    const existing = await getTeamMembership(userId, teamId);
    if (existing) {
      return reply
        .status(409)
        .send({ error: 'Already a member of this team' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(teamMembers).values({
      id,
      teamId,
      userId,
      role: 'member',
      createdAt: now,
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    return reply.status(201).send({
      id,
      userId,
      name: user.name,
      email: user.email,
      image: user.image,
      role: 'member',
      joinedAt: now.toISOString(),
    });
  });

  // POST /api/teams/:teamId/members — add a member (by team owner or ws admin)
  app.post('/api/teams/:teamId/members', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { teamId } = request.params as { teamId: string };
    const body = request.body as {
      userId: string;
      role?: 'owner' | 'member';
    };

    if (!body.userId?.trim()) {
      return reply.status(400).send({ error: 'userId is required' });
    }

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);
    if (!wsMembership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Must be team owner or ws admin
    const callerTeamMembership = await getTeamMembership(userId, teamId);
    const isTeamOwner = callerTeamMembership?.role === 'owner';
    const wsAdmin = isWorkspaceAdmin(wsMembership.role);

    if (!isTeamOwner && !wsAdmin) {
      return reply
        .status(403)
        .send({ error: 'Only team owners or workspace admins can add members' });
    }

    // Target must be a workspace member
    const targetWs = await getWorkspaceMembership(body.userId, team.workspaceId);
    if (!targetWs) {
      return reply
        .status(400)
        .send({ error: 'User is not a member of this workspace' });
    }

    // Check if already a team member
    const existing = await getTeamMembership(body.userId, teamId);
    if (existing) {
      return reply
        .status(409)
        .send({ error: 'User is already a member of this team' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(teamMembers).values({
      id,
      teamId,
      userId: body.userId,
      role: body.role || 'member',
      createdAt: now,
    });

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, body.userId));

    return reply.status(201).send({
      id,
      userId: body.userId,
      name: targetUser.name,
      email: targetUser.email,
      image: targetUser.image,
      role: body.role || 'member',
      joinedAt: now.toISOString(),
    });
  });

  // PATCH /api/teams/:teamId/members/:memberId — update member role
  app.patch(
    '/api/teams/:teamId/members/:memberId',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { teamId, memberId } = request.params as {
        teamId: string;
        memberId: string;
      };
      const { role } = request.body as { role: 'owner' | 'member' };

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);
      if (!wsMembership) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const callerTeamMembership = await getTeamMembership(userId, teamId);
      const isTeamOwner = callerTeamMembership?.role === 'owner';
      const wsAdmin = isWorkspaceAdmin(wsMembership.role);

      if (!isTeamOwner && !wsAdmin) {
        return reply
          .status(403)
          .send({ error: 'Only team owners or workspace admins can change roles' });
      }

      const [target] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId));

      if (!target || target.teamId !== teamId) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      await db
        .update(teamMembers)
        .set({ role })
        .where(eq(teamMembers.id, memberId));

      return { ok: true };
    }
  );

  // DELETE /api/teams/:teamId/members/:memberId — remove member / leave
  app.delete(
    '/api/teams/:teamId/members/:memberId',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { teamId, memberId } = request.params as {
        teamId: string;
        memberId: string;
      };

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const [target] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId));

      if (!target || target.teamId !== teamId) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      const isSelf = target.userId === userId;

      if (!isSelf) {
        const wsMembership = await getWorkspaceMembership(userId, team.workspaceId);
        if (!wsMembership) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const callerTeamMembership = await getTeamMembership(userId, teamId);
        const isTeamOwner = callerTeamMembership?.role === 'owner';
        const wsAdmin = isWorkspaceAdmin(wsMembership.role);

        if (!isTeamOwner && !wsAdmin) {
          return reply
            .status(403)
            .send({ error: 'Only team owners or workspace admins can remove members' });
        }
      }

      // Prevent removing the last owner
      if (target.role === 'owner') {
        const [ownerCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(teamMembers)
          .where(
            and(
              eq(teamMembers.teamId, teamId),
              eq(teamMembers.role, 'owner')
            )
          );

        if ((ownerCount?.count ?? 0) <= 1) {
          return reply
            .status(400)
            .send({ error: 'Cannot remove the last team owner. Transfer ownership first.' });
        }
      }

      await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

      return reply.status(204).send();
    }
  );
}
