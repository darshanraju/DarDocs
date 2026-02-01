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
  // ---------------------------------------------------------------------------
  // Existing blocks
  // ---------------------------------------------------------------------------

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
    {
      id: 'board-design-annotations',
      title: 'Design handoff annotations',
      description:
        'Allow designers to pin annotation markers on whiteboard regions with spacing, color, and interaction notes so developers can inspect them inline instead of switching to Figma.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ux', 'collaboration'],
    },
    {
      id: 'board-state-matrix',
      title: 'UI state matrix template',
      description:
        'Pre-built template that prompts designers to sketch all UI states (loading, empty, error, success, partial) in a grid, addressing the #1 design-handoff gap where only the happy path is mocked.',
      priority: 'medium',
      effort: 'small',
      tags: ['ux', 'templates'],
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
    {
      id: 'code-contract-test',
      title: 'API contract test runner',
      description:
        'Execute API contract tests (Pact / OpenAPI schema validation) directly inside a code block so teams can verify spec-vs-reality drift without leaving the doc. 75% of production APIs diverge from their specs.',
      priority: 'high',
      effort: 'medium',
      tags: ['backend', 'testing', 'api'],
    },
    {
      id: 'code-snapshot-diff',
      title: 'Code snapshot diff view',
      description:
        'Side-by-side diff view that compares the current code block contents against a saved snapshot, helping teams review spec changes and catch unannounced breaking changes.',
      priority: 'medium',
      effort: 'small',
      tags: ['ux', 'versioning'],
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
    {
      id: 'embed-figma-inspect',
      title: 'Figma embed with dev inspect',
      description:
        'Embed Figma frames with a lightweight inspect overlay showing spacing, colors, and CSS values so developers never need to open Figma Dev Mode separately.',
      priority: 'high',
      effort: 'medium',
      tags: ['integration', 'ux'],
    },
    {
      id: 'embed-ticket-sync',
      title: 'Jira / Linear ticket sync',
      description:
        'Embed a Jira or Linear ticket that stays in sync — showing status, assignee, and acceptance criteria live. Addresses the problem of docs referencing tickets that have moved on.',
      priority: 'medium',
      effort: 'medium',
      tags: ['integration', 'backend'],
    },
    {
      id: 'embed-github-pr',
      title: 'GitHub PR embed with status',
      description:
        'Embed a GitHub pull request showing CI status, review state, and diff stats. Useful for design docs and RFCs that reference implementation PRs.',
      priority: 'medium',
      effort: 'medium',
      tags: ['integration', 'backend'],
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
    {
      id: 'mermaid-dependency-template',
      title: 'Cross-team dependency graph template',
      description:
        'Pre-built Mermaid template for mapping inter-team feature dependencies with critical-path highlighting. Cross-team dependencies are the leading cause of missed deadlines in scaling orgs.',
      priority: 'high',
      effort: 'small',
      tags: ['templates', 'planning'],
    },
    {
      id: 'mermaid-architecture-diagram',
      title: 'Architecture decision diagram',
      description:
        'Generate Mermaid diagrams from ADR metadata showing how architecture decisions connect to system components, making the decision log visually navigable.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ai', 'architecture'],
    },
    {
      id: 'mermaid-api-flow',
      title: 'API sequence diagram from OpenAPI',
      description:
        'Auto-generate Mermaid sequence diagrams from an OpenAPI spec, visualizing request/response flows between frontend and backend services.',
      priority: 'medium',
      effort: 'medium',
      tags: ['api', 'automation'],
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
    {
      id: 'monitor-deploy-impact',
      title: 'Deployment impact dashboard',
      description:
        'Overlay deployment markers on metric charts so teams can correlate releases with performance changes. Helps trace regressions to specific deploys — a key gap in incident response.',
      priority: 'high',
      effort: 'medium',
      tags: ['backend', 'integration'],
    },
    {
      id: 'monitor-slo-tracker',
      title: 'SLO burn-rate tracker',
      description:
        'Track error budget consumption against defined SLOs with visual burn-rate indicators, giving PMs and engineers a shared view of reliability targets.',
      priority: 'medium',
      effort: 'medium',
      tags: ['backend', 'sre'],
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
    {
      id: 'runbook-postmortem-actions',
      title: 'Postmortem action item tracker',
      description:
        'Link runbook steps to postmortem action items with SLO-based deadlines (4 or 8 weeks). Google SRE data shows untracked postmortem actions are the #1 reason incidents repeat.',
      priority: 'high',
      effort: 'small',
      tags: ['sre', 'tracking'],
    },
    {
      id: 'runbook-rollback-generator',
      title: 'AI rollback playbook generator',
      description:
        'Analyze a deployment runbook and auto-generate the inverse rollback steps, including database migration reversals and feature flag toggles.',
      priority: 'medium',
      effort: 'large',
      tags: ['ai', 'sre', 'backend'],
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
    {
      id: 'slack-decision-capture',
      title: 'Decision capture from threads',
      description:
        'Extract and highlight key decisions from embedded Slack threads, tagging them as decision records. Addresses the problem of decisions made in chat being lost or forgotten.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ai', 'integration'],
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
    {
      id: 'gsheet-velocity-chart',
      title: 'Sprint velocity chart',
      description:
        'Pull sprint velocity data from a Google Sheet and render it as an interactive chart, giving PMs a live view of team capacity trends without leaving the planning doc.',
      priority: 'low',
      effort: 'medium',
      tags: ['integration', 'planning'],
    },
  ],

  // ---------------------------------------------------------------------------
  // New blocks — addressing developer/PM pain points
  // ---------------------------------------------------------------------------

  apiSpecBlock: [
    {
      id: 'apispec-openapi-viewer',
      title: 'Embedded OpenAPI spec viewer',
      description:
        'Render an interactive OpenAPI/Swagger spec inside the doc with try-it-out requests, parameter descriptions, and response schemas. 75% of production APIs drift from their specs — keeping the spec in the living doc fights this.',
      priority: 'high',
      effort: 'large',
      tags: ['api', 'ux'],
    },
    {
      id: 'apispec-drift-detector',
      title: 'Spec drift detection',
      description:
        'Compare the embedded OpenAPI spec against a live API endpoint and highlight fields, types, or status codes that have diverged. Surfaces the "documentation lies" problem before it costs developers days of debugging.',
      priority: 'high',
      effort: 'large',
      tags: ['api', 'backend', 'testing'],
    },
    {
      id: 'apispec-mock-server',
      title: 'Inline mock server',
      description:
        'Spin up a mock API server from the embedded spec so frontend teams can build and test against agreed contracts while the backend is still in progress. Enables true parallel development.',
      priority: 'high',
      effort: 'large',
      tags: ['api', 'backend', 'compute'],
    },
    {
      id: 'apispec-changelog',
      title: 'API changelog generation',
      description:
        'Auto-generate a human-readable changelog when the spec is updated, categorizing changes as breaking, additive, or cosmetic. Addresses unannounced breaking changes that blindside frontend teams.',
      priority: 'medium',
      effort: 'medium',
      tags: ['api', 'automation'],
    },
    {
      id: 'apispec-contract-first',
      title: 'Contract-first design mode',
      description:
        'Guided editor for designing API contracts collaboratively before any code is written. Frontend and backend leads define request/response shapes together, reducing "throw it over the wall" integration failures.',
      priority: 'medium',
      effort: 'medium',
      tags: ['api', 'collaboration', 'ux'],
    },
  ],

  decisionLogBlock: [
    {
      id: 'decision-adr-template',
      title: 'Architecture Decision Record block',
      description:
        'Structured ADR block with Context, Decision, Consequences, and Status fields. Teams lose architectural knowledge when decisions are made verbally in meetings — ADRs in the doc make them searchable and onboarding-friendly.',
      priority: 'high',
      effort: 'medium',
      tags: ['architecture', 'collaboration'],
    },
    {
      id: 'decision-status-lifecycle',
      title: 'Decision status lifecycle',
      description:
        'Status indicators (Proposed → Accepted → Deprecated → Superseded) with linking between decisions that supersede each other, preserving the full decision history.',
      priority: 'medium',
      effort: 'small',
      tags: ['architecture', 'ux'],
    },
    {
      id: 'decision-vote-collect',
      title: 'Inline voting and sign-off',
      description:
        'Team members can vote approve/reject/abstain on proposed decisions with optional blocking votes, replacing the scattered Slack polls and meeting consensus that gets lost.',
      priority: 'medium',
      effort: 'medium',
      tags: ['collaboration', 'ux'],
    },
    {
      id: 'decision-ai-summarize',
      title: 'AI decision summarizer',
      description:
        'Summarize lengthy discussion threads (comments, linked Slack messages) into a concise ADR draft, reducing the friction that causes teams to skip writing decisions down.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ai', 'compute'],
    },
  ],

  requirementsBlock: [
    {
      id: 'req-acceptance-criteria',
      title: 'Interactive acceptance criteria checklist',
      description:
        'Given-When-Then acceptance criteria editor with testable checkboxes. Vague tickets are the #1 developer complaint about PMs — structured criteria force clarity and create a shared definition of done.',
      priority: 'high',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
    {
      id: 'req-user-story-template',
      title: 'User story template with validation',
      description:
        'Guided user story editor that warns when fields are vague ("login should work") and suggests improvements. Includes persona, goal, benefit, and edge case sections.',
      priority: 'high',
      effort: 'medium',
      tags: ['planning', 'ux', 'ai'],
    },
    {
      id: 'req-traceability-links',
      title: 'Requirements traceability matrix',
      description:
        'Link requirements to implementation PRs, test cases, and design specs. When any linked artifact changes, the requirement block shows a staleness warning — addressing documentation drift.',
      priority: 'medium',
      effort: 'medium',
      tags: ['planning', 'integration'],
    },
    {
      id: 'req-scope-change-log',
      title: 'Scope change audit trail',
      description:
        'Track every edit to requirements with timestamps and author attribution. PMs and devs can see exactly when and why scope changed, reducing "I thought we agreed on X" disputes.',
      priority: 'medium',
      effort: 'small',
      tags: ['planning', 'versioning'],
    },
    {
      id: 'req-ai-gap-detector',
      title: 'AI requirement gap detector',
      description:
        'Analyze requirements and flag missing edge cases, unaddressed error states, and ambiguous language. 39% of projects fail due to unclear requirements — proactive detection addresses this.',
      priority: 'medium',
      effort: 'large',
      tags: ['ai', 'compute', 'planning'],
    },
  ],

  changelogBlock: [
    {
      id: 'changelog-git-sync',
      title: 'Git-synced changelog',
      description:
        'Auto-populate changelog entries from Conventional Commits and merged PRs. Teams treat release notes as an afterthought — automation makes them a byproduct of the existing workflow.',
      priority: 'high',
      effort: 'medium',
      tags: ['integration', 'automation'],
    },
    {
      id: 'changelog-audience-split',
      title: 'Multi-audience changelog view',
      description:
        'Render the same changelog with different detail levels: technical (for devs), product (for PMs), and user-facing (for customers). Solves the "notes written for engineers confuse end-users" problem.',
      priority: 'high',
      effort: 'medium',
      tags: ['ux', 'ai'],
    },
    {
      id: 'changelog-semver-badge',
      title: 'Semantic versioning badges',
      description:
        'Auto-classify changes as major/minor/patch with visual badges and suggest the next version number based on the changes included.',
      priority: 'medium',
      effort: 'small',
      tags: ['automation', 'ux'],
    },
    {
      id: 'changelog-ai-draft',
      title: 'AI release notes drafting',
      description:
        'Generate human-readable release notes from commit logs and PR descriptions, adding context and value framing that raw commit messages lack.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ai', 'compute'],
    },
  ],

  dependencyGraphBlock: [
    {
      id: 'depgraph-cross-team',
      title: 'Cross-team dependency map',
      description:
        'Interactive graph visualization of feature dependencies across teams with critical-path highlighting. Cross-team dependencies hide in plain sight and are the leading cause of missed deadlines at scale.',
      priority: 'high',
      effort: 'large',
      tags: ['planning', 'ux'],
    },
    {
      id: 'depgraph-blocker-alerts',
      title: 'Blocker chain alerts',
      description:
        'Automatically detect and highlight dependency chains where a single blocked item cascades into multiple delayed deliverables, surfacing risks before they become mid-sprint crises.',
      priority: 'high',
      effort: 'medium',
      tags: ['planning', 'automation'],
    },
    {
      id: 'depgraph-jira-sync',
      title: 'Jira/Linear dependency import',
      description:
        'Import dependency links from Jira or Linear and render them visually. Jira buries cross-project dependencies in flat lists with no structure — this block provides the missing visualization layer.',
      priority: 'medium',
      effort: 'medium',
      tags: ['integration', 'planning'],
    },
    {
      id: 'depgraph-timeline-overlay',
      title: 'Timeline overlay with milestones',
      description:
        'Overlay dependency edges on a timeline/Gantt view so teams can see not just what depends on what, but when each dependency must be resolved.',
      priority: 'medium',
      effort: 'large',
      tags: ['planning', 'ux'],
    },
  ],

  postmortemBlock: [
    {
      id: 'postmortem-template',
      title: 'Blameless postmortem template',
      description:
        'Structured incident review block with Timeline, Impact, Root Cause, Contributing Factors, and Action Items sections. Follows Google SRE blameless postmortem culture — focuses on "why did the system allow this" not "who did this."',
      priority: 'high',
      effort: 'medium',
      tags: ['sre', 'templates'],
    },
    {
      id: 'postmortem-timeline-builder',
      title: 'Automated incident timeline',
      description:
        'Pull events from PagerDuty, Slack, and deploy logs to auto-build the incident timeline. Manual timeline reconstruction during high-stress incidents is error-prone and demoralizing.',
      priority: 'high',
      effort: 'large',
      tags: ['sre', 'integration', 'backend'],
    },
    {
      id: 'postmortem-action-tracker',
      title: 'Action item SLO tracker',
      description:
        'Track postmortem action items with agreed SLOs (4 or 8 weeks) and send reminders. Unreviewed postmortems and untracked actions are the top reason incidents repeat.',
      priority: 'high',
      effort: 'small',
      tags: ['sre', 'tracking'],
    },
    {
      id: 'postmortem-pattern-analysis',
      title: 'AI incident pattern analysis',
      description:
        'Analyze the postmortem library to surface recurring root causes, frequently-affected systems, and trending failure modes across the organization.',
      priority: 'medium',
      effort: 'large',
      tags: ['ai', 'sre', 'compute'],
    },
  ],

  designHandoffBlock: [
    {
      id: 'handoff-state-matrix',
      title: 'UI state matrix',
      description:
        'Structured grid for documenting every UI state: loading, empty, error, partial, success, disabled, and offline. The #1 handoff gap is that mockups only cover the happy path — this block forces completeness.',
      priority: 'high',
      effort: 'medium',
      tags: ['ux', 'design'],
    },
    {
      id: 'handoff-interaction-spec',
      title: 'Interaction specification',
      description:
        'Document animations, transitions, hover states, focus order, and keyboard shortcuts in a structured format developers can reference. Reduces "designers think in flows, engineers think in states" translation loss.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ux', 'design'],
    },
    {
      id: 'handoff-token-reference',
      title: 'Design token reference panel',
      description:
        'Inline panel showing spacing, color, and typography tokens used in the design with copy-able variable names, bridging the gap between visual intent and code implementation.',
      priority: 'medium',
      effort: 'small',
      tags: ['ux', 'design'],
    },
    {
      id: 'handoff-responsive-breakpoints',
      title: 'Responsive breakpoint specs',
      description:
        'Document layout behavior at each breakpoint with annotated screenshots or embedded Figma frames, preventing the "it looks different on mobile" surprise at review time.',
      priority: 'medium',
      effort: 'medium',
      tags: ['ux', 'design'],
    },
    {
      id: 'handoff-accessibility-checklist',
      title: 'Accessibility requirements checklist',
      description:
        'Built-in WCAG checklist tied to each UI component: color contrast ratios, ARIA labels, keyboard navigation, and screen reader behavior. Accessibility is frequently omitted from design handoffs.',
      priority: 'medium',
      effort: 'small',
      tags: ['ux', 'design', 'a11y'],
    },
  ],

  featureFlagBlock: [
    {
      id: 'flag-dashboard',
      title: 'Feature flag status dashboard',
      description:
        'Embedded dashboard showing flag name, current state (on/off/percentage), owner, and age. Stale flags are technical debt — visibility in the planning doc prevents them from being forgotten.',
      priority: 'high',
      effort: 'medium',
      tags: ['integration', 'devops'],
    },
    {
      id: 'flag-rollout-plan',
      title: 'Gradual rollout planner',
      description:
        'Step-by-step rollout plan with percentage gates (1% → 10% → 50% → 100%), approval checkpoints, and rollback criteria. Gives PMs and devs a shared view of the release strategy.',
      priority: 'high',
      effort: 'medium',
      tags: ['devops', 'planning'],
    },
    {
      id: 'flag-cleanup-tracker',
      title: 'Flag cleanup tracker',
      description:
        'Track flag lifecycle from creation through rollout to removal, with age warnings for flags that should have been cleaned up. Addresses the technical debt accumulation from abandoned flags.',
      priority: 'medium',
      effort: 'small',
      tags: ['devops', 'tracking'],
    },
    {
      id: 'flag-launchdarkly-sync',
      title: 'LaunchDarkly / Unleash integration',
      description:
        'Sync flag state from LaunchDarkly, Unleash, or similar platforms so the doc always reflects production reality without manual updates.',
      priority: 'medium',
      effort: 'medium',
      tags: ['integration', 'devops'],
    },
  ],

  estimationBlock: [
    {
      id: 'estimate-confidence-range',
      title: 'Confidence range estimator',
      description:
        'Capture best-case, likely, and worst-case estimates with visual confidence intervals instead of single-point estimates. Addresses the trust erosion cycle where PMs pad timelines and devs inflate estimates.',
      priority: 'high',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
    {
      id: 'estimate-complexity-breakdown',
      title: 'Complexity breakdown matrix',
      description:
        'Break estimates into dimensions: implementation complexity, uncertainty, dependency risk, and testing effort. Surfaces hidden risks that single story-point numbers obscure.',
      priority: 'medium',
      effort: 'small',
      tags: ['planning', 'ux'],
    },
    {
      id: 'estimate-historical-compare',
      title: 'Historical estimate comparison',
      description:
        'Compare current estimates against similar past work to calibrate accuracy. Shows estimate-vs-actual for comparable features so teams can learn from over/under-estimation patterns.',
      priority: 'medium',
      effort: 'medium',
      tags: ['planning', 'analytics'],
    },
    {
      id: 'estimate-assumption-log',
      title: 'Estimation assumptions log',
      description:
        'Document the assumptions behind each estimate (e.g. "assumes existing auth system can be reused"). When assumptions are invalidated, the estimate block flags affected items for re-estimation.',
      priority: 'medium',
      effort: 'small',
      tags: ['planning', 'tracking'],
    },
  ],

  rfcBlock: [
    {
      id: 'rfc-template',
      title: 'RFC document template',
      description:
        'Structured Request for Comments block with Problem, Proposal, Alternatives Considered, Open Questions, and Resolution sections. Formalizes the proposal process that otherwise happens in scattered Slack threads.',
      priority: 'high',
      effort: 'medium',
      tags: ['collaboration', 'templates'],
    },
    {
      id: 'rfc-review-workflow',
      title: 'Review and approval workflow',
      description:
        'Configurable review workflow with required approvers, review deadline, and status transitions (Draft → In Review → Approved → Implemented). Prevents proposals from stalling in limbo.',
      priority: 'medium',
      effort: 'medium',
      tags: ['collaboration', 'ux'],
    },
    {
      id: 'rfc-inline-discussion',
      title: 'Inline threaded discussion',
      description:
        'Per-section threaded comments that can be resolved or escalated to open questions. Keeps feedback attached to the specific proposal section instead of scattered across Slack and email.',
      priority: 'medium',
      effort: 'medium',
      tags: ['collaboration', 'ux'],
    },
    {
      id: 'rfc-decision-link',
      title: 'Link RFCs to decision records',
      description:
        'When an RFC is approved, auto-generate a linked ADR in the decision log block, creating a traceable chain from proposal to decision to implementation.',
      priority: 'medium',
      effort: 'small',
      tags: ['collaboration', 'architecture'],
    },
  ],

  roadmapBlock: [
    {
      id: 'roadmap-timeline-view',
      title: 'Interactive timeline roadmap',
      description:
        'Visual timeline with swimlanes per team/workstream and draggable milestones. Addresses roadmap misalignment — the #1 communication gap between PMs and engineering leads.',
      priority: 'high',
      effort: 'large',
      tags: ['planning', 'ux'],
    },
    {
      id: 'roadmap-now-next-later',
      title: 'Now / Next / Later view',
      description:
        'Kanban-style roadmap organized by time horizon (Now, Next, Later) rather than fixed dates, which is more honest about long-term uncertainty and reduces estimation pressure.',
      priority: 'high',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
    {
      id: 'roadmap-dependency-overlay',
      title: 'Dependency overlay on roadmap',
      description:
        'Draw dependency arrows between roadmap items to surface sequencing constraints. Without this, roadmaps imply parallel execution even when items are blocked on each other.',
      priority: 'medium',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
    {
      id: 'roadmap-stakeholder-filter',
      title: 'Audience-specific roadmap views',
      description:
        'Filter roadmap items by audience (engineering, product, executives, customers) showing different levels of detail. One roadmap, multiple views — prevents maintaining separate slide decks.',
      priority: 'medium',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
  ],

  riskRegisterBlock: [
    {
      id: 'risk-register-matrix',
      title: 'Risk register with severity matrix',
      description:
        'Track project risks with likelihood × impact scoring, mitigation plans, and owners. Surfaces the risks that PMs and devs informally worry about but never write down.',
      priority: 'medium',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
    {
      id: 'risk-auto-escalation',
      title: 'Risk auto-escalation',
      description:
        'Automatically escalate risks that exceed a severity threshold or remain unmitigated past a deadline, preventing the "we knew about it but nobody raised it" failure mode.',
      priority: 'medium',
      effort: 'small',
      tags: ['planning', 'automation'],
    },
    {
      id: 'risk-dependency-link',
      title: 'Link risks to dependencies',
      description:
        'Connect risk items to dependency graph nodes so teams can see which cross-team dependencies carry the highest risk and prioritize coordination accordingly.',
      priority: 'low',
      effort: 'small',
      tags: ['planning', 'integration'],
    },
  ],

  stakeholderBlock: [
    {
      id: 'stakeholder-raci-matrix',
      title: 'RACI matrix block',
      description:
        'Editable Responsible/Accountable/Consulted/Informed matrix for project decisions. Eliminates the "I thought you were handling that" ambiguity that plagues cross-functional projects.',
      priority: 'medium',
      effort: 'small',
      tags: ['collaboration', 'planning'],
    },
    {
      id: 'stakeholder-communication-plan',
      title: 'Communication plan',
      description:
        'Structured plan defining who gets updated, how often, through which channel, and at what level of detail. Addresses the communication silo problem where different stakeholders get inconsistent information.',
      priority: 'low',
      effort: 'small',
      tags: ['collaboration', 'templates'],
    },
  ],

  sprintBoardBlock: [
    {
      id: 'sprint-planning-board',
      title: 'Embedded sprint planning board',
      description:
        'Lightweight kanban board (To Do → In Progress → In Review → Done) embedded in sprint planning docs so the plan and execution status live in the same place.',
      priority: 'medium',
      effort: 'large',
      tags: ['planning', 'ux'],
    },
    {
      id: 'sprint-capacity-planner',
      title: 'Team capacity planner',
      description:
        'Visual capacity planning showing team member availability, planned vacations, and allocated story points vs. capacity. Prevents the chronic overcommitment that erodes trust between devs and PMs.',
      priority: 'high',
      effort: 'medium',
      tags: ['planning', 'ux'],
    },
    {
      id: 'sprint-goal-tracker',
      title: 'Sprint goal tracker',
      description:
        'Prominent sprint goal display with progress indicator. Best practice is to communicate sprint goals (not velocity) outside the team — this block makes the goal the focal point.',
      priority: 'medium',
      effort: 'small',
      tags: ['planning', 'ux'],
    },
    {
      id: 'sprint-retro-actions',
      title: 'Retrospective action items',
      description:
        'Track action items from sprint retrospectives with owners and due dates, carried forward until completed. Addresses the problem of retro insights being discussed but never acted on.',
      priority: 'medium',
      effort: 'small',
      tags: ['planning', 'tracking'],
    },
  ],

  techDebtBlock: [
    {
      id: 'techdebt-registry',
      title: 'Technical debt registry',
      description:
        'Catalog technical debt items with severity, affected systems, estimated remediation cost, and business impact. Makes tech debt visible to PMs who otherwise see only feature requests in the backlog.',
      priority: 'high',
      effort: 'medium',
      tags: ['engineering', 'planning'],
    },
    {
      id: 'techdebt-interest-calculator',
      title: 'Debt interest calculator',
      description:
        'Estimate the ongoing cost of each debt item (extra dev time per sprint, incident frequency, onboarding friction) so PMs can weigh debt paydown against feature work with real numbers.',
      priority: 'medium',
      effort: 'medium',
      tags: ['engineering', 'analytics'],
    },
    {
      id: 'techdebt-paydown-roadmap',
      title: 'Debt paydown roadmap',
      description:
        'Visual plan for addressing tech debt over time, integrated with the feature roadmap so debt remediation is treated as first-class work rather than something done "when we have time."',
      priority: 'medium',
      effort: 'medium',
      tags: ['engineering', 'planning'],
    },
  ],

  onboardingBlock: [
    {
      id: 'onboarding-checklist',
      title: 'Developer onboarding checklist',
      description:
        'Interactive onboarding checklist with environment setup steps, required access grants, and key document links. Reduces tribal knowledge dependency — new hires should not need to "ask the person who was here 5 years ago."',
      priority: 'medium',
      effort: 'small',
      tags: ['collaboration', 'templates'],
    },
    {
      id: 'onboarding-codebase-tour',
      title: 'Codebase architecture tour',
      description:
        'Guided walkthrough linking to key files, architecture decisions, and system diagrams. ADR research shows onboarding docs powered by decision records can save days during ramp-up.',
      priority: 'medium',
      effort: 'medium',
      tags: ['collaboration', 'architecture'],
    },
  ],
};

/** Look up roadmap items for a given block node name. */
export function getRoadmapForBlock(blockName: string): RoadmapItem[] {
  return blockRoadmap[blockName] ?? [];
}
