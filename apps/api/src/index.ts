import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { env } from './lib/env.js';
import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { documentRoutes } from './routes/documents.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await app.register(cookie);

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// Register route modules
await app.register(authRoutes);
await app.register(workspaceRoutes);
await app.register(documentRoutes);

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`API server running on http://localhost:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
