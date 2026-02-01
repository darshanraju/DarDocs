import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/requireAuth.js';
import { execFile } from 'node:child_process';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TIMEOUT_MS = 15_000;
const MAX_OUTPUT = 50_000;

// ─── Types ──────────────────────────────────────────────────

interface ProgramNode {
  id: string;
  type: string;
  data: {
    pluginType: string;
    config: Record<string, any>;
  };
}

interface ProgramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface ProgramPayload {
  id: string;
  name: string;
  nodes: ProgramNode[];
  edges: ProgramEdge[];
}

type NodeOutputs = Record<string, { output?: any; error?: string }>;

// ─── Topological sort ───────────────────────────────────────

function topoSort(nodes: ProgramNode[], edges: ProgramEdge[]): ProgramNode[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const nodeMap = new Map<string, ProgramNode>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
    nodeMap.set(n.id, n);
  }

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adj.get(e.source)?.push(e.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: ProgramNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const next of adj.get(id) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return sorted;
}

// ─── Node Executors ─────────────────────────────────────────

function getInputForNode(
  nodeId: string,
  edges: ProgramEdge[],
  outputs: NodeOutputs
): any {
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  if (incomingEdges.length === 0) return undefined;
  if (incomingEdges.length === 1) {
    return outputs[incomingEdges[0].source]?.output;
  }
  // Multiple inputs: merge into array
  return incomingEdges.map((e) => outputs[e.source]?.output).filter(Boolean);
}

async function executeHttpRequest(config: Record<string, any>): Promise<any> {
  const { url, method = 'GET', headers: headersStr, body: bodyStr } = config;
  if (!url) throw new Error('URL is required');

  let headers: Record<string, string> = {};
  if (headersStr) {
    try { headers = JSON.parse(headersStr); } catch { /* use empty */ }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (['POST', 'PUT', 'PATCH'].includes(method) && bodyStr) {
    fetchOptions.body = bodyStr;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  fetchOptions.signal = controller.signal;

  try {
    const res = await fetch(url, fetchOptions);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      return await res.json();
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function executeTransform(config: Record<string, any>, input: any): Promise<any> {
  const { code } = config;
  if (!code) throw new Error('Transform code is required');

  const dir = await mkdtemp(join(tmpdir(), 'dardocs-transform-'));
  const filePath = join(dir, 'transform.mjs');

  const wrappedCode = `
    const input = JSON.parse(process.argv[1]);
    const result = await (async function(input) {
      ${code}
    })(input);
    process.stdout.write(JSON.stringify(result));
  `;

  await writeFile(filePath, wrappedCode, 'utf-8');

  return new Promise((resolve, reject) => {
    const inputStr = JSON.stringify(input ?? null);
    execFile(
      process.execPath,
      ['--experimental-vm-modules', filePath, inputStr],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        unlink(filePath).catch(() => {});
        if (error?.killed) {
          reject(new Error('Transform timed out'));
          return;
        }
        if (stderr && !stdout) {
          reject(new Error(stderr.slice(0, 500)));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout.slice(0, MAX_OUTPUT));
        }
      }
    );
  });
}

async function executeFilter(config: Record<string, any>, input: any): Promise<any> {
  const { code } = config;
  if (!code) throw new Error('Filter expression is required');
  if (!Array.isArray(input)) return input;

  const dir = await mkdtemp(join(tmpdir(), 'dardocs-filter-'));
  const filePath = join(dir, 'filter.mjs');

  const wrappedCode = `
    const input = JSON.parse(process.argv[1]);
    const filterFn = (item, index, input) => {
      ${code}
    };
    const result = input.filter(filterFn);
    process.stdout.write(JSON.stringify(result));
  `;

  await writeFile(filePath, wrappedCode, 'utf-8');

  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ['--experimental-vm-modules', filePath, JSON.stringify(input)],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        unlink(filePath).catch(() => {});
        if (error?.killed) {
          reject(new Error('Filter timed out'));
          return;
        }
        if (stderr && !stdout) {
          reject(new Error(stderr.slice(0, 500)));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout.slice(0, MAX_OUTPUT));
        }
      }
    );
  });
}

async function executeAiPrompt(config: Record<string, any>, input: any): Promise<any> {
  const { prompt } = config;
  if (!prompt) throw new Error('Prompt is required');

  // Replace {{input}} with the actual input data
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
  const resolvedPrompt = prompt.replace(/\{\{input\}\}/g, inputStr);

  // For now, return the resolved prompt as the output.
  // When an LLM API key is configured, this will call the actual model.
  return `[AI Response Placeholder]\n\nPrompt received:\n${resolvedPrompt}\n\nNote: Configure an LLM API key in the server .env to enable actual AI responses.`;
}

async function executeVisualize(_config: Record<string, any>, input: any): Promise<any> {
  // Visualize just passes through the data — rendering happens client-side
  return input;
}

async function executeNotify(config: Record<string, any>, input: any): Promise<any> {
  const { channel = 'console', webhookUrl, message } = config;
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
  const resolvedMessage = (message || '{{input}}').replace(/\{\{input\}\}/g, inputStr);

  if (channel === 'webhook' && webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: resolvedMessage }),
    });
    return { sent: true, status: res.status };
  }

  // Console: just return the message
  return { message: resolvedMessage };
}

const EXECUTORS: Record<string, (config: Record<string, any>, input: any) => Promise<any>> = {
  'http-request': executeHttpRequest,
  'transform': executeTransform,
  'filter': executeFilter,
  'ai-prompt': executeAiPrompt,
  'visualize': executeVisualize,
  'notify': executeNotify,
};

// ─── Route ──────────────────────────────────────────────────

export async function programRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/api/programs/execute', async (request, reply) => {
    const program = request.body as ProgramPayload;

    if (!program?.nodes || program.nodes.length === 0) {
      return reply.status(400).send({ error: 'Program has no nodes' });
    }

    const sorted = topoSort(program.nodes, program.edges);
    const nodeOutputs: NodeOutputs = {};

    for (const node of sorted) {
      const executorKey = node.data.pluginType;
      const executor = EXECUTORS[executorKey];

      if (!executor) {
        nodeOutputs[node.id] = { error: `Unknown node type: ${executorKey}` };
        continue;
      }

      const input = getInputForNode(node.id, program.edges, nodeOutputs);

      try {
        const output = await executor(node.data.config, input);
        nodeOutputs[node.id] = { output };
      } catch (err: any) {
        nodeOutputs[node.id] = { error: err.message || 'Execution failed' };
        // Don't stop the pipeline — continue with remaining nodes
      }
    }

    const hasErrors = Object.values(nodeOutputs).some((r) => !!r.error);

    return {
      success: !hasErrors,
      nodeOutputs,
    };
  });
}
