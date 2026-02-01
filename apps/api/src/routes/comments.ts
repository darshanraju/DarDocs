import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { comments, documents, workspaceMembers, users } from '../lib/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../lib/requireAuth.js';

async function assertDocumentAccess(userId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc) return null;

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, doc.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );

  return membership ? { doc, membership } : null;
}

function formatComment(c: typeof comments.$inferSelect, author: { id: string; name: string; image: string | null }, replies: Array<{ id: string; text: string; authorId: string; authorName: string; authorImage: string | null; createdAt: Date }>) {
  return {
    id: c.id,
    type: c.type,
    text: c.text,
    quotedText: c.quotedText,
    resolved: c.resolved,
    author: { id: author.id, name: author.name, avatarUrl: author.image },
    createdAt: c.createdAt.toISOString(),
    replies: replies.map((r) => ({
      id: r.id,
      text: r.text,
      author: { id: r.authorId, name: r.authorName, avatarUrl: r.authorImage },
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function commentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/documents/:documentId/comments — list all comments for a document
  app.get('/api/documents/:documentId/comments', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { documentId } = request.params as { documentId: string };

    const access = await assertDocumentAccess(userId, documentId);
    if (!access) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Get top-level comments (not replies)
    const topLevel = await db
      .select({
        comment: comments,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(
        and(
          eq(comments.documentId, documentId),
          isNull(comments.parentCommentId)
        )
      )
      .orderBy(comments.createdAt);

    // Get all replies for this document
    const allReplies = await db
      .select({
        reply: comments,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.documentId, documentId))
      .orderBy(comments.createdAt);

    const replyMap = new Map<string, Array<{ id: string; text: string; authorId: string; authorName: string; authorImage: string | null; createdAt: Date }>>();
    for (const r of allReplies) {
      if (r.reply.parentCommentId) {
        const arr = replyMap.get(r.reply.parentCommentId) || [];
        arr.push({
          id: r.reply.id,
          text: r.reply.text,
          authorId: r.reply.authorId,
          authorName: r.authorName,
          authorImage: r.authorImage,
          createdAt: r.reply.createdAt,
        });
        replyMap.set(r.reply.parentCommentId, arr);
      }
    }

    return topLevel.map((row) =>
      formatComment(
        row.comment,
        { id: row.comment.authorId, name: row.authorName, image: row.authorImage },
        replyMap.get(row.comment.id) || []
      )
    );
  });

  // POST /api/documents/:documentId/comments — create a comment
  app.post('/api/documents/:documentId/comments', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { documentId } = request.params as { documentId: string };
    const body = request.body as {
      id?: string;
      type?: 'inline' | 'document';
      text: string;
      quotedText?: string;
    };

    const access = await assertDocumentAccess(userId, documentId);
    if (!access || access.membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const id = body.id || crypto.randomUUID();
    const now = new Date();

    await db.insert(comments).values({
      id,
      documentId,
      authorId: userId,
      type: body.type || 'inline',
      text: body.text || '',
      quotedText: body.quotedText || null,
      resolved: false,
      parentCommentId: null,
      createdAt: now,
      updatedAt: now,
    });

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    return reply.status(201).send({
      id,
      type: body.type || 'inline',
      text: body.text || '',
      quotedText: body.quotedText || null,
      resolved: false,
      author: { id: user.id, name: user.name, avatarUrl: user.image },
      createdAt: now.toISOString(),
      replies: [],
    });
  });

  // POST /api/comments/:commentId/replies — add a reply
  app.post('/api/comments/:commentId/replies', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { commentId } = request.params as { commentId: string };
    const { text } = request.body as { text: string };

    const [parentComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!parentComment) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    const access = await assertDocumentAccess(userId, parentComment.documentId);
    if (!access || access.membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(comments).values({
      id,
      documentId: parentComment.documentId,
      authorId: userId,
      type: parentComment.type,
      text: text || '',
      quotedText: null,
      resolved: false,
      parentCommentId: commentId,
      createdAt: now,
      updatedAt: now,
    });

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    return reply.status(201).send({
      id,
      text: text || '',
      author: { id: user.id, name: user.name, avatarUrl: user.image },
      createdAt: now.toISOString(),
    });
  });

  // PATCH /api/comments/:id — update text or resolve
  app.patch('/api/comments/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };
    const body = request.body as { text?: string; resolved?: boolean };

    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));

    if (!comment) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    const access = await assertDocumentAccess(userId, comment.documentId);
    if (!access || access.membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.text !== undefined) updates.text = body.text;
    if (body.resolved !== undefined) updates.resolved = body.resolved;

    await db.update(comments).set(updates).where(eq(comments.id, id));

    return { ok: true };
  });

  // DELETE /api/comments/:id
  app.delete('/api/comments/:id', async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params as { id: string };

    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));

    if (!comment) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    const access = await assertDocumentAccess(userId, comment.documentId);
    if (!access || access.membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Delete replies first, then the comment
    await db.delete(comments).where(eq(comments.parentCommentId, id));
    await db.delete(comments).where(eq(comments.id, id));

    return reply.status(204).send();
  });
}
