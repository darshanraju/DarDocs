import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { workspaces, workspaceMembers, users } from '../lib/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';

export async function memberRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/workspaces/:workspaceId/members — list members
  app.get(
    '/api/workspaces/:workspaceId/members',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId } = request.params as { workspaceId: string };

      // Must be a member to list members
      const [self] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );

      if (!self) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const members = await db
        .select({
          id: workspaceMembers.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .orderBy(workspaceMembers.createdAt);

      return members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email,
        image: m.image,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      }));
    }
  );

  // POST /api/workspaces/:workspaceId/members — invite a user by email
  app.post(
    '/api/workspaces/:workspaceId/members',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId } = request.params as { workspaceId: string };
      const { email, role } = request.body as {
        email: string;
        role?: 'admin' | 'editor' | 'viewer';
      };

      if (!email?.trim()) {
        return reply.status(400).send({ error: 'Email is required' });
      }

      // Must be owner or admin to invite
      const [self] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );

      if (!self || (self.role !== 'owner' && self.role !== 'admin')) {
        return reply
          .status(403)
          .send({ error: 'Only owners and admins can invite members' });
      }

      // Find user by email
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));

      if (!targetUser) {
        return reply
          .status(404)
          .send({ error: 'No user found with that email' });
      }

      // Check if already a member
      const [existing] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, targetUser.id)
          )
        );

      if (existing) {
        return reply
          .status(409)
          .send({ error: 'User is already a member of this workspace' });
      }

      const id = crypto.randomUUID();
      const assignedRole = role || 'editor';
      const now = new Date();

      await db.insert(workspaceMembers).values({
        id,
        workspaceId,
        userId: targetUser.id,
        role: assignedRole,
        createdAt: now,
      });

      return reply.status(201).send({
        id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        image: targetUser.image,
        role: assignedRole,
        joinedAt: now.toISOString(),
      });
    }
  );

  // PATCH /api/workspaces/:workspaceId/members/:memberId — update role
  app.patch(
    '/api/workspaces/:workspaceId/members/:memberId',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId, memberId } = request.params as {
        workspaceId: string;
        memberId: string;
      };
      const { role } = request.body as {
        role: 'admin' | 'editor' | 'viewer';
      };

      // Must be owner or admin
      const [self] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );

      if (!self || (self.role !== 'owner' && self.role !== 'admin')) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Can't change owner role
      const [target] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId));

      if (!target || target.workspaceId !== workspaceId) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      if (target.role === 'owner') {
        return reply.status(400).send({ error: 'Cannot change owner role' });
      }

      await db
        .update(workspaceMembers)
        .set({ role })
        .where(eq(workspaceMembers.id, memberId));

      return { ok: true };
    }
  );

  // DELETE /api/workspaces/:workspaceId/members/:memberId — remove member
  app.delete(
    '/api/workspaces/:workspaceId/members/:memberId',
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { workspaceId, memberId } = request.params as {
        workspaceId: string;
        memberId: string;
      };

      const [self] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );

      const [target] = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId));

      if (!target || target.workspaceId !== workspaceId) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      // Can't remove the owner
      if (target.role === 'owner') {
        return reply
          .status(400)
          .send({ error: 'Cannot remove the workspace owner' });
      }

      // Only owner/admin can remove others; any user can remove themselves
      const isSelf = target.userId === userId;
      const isAdminOrOwner =
        self && (self.role === 'owner' || self.role === 'admin');

      if (!isSelf && !isAdminOrOwner) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await db
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.id, memberId));

      return reply.status(204).send();
    }
  );
}
