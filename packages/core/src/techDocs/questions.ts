import type { QAQuestion } from './types';

export const TECH_DOCS_QUESTIONS: QAQuestion[] = [
  // ─── Round 1: Scope Clarification ────────────────────────────
  {
    id: 'scope-in',
    round: 'scope',
    roundLabel: 'Scope Clarification',
    question: 'What is explicitly in scope for this feature?',
    hint: 'List the specific deliverables, endpoints, screens, or behaviors that must ship.',
    required: true,
  },
  {
    id: 'scope-out',
    round: 'scope',
    roundLabel: 'Scope Clarification',
    question: 'What is explicitly out of scope or deferred?',
    hint: 'Helps prevent scope creep. E.g. "Admin UI is phase 2", "No mobile support yet".',
    required: true,
  },
  {
    id: 'scope-edge-cases',
    round: 'scope',
    roundLabel: 'Scope Clarification',
    question: 'Are there any edge cases or ambiguous scenarios the PM should clarify?',
    hint: 'Concurrent edits, empty states, partial failures, timezone issues, etc.',
    required: false,
  },

  // ─── Round 2: User-Facing vs Internal ────────────────────────
  {
    id: 'uf-type',
    round: 'user-facing',
    roundLabel: 'User-Facing vs Internal',
    question: 'What are the user-facing surfaces for this feature?',
    hint: 'UI pages, API endpoints consumers call directly, emails/notifications, etc.',
    required: true,
  },
  {
    id: 'uf-internal',
    round: 'user-facing',
    roundLabel: 'User-Facing vs Internal',
    question: 'Are there background jobs, cron tasks, or internal-only components?',
    hint: 'Workers, queue consumers, data pipelines, scheduled tasks, webhooks.',
    required: false,
  },

  // ─── Round 3: Data Questions ─────────────────────────────────
  {
    id: 'data-entities',
    round: 'data',
    roundLabel: 'Data Design',
    question: 'What new data entities or modifications to existing entities are needed?',
    hint: 'New tables, new columns, new indexes. Describe the shape of the data.',
    required: true,
  },
  {
    id: 'data-volume',
    round: 'data',
    roundLabel: 'Data Design',
    question: 'What are the expected data volumes and access patterns?',
    hint: 'Rows per day, read:write ratio, hot keys, queries that need to be fast.',
    required: false,
  },
  {
    id: 'data-migration',
    round: 'data',
    roundLabel: 'Data Design',
    question: 'Does existing data need to be migrated or backfilled?',
    hint: 'Backfill scripts, data transformation, zero-downtime migration concerns.',
    required: false,
  },

  // ─── Round 4: Dependencies ───────────────────────────────────
  {
    id: 'dep-services',
    round: 'dependencies',
    roundLabel: 'Dependencies',
    question: 'Are there dependencies on other services, teams, or external APIs?',
    hint: 'Third-party APIs, internal microservices, shared libraries, other team deliverables.',
    required: true,
  },
  {
    id: 'dep-blockers',
    round: 'dependencies',
    roundLabel: 'Dependencies',
    question: 'Are there any known blockers or prerequisites that must be completed first?',
    hint: 'Infrastructure provisioning, API keys, design sign-off, other PRs.',
    required: false,
  },

  // ─── Round 5: Non-Functional Requirements ────────────────────
  {
    id: 'nfr-performance',
    round: 'non-functionals',
    roundLabel: 'Non-Functional Requirements',
    question: 'What are the performance targets or SLAs?',
    hint: 'Response time p95/p99, throughput, concurrent users, availability targets.',
    required: false,
  },
  {
    id: 'nfr-scale',
    round: 'non-functionals',
    roundLabel: 'Non-Functional Requirements',
    question: 'What scale does this need to support at launch and in 6 months?',
    hint: 'User count, request volume, data growth rate.',
    required: false,
  },

  // ─── Round 6: Security & Auth ────────────────────────────────
  {
    id: 'sec-auth',
    round: 'security',
    roundLabel: 'Security & Auth',
    question: 'Does this feature require new permissions, roles, or auth changes?',
    hint: 'New RBAC roles, OAuth scopes, API key changes, admin-only access.',
    required: true,
  },
  {
    id: 'sec-pii',
    round: 'security',
    roundLabel: 'Security & Auth',
    question: 'Does this feature handle PII or sensitive data?',
    hint: 'Emails, addresses, payment info, health data, GDPR considerations.',
    required: false,
  },

  // ─── Round 7: Rollout Strategy ───────────────────────────────
  {
    id: 'roll-flags',
    round: 'rollout',
    roundLabel: 'Rollout Strategy',
    question: 'Should this be behind a feature flag or rolled out in phases?',
    hint: 'Percentage rollout, beta users first, internal dogfooding, kill switch.',
    required: true,
  },
  {
    id: 'roll-rollback',
    round: 'rollout',
    roundLabel: 'Rollout Strategy',
    question: 'What is the rollback plan if something goes wrong?',
    hint: 'Feature flag off, DB migration rollback, revert deploy, data cleanup.',
    required: false,
  },
];

export const QUESTION_ROUNDS: { round: QAQuestion['round']; label: string }[] = [
  { round: 'scope', label: 'Scope Clarification' },
  { round: 'user-facing', label: 'User-Facing vs Internal' },
  { round: 'data', label: 'Data Design' },
  { round: 'dependencies', label: 'Dependencies' },
  { round: 'non-functionals', label: 'Non-Functional Requirements' },
  { round: 'security', label: 'Security & Auth' },
  { round: 'rollout', label: 'Rollout Strategy' },
];
