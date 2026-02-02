import type {
  TechDocsConfig,
  TechDocsAnalysisResult,
  TechDocsAnalysisProgress,
  QAAnswer,
} from './types';

/**
 * Simulates the tech docs analysis pipeline by stepping through each phase
 * with realistic delays. Returns progress updates via callback.
 */
export async function runTechDocsAnalysis(
  config: TechDocsConfig,
  answers: QAAnswer[],
  onProgress: (progress: TechDocsAnalysisProgress) => void,
): Promise<TechDocsAnalysisResult> {
  const phases: Array<{
    phase: TechDocsAnalysisProgress['phase'];
    message: string;
    percent: number;
    delay: number;
  }> = [
    { phase: 'parsing-prd', message: 'Parsing PRD content and extracting requirements...', percent: 10, delay: 900 },
    { phase: 'analyzing-repo', message: 'Analyzing repository structure and tech stack...', percent: 25, delay: 1100 },
    { phase: 'mapping-changes', message: 'Mapping required changes across layers...', percent: 50, delay: 1200 },
    { phase: 'generating-design', message: 'Generating detailed design from Q&A answers...', percent: 75, delay: 1000 },
    { phase: 'building-document', message: 'Building technical document...', percent: 90, delay: 700 },
    { phase: 'complete', message: 'Document generated', percent: 100, delay: 300 },
  ];

  for (const step of phases) {
    onProgress({
      phase: step.phase,
      percent: step.percent,
      message: step.message,
    });
    await sleep(step.delay);
  }

  return generateMockResult(config, answers);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getAnswer(answers: QAAnswer[], id: string): string {
  return answers.find((a) => a.questionId === id)?.answer || '';
}

function generateMockResult(
  config: TechDocsConfig,
  answers: QAAnswer[],
): TechDocsAnalysisResult {
  const repoName = config.repo?.repo || 'unknown-repo';
  const featureTitle = config.featureTitle || 'Untitled Feature';

  // Pull user answers to enrich the mock (or fall back to realistic defaults)
  const scopeIn = getAnswer(answers, 'scope-in') || 'User-facing dashboard with CRUD operations';
  const scopeOut = getAnswer(answers, 'scope-out') || 'Mobile app, admin panel';

  return {
    config,
    answers,

    // ─── Overview (from PRD + Q&A) ──────────────────────────────
    overview:
      config.prdContent
        ? `This technical design covers the implementation of "${featureTitle}". ${config.prdContent.slice(0, 200)}${config.prdContent.length > 200 ? '...' : ''}`
        : `This technical design covers the implementation of "${featureTitle}". The feature introduces new functionality to the ${repoName} service based on the product requirements provided.`,

    background:
      `The ${repoName} repository is a TypeScript/Node.js service that handles core business logic. ` +
      `This feature builds on existing infrastructure and follows established patterns within the codebase. ` +
      `The repo agent analyzed the current project structure and identified the changes required below.`,

    scope: scopeIn
      ? scopeIn.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [
          'REST API endpoints for the new resource',
          'Database schema and migrations',
          'Service layer business logic',
          'Input validation and error handling',
        ],

    nonGoals: scopeOut
      ? scopeOut.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [
          'Admin management UI (phase 2)',
          'Real-time WebSocket updates',
          'Mobile-specific API optimizations',
        ],

    // ─── Repo Analysis ──────────────────────────────────────────
    repoName,
    techStack: ['TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'Jest'],

    existingPatterns: [
      {
        name: 'Repository Pattern',
        description: 'Database access is abstracted through repository classes with standard CRUD methods.',
        files: ['src/repositories/userRepository.ts', 'src/repositories/orderRepository.ts'],
      },
      {
        name: 'Service Layer',
        description: 'Business logic lives in service classes that orchestrate repositories and external calls.',
        files: ['src/services/userService.ts', 'src/services/orderService.ts'],
      },
      {
        name: 'Express Router + Middleware',
        description: 'Routes are defined in separate router files with shared auth and validation middleware.',
        files: ['src/api/routes/users.ts', 'src/middleware/auth.ts', 'src/middleware/validate.ts'],
      },
      {
        name: 'Zod Validation Schemas',
        description: 'Request bodies are validated using Zod schemas co-located with route definitions.',
        files: ['src/api/schemas/userSchemas.ts', 'src/api/schemas/orderSchemas.ts'],
      },
    ],

    affectedModules: [
      {
        layer: 'database',
        filePath: `src/migrations/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_create_${featureTitle.toLowerCase().replace(/\s+/g, '_')}.ts`,
        changeType: 'create',
        description: `Database migration to create the ${featureTitle.toLowerCase()} table and indexes.`,
      },
      {
        layer: 'database',
        filePath: `src/repositories/${featureTitle.toLowerCase().replace(/\s+/g, '')}Repository.ts`,
        changeType: 'create',
        description: 'Repository class with CRUD operations following existing patterns.',
      },
      {
        layer: 'service',
        filePath: `src/services/${featureTitle.toLowerCase().replace(/\s+/g, '')}Service.ts`,
        changeType: 'create',
        description: 'Service layer containing business logic, validation, and orchestration.',
      },
      {
        layer: 'controller',
        filePath: `src/api/routes/${featureTitle.toLowerCase().replace(/\s+/g, '')}.ts`,
        changeType: 'create',
        description: 'Express router with endpoint definitions and request validation.',
      },
      {
        layer: 'api',
        filePath: `src/api/schemas/${featureTitle.toLowerCase().replace(/\s+/g, '')}Schemas.ts`,
        changeType: 'create',
        description: 'Zod validation schemas for request/response types.',
      },
      {
        layer: 'middleware',
        filePath: 'src/middleware/auth.ts',
        changeType: 'modify',
        description: 'Add new permission check for the feature resource.',
      },
      {
        layer: 'config',
        filePath: 'src/api/routes/index.ts',
        changeType: 'modify',
        description: 'Register new router in the main route index.',
      },
      {
        layer: 'test',
        filePath: `src/__tests__/${featureTitle.toLowerCase().replace(/\s+/g, '')}Service.test.ts`,
        changeType: 'create',
        description: 'Unit tests for service layer.',
      },
      {
        layer: 'test',
        filePath: `src/__tests__/${featureTitle.toLowerCase().replace(/\s+/g, '')}.integration.test.ts`,
        changeType: 'create',
        description: 'Integration tests for API endpoints with test database.',
      },
    ],

    // ─── Detailed Design ────────────────────────────────────────
    schemaChanges: [
      {
        entity: featureTitle.toLowerCase().replace(/\s+/g, '_'),
        changeType: 'create-table',
        description: `New table storing ${featureTitle.toLowerCase()} records with full audit trail.`,
        fields: [
          { name: 'id', type: 'UUID', nullable: false, description: 'Primary key (auto-generated)' },
          { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Display name' },
          { name: 'status', type: "ENUM('draft','active','archived')", nullable: false, description: 'Lifecycle state' },
          { name: 'owner_id', type: 'UUID', nullable: false, description: 'FK to users table' },
          { name: 'metadata', type: 'JSONB', nullable: true, description: 'Extensible JSON metadata blob' },
          { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Row creation timestamp' },
          { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Last update timestamp' },
        ],
      },
      {
        entity: featureTitle.toLowerCase().replace(/\s+/g, '_'),
        changeType: 'add-index',
        description: 'Composite index on (owner_id, status) for dashboard queries.',
      },
    ],

    apiChanges: [
      {
        method: 'POST',
        path: `/api/v2/${featureTitle.toLowerCase().replace(/\s+/g, '-')}`,
        changeType: 'new',
        description: `Create a new ${featureTitle.toLowerCase()} record.`,
        requestShape: '{ name: string, metadata?: object }',
        responseShape: `{ id: string, name: string, status: "draft", created_at: string }`,
        errorCodes: ['400 Validation Error', '401 Unauthorized', '409 Duplicate Name'],
        authRequired: true,
      },
      {
        method: 'GET',
        path: `/api/v2/${featureTitle.toLowerCase().replace(/\s+/g, '-')}`,
        changeType: 'new',
        description: 'List records with pagination, filtering by status and owner.',
        requestShape: '?status=active&page=1&limit=20',
        responseShape: '{ data: Item[], total: number, page: number }',
        errorCodes: ['401 Unauthorized'],
        authRequired: true,
      },
      {
        method: 'GET',
        path: `/api/v2/${featureTitle.toLowerCase().replace(/\s+/g, '-')}/:id`,
        changeType: 'new',
        description: 'Get a single record by ID.',
        responseShape: '{ id: string, name: string, status: string, ... }',
        errorCodes: ['401 Unauthorized', '404 Not Found'],
        authRequired: true,
      },
      {
        method: 'PATCH',
        path: `/api/v2/${featureTitle.toLowerCase().replace(/\s+/g, '-')}/:id`,
        changeType: 'new',
        description: 'Update record fields. Supports partial updates.',
        requestShape: '{ name?: string, status?: string, metadata?: object }',
        responseShape: '{ id: string, ...updated fields }',
        errorCodes: ['400 Validation Error', '401 Unauthorized', '404 Not Found'],
        authRequired: true,
      },
      {
        method: 'DELETE',
        path: `/api/v2/${featureTitle.toLowerCase().replace(/\s+/g, '-')}/:id`,
        changeType: 'new',
        description: 'Soft-delete by setting status to archived.',
        errorCodes: ['401 Unauthorized', '404 Not Found'],
        authRequired: true,
      },
    ],

    sequenceDiagram: [
      { from: 'Client', to: 'API Gateway', action: 'POST /api/v2/resource', description: 'Auth token in header' },
      { from: 'API Gateway', to: 'Auth Middleware', action: 'Validate JWT', description: 'Check permissions' },
      { from: 'Auth Middleware', to: 'Validation', action: 'Zod schema check', description: 'Validate request body' },
      { from: 'Validation', to: 'Service', action: 'create()', description: 'Business logic' },
      { from: 'Service', to: 'Repository', action: 'insert()', description: 'Database write' },
      { from: 'Repository', to: 'PostgreSQL', action: 'INSERT INTO', description: 'Persisted' },
      { from: 'PostgreSQL', to: 'Service', action: 'Row returned', description: 'With generated ID' },
      { from: 'Service', to: 'Redis', action: 'Cache invalidation', description: 'Bust list cache' },
      { from: 'Service', to: 'Client', action: '201 Created', description: 'Return new resource' },
    ],

    // ─── Cross-Cutting Concerns ─────────────────────────────────
    securityConsiderations: [
      {
        category: 'auth',
        description: `New ${featureTitle.toLowerCase()} endpoints require authenticated users with the "write:${featureTitle.toLowerCase().replace(/\s+/g, '_')}" permission scope.`,
        severity: 'high',
      },
      {
        category: 'data-privacy',
        description: 'Metadata field may contain user-provided content. Ensure no PII leaks through list endpoints visible to other users.',
        severity: 'medium',
      },
      {
        category: 'input-validation',
        description: 'All request bodies validated via Zod schemas. JSONB metadata field should be size-limited (max 10KB) to prevent abuse.',
        severity: 'medium',
      },
      {
        category: 'permissions',
        description: 'Users can only access their own records. Admin role can access all. Enforced at the service layer.',
        severity: 'high',
      },
    ],

    testPlan: [
      {
        layer: 'unit',
        target: `${featureTitle}Service`,
        description: 'Test all service methods with mocked repository.',
        assertions: [
          'Creates record with correct defaults',
          'Rejects duplicate names for same owner',
          'Validates status transitions (draft → active → archived)',
          'Throws NotFoundError for missing records',
        ],
      },
      {
        layer: 'unit',
        target: 'Validation schemas',
        description: 'Test Zod schemas accept valid input and reject invalid input.',
        assertions: [
          'Accepts valid create payload',
          'Rejects missing required fields',
          'Rejects name exceeding 255 characters',
          'Rejects invalid status values',
        ],
      },
      {
        layer: 'integration',
        target: 'API endpoints',
        description: 'End-to-end API tests against test database using Supertest.',
        assertions: [
          'POST returns 201 with valid payload',
          'GET returns paginated list',
          'PATCH updates and returns modified record',
          'DELETE soft-deletes (status → archived)',
          'Returns 401 without auth token',
          'Returns 404 for nonexistent ID',
        ],
      },
      {
        layer: 'e2e',
        target: 'Full user flow',
        description: 'Playwright test covering create → view → edit → archive flow.',
        assertions: [
          'User can create from dashboard',
          'Record appears in list view',
          'Edit form saves changes',
          'Archive removes from active list',
        ],
      },
    ],

    rolloutSteps: [
      { order: 1, type: 'migration', description: 'Run database migration to create table and indexes', notes: 'Zero-downtime, additive only' },
      { order: 2, type: 'feature-flag', description: 'Deploy behind feature flag (disabled by default)', notes: 'Flag: enable_' + featureTitle.toLowerCase().replace(/\s+/g, '_') },
      { order: 3, type: 'deploy', description: 'Deploy to staging environment', notes: 'Run full integration test suite' },
      { order: 4, type: 'feature-flag', description: 'Enable for internal team (dogfooding)', notes: '~20 users' },
      { order: 5, type: 'monitor', description: 'Monitor error rates, latency p95, and DB query performance', notes: 'Grafana dashboard + PagerDuty alert' },
      { order: 6, type: 'feature-flag', description: 'Ramp to 10% → 50% → 100% of users', notes: 'Hold each stage for 24h minimum' },
      { order: 7, type: 'rollback', description: 'Rollback plan: disable feature flag, no DB rollback needed', notes: 'Soft-delete data preserved' },
    ],

    risks: [
      {
        description: 'JSONB metadata field could be used to store arbitrarily large payloads, impacting DB performance.',
        severity: 'medium',
        mitigation: 'Enforce 10KB size limit at the validation layer.',
        isOpenQuestion: false,
      },
      {
        description: 'Cache invalidation on write could cause brief inconsistency for list queries.',
        severity: 'low',
        mitigation: 'Accept eventual consistency (< 1s). Use short TTL for list cache.',
        isOpenQuestion: false,
      },
      {
        description: 'Permission model: Should org admins see all records, or only workspace admins?',
        severity: 'high',
        mitigation: 'Needs PM clarification before implementation.',
        isOpenQuestion: true,
      },
      {
        description: 'Rate limiting: What are the appropriate limits for create/update endpoints?',
        severity: 'medium',
        mitigation: 'Default to 100 req/min per user. Review after launch metrics.',
        isOpenQuestion: true,
      },
    ],

    alternatives: [
      {
        approach: 'Store metadata in a separate key-value store (DynamoDB)',
        pros: [
          'Flexible schema without impacting relational DB',
          'Better read performance for metadata-heavy queries',
        ],
        cons: [
          'Added operational complexity (new service dependency)',
          'Cross-store consistency challenges',
          'Team has no DynamoDB expertise',
        ],
        rejectionReason: 'PostgreSQL JSONB is sufficient for expected scale and keeps the stack simple.',
      },
      {
        approach: 'Use GraphQL instead of REST for the new endpoints',
        pros: [
          'Client can request exactly the fields needed',
          'Single endpoint for all operations',
        ],
        cons: [
          'Rest of the codebase is REST — would create inconsistency',
          'Additional learning curve for the team',
          'Existing tooling (Swagger, API tests) assumes REST',
        ],
        rejectionReason: 'Consistency with existing REST patterns is more valuable than GraphQL flexibility for this feature.',
      },
    ],

    generatedAt: new Date().toISOString(),
  };
}
