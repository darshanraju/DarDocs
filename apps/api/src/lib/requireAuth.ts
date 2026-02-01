import type { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from './auth.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  const session = await auth.api.getSession({ headers });
  if (!session) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  // Attach to request for downstream handlers
  (request as any).userId = session.user.id;
  (request as any).user = session.user;
}
