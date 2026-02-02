import type {
  GodModeConfig,
  GodModeAnalysisResult,
  RepoAnalysis,
  AnalysisProgress,
} from './types';

/**
 * Simulates the analysis pipeline by stepping through each phase
 * with realistic delays. Returns progress updates via callback.
 */
export async function runMockAnalysis(
  config: GodModeConfig,
  onProgress: (progress: AnalysisProgress) => void,
): Promise<GodModeAnalysisResult> {
  const phases: Array<{ phase: AnalysisProgress['phase']; message: string; percent: number; delay: number }> = [
    { phase: 'fetching-metadata', message: 'Fetching repository metadata via GitHub API...', percent: 5, delay: 800 },
    { phase: 'cloning', message: 'Performing shallow clone of repositories...', percent: 15, delay: 1200 },
    { phase: 'analyzing-structure', message: 'Analyzing project structure and tech stack...', percent: 30, delay: 1000 },
    { phase: 'analyzing-contributors', message: 'Mapping contributors and ownership...', percent: 45, delay: 800 },
    { phase: 'analyzing-connections', message: 'Detecting cross-repo connections and API surfaces...', percent: 60, delay: 1100 },
    { phase: 'analyzing-glossary', message: 'Identifying domain-specific terminology...', percent: 75, delay: 900 },
    { phase: 'generating-document', message: 'Generating document sections...', percent: 90, delay: 700 },
    { phase: 'complete', message: 'Analysis complete', percent: 100, delay: 300 },
  ];

  for (const step of phases) {
    onProgress({
      phase: step.phase,
      currentRepo: config.repos[0]?.repo,
      percent: step.percent,
      message: step.message,
    });
    await sleep(step.delay);
  }

  return generateMockResult(config);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateMockResult(config: GodModeConfig): GodModeAnalysisResult {
  const repos: RepoAnalysis[] = config.repos.map((repo) => {
    const isPrimary = repo.role === 'primary';
    const otherRepos = config.repos.filter((r) => r.id !== repo.id);

    return {
      repoId: repo.id,
      repoName: repo.repo,
      repoRole: repo.role,
      description: repo.description || `${repo.repo} service`,

      contributors: [
        {
          name: 'Alex Chen',
          github: 'alexchen',
          commits: isPrimary ? 342 : 87,
          linesAdded: isPrimary ? 28400 : 5200,
          linesRemoved: isPrimary ? 12300 : 2100,
          lastActive: '2026-01-28',
        },
        {
          name: 'Jordan Rivera',
          github: 'jrivera',
          commits: isPrimary ? 256 : 134,
          linesAdded: isPrimary ? 19800 : 9800,
          linesRemoved: isPrimary ? 8700 : 4100,
          lastActive: '2026-01-30',
        },
        {
          name: 'Sam Patel',
          github: 'sampatel',
          commits: isPrimary ? 189 : 45,
          linesAdded: isPrimary ? 15200 : 3400,
          linesRemoved: isPrimary ? 6800 : 1200,
          lastActive: '2026-01-25',
        },
        {
          name: 'Morgan Taylor',
          github: 'mtaylor',
          commits: isPrimary ? 78 : 23,
          linesAdded: isPrimary ? 6300 : 1800,
          linesRemoved: isPrimary ? 2900 : 700,
          lastActive: '2026-01-15',
        },
      ],

      pms: repo.teamMembers.filter((m) => m.role === 'pm').length > 0
        ? repo.teamMembers.filter((m) => m.role === 'pm')
        : [
            { name: 'Casey Kim', role: 'pm' as const },
            { name: 'Riley Brooks', role: 'pm' as const },
          ],

      connections: otherRepos.map((other) => ({
        fromRepo: repo.repo,
        toRepo: other.repo,
        connectionType: isPrimary ? 'api' as const : 'event' as const,
        description: isPrimary
          ? `${repo.repo} calls ${other.repo}'s REST API for data synchronization`
          : `${repo.repo} publishes events consumed by ${other.repo} via message queue`,
        endpoints: isPrimary
          ? [`POST /api/v2/${other.repo}/sync`, `GET /api/v2/${other.repo}/status`]
          : [`events.${repo.repo}.updated`, `events.${repo.repo}.created`],
      })),

      glossary: [
        {
          term: 'txn',
          occurrences: isPrimary ? 47 : 12,
          files: ['src/services/payment.ts', 'src/models/order.ts', 'src/utils/billing.ts'],
          inferredDefinition: 'Transaction — a single financial operation representing a payment, refund, or transfer between accounts.',
          context: 'Used throughout the billing pipeline to track payment lifecycle.',
        },
        {
          term: 'pnl',
          occurrences: isPrimary ? 23 : 5,
          files: ['src/services/reporting.ts', 'src/controllers/dashboard.ts'],
          inferredDefinition: 'Profit and Loss — a financial summary showing revenue minus costs for a given time period.',
          context: 'Core metric displayed on merchant dashboards and used in settlement calculations.',
        },
        {
          term: 'mfe',
          occurrences: isPrimary ? 34 : 8,
          files: ['src/shell/loader.ts', 'src/config/federation.ts', 'webpack.config.ts'],
          inferredDefinition: 'Micro Frontend — an independently deployable frontend module loaded at runtime via Module Federation.',
          context: 'The application shell dynamically loads MFE bundles from different teams.',
        },
        {
          term: 'sku',
          occurrences: isPrimary ? 56 : 31,
          files: ['src/models/product.ts', 'src/services/inventory.ts', 'src/api/catalog.ts'],
          inferredDefinition: 'Stock Keeping Unit — a unique identifier assigned to each distinct product variant for inventory tracking.',
          context: 'Primary key for product lookup, inventory management, and order line items.',
        },
        {
          term: 'sla',
          occurrences: isPrimary ? 18 : 9,
          files: ['src/services/alerts.ts', 'src/config/monitoring.ts'],
          inferredDefinition: 'Service Level Agreement — a contractual uptime/latency target (e.g., 99.9% availability, p95 < 200ms).',
          context: 'Drives alerting thresholds and incident severity classification.',
        },
        {
          term: 'dau',
          occurrences: isPrimary ? 15 : 4,
          files: ['src/analytics/metrics.ts', 'src/services/reporting.ts'],
          inferredDefinition: 'Daily Active Users — the count of unique users who performed at least one meaningful action within a 24-hour window.',
          context: 'Key growth metric tracked in analytics dashboards and stakeholder reports.',
        },
      ],

      apiEndpoints: [
        { method: 'POST', path: '/api/v2/orders', description: 'Create a new order', sourceFile: 'src/api/routes/orders.ts' },
        { method: 'GET', path: '/api/v2/orders/:id', description: 'Get order by ID', sourceFile: 'src/api/routes/orders.ts' },
        { method: 'PATCH', path: '/api/v2/orders/:id/status', description: 'Update order status', sourceFile: 'src/api/routes/orders.ts' },
        { method: 'POST', path: '/api/v2/checkout', description: 'Initiate checkout flow', sourceFile: 'src/api/routes/checkout.ts' },
        { method: 'GET', path: '/api/v2/products', description: 'List products with filters', sourceFile: 'src/api/routes/products.ts' },
        { method: 'POST', path: '/api/v2/auth/token', description: 'Exchange credentials for JWT', sourceFile: 'src/api/routes/auth.ts' },
        { method: 'GET', path: '/api/v2/health', description: 'Service health check', sourceFile: 'src/api/routes/health.ts' },
      ],

      errorPatterns: [
        { className: 'InsufficientFundsError', message: 'Account balance too low for transaction', sourceFile: 'src/errors/payment.ts', httpStatus: 402 },
        { className: 'OrderNotFoundError', message: 'Order does not exist or has been archived', sourceFile: 'src/errors/order.ts', httpStatus: 404 },
        { className: 'RateLimitExceededError', message: 'API rate limit exceeded, retry after cooldown', sourceFile: 'src/errors/api.ts', httpStatus: 429 },
        { className: 'StaleCartError', message: 'Cart has been modified since last fetch', sourceFile: 'src/errors/checkout.ts', httpStatus: 409 },
        { className: 'InventoryHoldExpiredError', message: 'Reserved inventory hold has expired', sourceFile: 'src/errors/inventory.ts', httpStatus: 410 },
      ],

      setupSteps: [
        { order: 1, command: 'git clone <repo-url>', description: 'Clone the repository', notes: 'Requires GitHub SSH key or token' },
        { order: 2, command: 'nvm use', description: 'Switch to the correct Node.js version', notes: 'Reads from .nvmrc (Node 20.x)' },
        { order: 3, command: 'npm install', description: 'Install dependencies' },
        { order: 4, command: 'cp .env.example .env', description: 'Create local environment file', notes: 'Ask team lead for secret values' },
        { order: 5, command: 'docker-compose up -d', description: 'Start local Postgres and Redis', notes: 'Requires Docker Desktop running' },
        { order: 6, command: 'npm run db:migrate', description: 'Run database migrations' },
        { order: 7, command: 'npm run dev', description: 'Start the development server', notes: 'Runs on http://localhost:3000' },
      ],

      archDecisions: [
        {
          date: '2025-08-15',
          summary: 'Adopted event sourcing for order state management instead of mutable DB rows',
          source: 'PR #312 description',
          context: 'Needed full audit trail for financial compliance. Traditional CRUD made it impossible to reconstruct order history after refunds.',
        },
        {
          date: '2025-10-03',
          summary: 'Migrated from REST to gRPC for inter-service communication',
          source: 'ADR-007 in docs/decisions/',
          context: 'REST overhead became a bottleneck at 10k+ RPS. gRPC reduced p95 latency by 40% and provided type-safe contracts via protobuf.',
        },
        {
          date: '2025-12-12',
          summary: 'Chose Redis Streams over Kafka for event bus',
          source: 'Commit message on abc1234',
          context: 'Team lacked Kafka operational expertise. Redis Streams met throughput needs (<50k events/sec) with simpler ops and existing Redis infrastructure.',
        },
      ],

      techStack: isPrimary
        ? ['TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes']
        : ['TypeScript', 'React', 'Vite', 'TailwindCSS', 'Zustand', 'Vitest'],
      testFrameworks: isPrimary ? ['Jest', 'Supertest', 'Testcontainers'] : ['Vitest', 'Testing Library', 'Playwright'],
      cicdPlatform: 'GitHub Actions',
      lastAnalyzedAt: new Date().toISOString(),
    };
  });

  return {
    config,
    repos,
    generatedAt: new Date().toISOString(),
  };
}
