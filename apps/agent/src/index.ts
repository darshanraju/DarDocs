import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import type { AgentMessage, ExecuteRunbookPayload } from '@dardocs/core';
import { ConnectorRegistry } from './connectors/ConnectorRegistry.js';
import { HTTPConnector } from './connectors/HTTPConnector.js';
import { GrafanaConnector } from './connectors/GrafanaConnector.js';
import { DatadogConnector } from './connectors/DatadogConnector.js';
import { SentryConnector } from './connectors/SentryConnector.js';
import { ReasoningEngine } from './reasoning/ReasoningEngine.js';
import { RunbookExecutor } from './executor/RunbookExecutor.js';

const PORT = parseInt(process.env.AGENT_PORT || '3457');

const app = Fastify({ logger: true });

// Register plugins
await app.register(cors, { origin: true });
await app.register(websocket);

// Build connector registry
const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register(new HTTPConnector());
connectorRegistry.register(new GrafanaConnector());
connectorRegistry.register(new DatadogConnector());
connectorRegistry.register(new SentryConnector());

// Track active executions for cancellation
const activeExecutors = new Map<string, RunbookExecutor>();

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'dardocs-agent',
  connectors: connectorRegistry.list(),
}));

// WebSocket endpoint
app.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket) => {
    app.log.info('WebSocket client connected');

    socket.on('message', async (raw: Buffer) => {
      try {
        const message: AgentMessage = JSON.parse(raw.toString());

        if (message.type === 'execute_runbook') {
          const payload = message.payload as ExecuteRunbookPayload;
          const { runbookId } = message;

          // Create reasoning engine with provided config
          const reasoning = new ReasoningEngine({
            provider: payload.config.aiProvider,
            apiKey: payload.config.aiApiKey,
            model: payload.config.aiModel,
          });

          const executor = new RunbookExecutor(connectorRegistry, reasoning);
          activeExecutors.set(runbookId, executor);

          // Execute asynchronously, streaming results via WebSocket
          executor
            .execute(
              runbookId,
              payload.title,
              payload.steps,
              payload.config.providers,
              (msg) => {
                if (socket.readyState === 1) {
                  socket.send(JSON.stringify(msg));
                }
              }
            )
            .finally(() => {
              activeExecutors.delete(runbookId);
            });
        }

        if (message.type === 'cancel_execution') {
          const executor = activeExecutors.get(message.runbookId);
          if (executor) {
            executor.cancel();
            activeExecutors.delete(message.runbookId);
          }
        }
      } catch (error) {
        app.log.error(error, 'Error processing WebSocket message');
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({
            type: 'execution_error',
            runbookId: 'unknown',
            payload: { error: 'Invalid message format' },
          }));
        }
      }
    });

    socket.on('close', () => {
      app.log.info('WebSocket client disconnected');
    });
  });
});

// Start server
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Agent server running on port ${PORT}`);
});
