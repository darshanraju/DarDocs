/**
 * Block-level feature roadmap.
 *
 * Each key is the Tiptap node name of a block extension (e.g. "boardBlock").
 * The value is an array of planned features for that block type.
 *
 * To add a new idea, append an entry to the relevant block array (or create a
 * new key for a block that doesn't have entries yet).
 */

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  tags: string[];
}

export type BlockRoadmap = Record<string, RoadmapItem[]>;

export const blockRoadmap: BlockRoadmap = {
  boardBlock: [
    {
      id: 'board-realtime-collab',
      title: 'Real-time multiplayer editing',
      description: 'Multiple users edit the same whiteboard simultaneously via WebSocket sync.',
      priority: 'high',
      effort: 'large',
      tags: ['backend', 'websockets'],
    },
    {
      id: 'board-ai-shapes',
      title: 'AI shape recognition',
      description: 'Auto-convert rough sketches into clean shapes using an ML model.',
      priority: 'medium',
      effort: 'large',
      tags: ['ai', 'compute'],
    },
  ],

  mediaBlock: [
    {
      id: 'media-ai-caption',
      title: 'AI image captioning',
      description: 'Auto-generate alt text and captions using a vision model.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ai', 'compute'],
    },
    {
      id: 'media-cloud-upload',
      title: 'Cloud storage upload',
      description: 'Upload images to S3/R2 instead of inlining base64.',
      priority: 'high',
      effort: 'medium',
      tags: ['backend', 'infra'],
    },
  ],

  videoBlock: [
    {
      id: 'video-transcription',
      title: 'AI video transcription',
      description: 'Transcribe video audio and display synced captions.',
      priority: 'medium',
      effort: 'large',
      tags: ['ai', 'compute', 'backend'],
    },
  ],

  executableCodeBlock: [
    {
      id: 'code-ai-completion',
      title: 'AI code completion',
      description: 'Inline code suggestions powered by an LLM.',
      priority: 'high',
      effort: 'large',
      tags: ['ai', 'compute'],
    },
    {
      id: 'code-remote-exec',
      title: 'Remote code execution',
      description: 'Run code blocks in a sandboxed cloud container and stream results.',
      priority: 'high',
      effort: 'large',
      tags: ['backend', 'compute', 'infra'],
    },
  ],

  embedBlock: [
    {
      id: 'embed-live-preview',
      title: 'Live preview rendering',
      description: 'Render rich previews with Open Graph data fetched server-side.',
      priority: 'medium',
      effort: 'medium',
      tags: ['backend'],
    },
  ],

  mermaidBlock: [
    {
      id: 'mermaid-ai-generate',
      title: 'AI diagram generation',
      description: 'Describe a diagram in natural language and generate Mermaid syntax.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ai', 'compute'],
    },
  ],

  monitorBlock: [
    {
      id: 'monitor-ai-anomaly',
      title: 'AI anomaly detection',
      description: 'Highlight anomalies in metrics using ML-based analysis.',
      priority: 'medium',
      effort: 'large',
      tags: ['ai', 'compute', 'backend'],
    },
    {
      id: 'monitor-live-stream',
      title: 'Live data streaming',
      description: 'Stream real-time metrics via WebSocket instead of polling.',
      priority: 'high',
      effort: 'medium',
      tags: ['backend', 'websockets'],
    },
  ],

  runbookBlock: [
    {
      id: 'runbook-ai-agent',
      title: 'AI-driven step execution',
      description: 'Let an AI agent autonomously execute and verify runbook steps.',
      priority: 'high',
      effort: 'large',
      tags: ['ai', 'compute', 'backend'],
    },
  ],

  slackEmbed: [
    {
      id: 'slack-thread-sync',
      title: 'Slack thread sync',
      description: 'Keep embedded Slack messages updated in real-time via Slack API.',
      priority: 'low',
      effort: 'medium',
      tags: ['backend', 'integration'],
    },
  ],

  googleSheetEmbed: [
    {
      id: 'gsheet-inline-edit',
      title: 'Inline spreadsheet editing',
      description: 'Edit Google Sheet cells directly within the doc block.',
      priority: 'low',
      effort: 'large',
      tags: ['integration'],
    },
  ],

  autoUpdate: [
    {
      id: 'auto-update-staleness-detection',
      title: 'Diff-aware staleness detection',
      description: 'Analyze git diffs on merge to master and flag documents whose source files changed.',
      priority: 'high',
      effort: 'medium',
      tags: ['ci', 'github', 'backend'],
    },
    {
      id: 'auto-update-ai-diff-analysis',
      title: 'AI-powered document patching',
      description: 'Send diffs to an AI agent that generates targeted document updates for review.',
      priority: 'high',
      effort: 'large',
      tags: ['ai', 'compute', 'backend'],
    },
    {
      id: 'auto-update-github-action',
      title: 'GitHub Actions integration',
      description: 'Trigger staleness checks and AI analysis automatically via a GitHub Actions workflow.',
      priority: 'medium',
      effort: 'small',
      tags: ['ci', 'github'],
    },
    {
      id: 'auto-update-review-queue',
      title: 'Suggested update review queue',
      description: 'In-editor UI for reviewing, accepting, or rejecting AI-suggested document changes.',
      priority: 'medium',
      effort: 'medium',
      tags: ['frontend', 'ux'],
    },
  ],
};

/** Look up roadmap items for a given block node name. */
export function getRoadmapForBlock(blockName: string): RoadmapItem[] {
  return blockRoadmap[blockName] ?? [];
}
