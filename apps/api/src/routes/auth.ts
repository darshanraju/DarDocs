import type { FastifyInstance } from 'fastify';
import { auth } from '../lib/auth.js';

export async function authRoutes(app: FastifyInstance) {
  // Forward all /api/auth/* requests to Better Auth
  app.all('/api/auth/*', async (request, reply) => {
    const url = new URL(request.url, 'http://localhost');
    // Better Auth expects paths like /api/auth/sign-up
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? JSON.stringify(request.body)
        : undefined;

    const req = new Request(url, {
      method: request.method,
      headers,
      body,
    });

    const response = await auth.handler(req);

    // Forward response headers
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    reply.status(response.status);
    const text = await response.text();
    return reply.send(text);
  });

  // GET /api/me — return the current authenticated user
  app.get('/api/me', async (request, reply) => {
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

    return { user: session.user };
  });
}
