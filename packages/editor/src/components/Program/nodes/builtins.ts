import { registerNodeType } from '../registry';

// ─── HTTP Request ───────────────────────────────────────────

registerNodeType({
  type: 'http-request',
  label: 'HTTP Request',
  icon: '🌐',
  color: '#3b82f6',
  category: 'Data',
  inputs: [{ name: 'trigger', type: 'any', label: 'Trigger' }],
  outputs: [{ name: 'response', type: 'json', label: 'Response' }],
  configSchema: [
    { key: 'url', type: 'string', label: 'URL', placeholder: 'https://api.example.com/data' },
    { key: 'method', type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT', 'DELETE'], defaultValue: 'GET' },
    { key: 'headers', type: 'text', label: 'Headers (JSON)', placeholder: '{"Authorization": "Bearer ..."}' },
    { key: 'body', type: 'text', label: 'Body (JSON)', placeholder: '{}' },
  ],
  executeKey: 'http-request',
});

// ─── Transform (JavaScript) ────────────────────────────────

registerNodeType({
  type: 'transform',
  label: 'Transform',
  icon: '⚡',
  color: '#f59e0b',
  category: 'Transform',
  inputs: [{ name: 'data', type: 'json', label: 'Data' }],
  outputs: [{ name: 'result', type: 'json', label: 'Result' }],
  configSchema: [
    {
      key: 'code',
      type: 'text',
      label: 'JavaScript Code',
      placeholder: '// `input` contains data from the previous node\nreturn input.map(item => item.name);',
      defaultValue: '// `input` is the data from connected nodes\nreturn input;',
    },
  ],
  executeKey: 'transform',
});

// ─── Filter ─────────────────────────────────────────────────

registerNodeType({
  type: 'filter',
  label: 'Filter',
  icon: '🔍',
  color: '#8b5cf6',
  category: 'Transform',
  inputs: [{ name: 'data', type: 'json', label: 'Data' }],
  outputs: [{ name: 'result', type: 'json', label: 'Filtered' }],
  configSchema: [
    {
      key: 'code',
      type: 'text',
      label: 'Filter Expression',
      placeholder: '// Return true to keep, false to discard\nreturn item.active === true;',
      defaultValue: '// `item` is each element, `input` is the full array\nreturn true;',
    },
  ],
  executeKey: 'filter',
});

// ─── AI Prompt ──────────────────────────────────────────────

registerNodeType({
  type: 'ai-prompt',
  label: 'AI Prompt',
  icon: '🤖',
  color: '#ec4899',
  category: 'AI',
  inputs: [{ name: 'context', type: 'any', label: 'Context' }],
  outputs: [{ name: 'result', type: 'string', label: 'Response' }],
  configSchema: [
    {
      key: 'prompt',
      type: 'text',
      label: 'Prompt',
      placeholder: 'Summarize the following data:\n{{input}}',
    },
    {
      key: 'model',
      type: 'select',
      label: 'Model',
      options: ['gpt-4o-mini', 'gpt-4o', 'claude-sonnet'],
      defaultValue: 'gpt-4o-mini',
    },
  ],
  executeKey: 'ai-prompt',
});

// ─── Visualize ──────────────────────────────────────────────

registerNodeType({
  type: 'visualize',
  label: 'Visualize',
  icon: '📊',
  color: '#10b981',
  category: 'Output',
  inputs: [{ name: 'data', type: 'any', label: 'Data' }],
  outputs: [],
  configSchema: [
    {
      key: 'format',
      type: 'select',
      label: 'Display Format',
      options: ['card', 'table', 'json', 'text'],
      defaultValue: 'card',
    },
    { key: 'title', type: 'string', label: 'Title', placeholder: 'Result' },
  ],
  executeKey: 'visualize',
});

// ─── Notify ─────────────────────────────────────────────────

registerNodeType({
  type: 'notify',
  label: 'Notify',
  icon: '📧',
  color: '#ef4444',
  category: 'Output',
  inputs: [{ name: 'data', type: 'any', label: 'Data' }],
  outputs: [],
  configSchema: [
    { key: 'channel', type: 'select', label: 'Channel', options: ['console', 'webhook'], defaultValue: 'console' },
    { key: 'webhookUrl', type: 'string', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' },
    { key: 'message', type: 'text', label: 'Message template', placeholder: 'Pipeline result: {{input}}' },
  ],
  executeKey: 'notify',
});
