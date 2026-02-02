# God Mode: Ideal Repository Plan

This document describes everything a repository should have to fully leverage all 12 analysis dimensions of the DarDocs God Mode template. God Mode scans your repo and auto-generates a comprehensive system document. The richer your repo's structure, the richer the output.

---

## How God Mode Works

God Mode takes one or more GitHub repository URLs, analyzes their contents via clone + static analysis, and generates a structured document with these sections:

1. **Contributors** — who works on this repo and how much
2. **Product Managers** — non-engineer stakeholders
3. **Tech Stack** — languages, frameworks, CI/CD
4. **Environment Setup** — step-by-step local dev setup
5. **API Surface** — REST endpoints (with optional Swagger embed)
6. **Domain Glossary** — jargon and abbreviations explained
7. **Hot Zones** — highest-churn files in the last 6 months
8. **Error Taxonomy** — custom error classes and their meanings
9. **Architecture Decisions** — key technical decisions from PRs/ADRs/commits
10. **System Interaction Map** — cross-repo connections (multi-repo only)
11. **Test Frameworks** — testing tools in use
12. **CI/CD Platform** — deployment pipeline

---

## 1. Contributors (Git History)

**What God Mode extracts:** Name, GitHub handle, commit count, lines added/removed, last active date.

**What your repo needs:**
- Multiple contributors with real commit history (not squash-merged into one author)
- Consistent use of GitHub accounts (so author attribution works)
- Active, recent commits (God Mode shows "last active" dates)

**Recommendations:**
- Avoid a single person doing all commits — spread ownership
- Use individual GitHub accounts, not shared/bot accounts for feature work
- Keep a steady commit cadence so the data reflects actual activity

---

## 2. Team Members / Product Managers

**What God Mode extracts:** PM names and GitHub handles from the config you provide.

**What your repo needs:**
- Nothing in the repo itself — this is user-provided during God Mode configuration
- However, having a `CODEOWNERS` file or `TEAM.md` makes it easier to know who to enter

**Recommendations:**
- Maintain a `CODEOWNERS` file mapping directories to team members
- Optionally keep a `TEAM.md` or `CONTRIBUTORS.md` listing people and roles
- When running God Mode, add team members with accurate roles: `developer`, `pm`, `designer`, `other`

---

## 3. Tech Stack Detection

**What God Mode extracts:** Languages, frameworks, test frameworks, CI/CD platform.

**What your repo needs:**
- Standard config files that identify your stack

**Recommendations:**
- `package.json` (Node.js/JS/TS ecosystem) — lists dependencies clearly
- `requirements.txt` / `pyproject.toml` / `Pipfile` (Python)
- `go.mod` (Go), `Cargo.toml` (Rust), `pom.xml` / `build.gradle` (Java)
- `Dockerfile` and `docker-compose.yml` for infrastructure detection
- `.github/workflows/*.yml` for CI/CD platform detection (GitHub Actions)
- `Jenkinsfile`, `.circleci/config.yml`, `.gitlab-ci.yml` for other CI platforms
- Framework-specific config: `vite.config.ts`, `next.config.js`, `webpack.config.ts`, etc.

---

## 4. Environment Setup

**What God Mode extracts:** Ordered setup steps with commands, descriptions, and notes.

**What your repo needs:**
- Detectable setup patterns in your repo structure

**Recommendations:**
- `.nvmrc` or `.node-version` — signals the correct Node.js version
- `.env.example` — signals that env vars are needed (God Mode generates a "copy .env.example" step)
- `docker-compose.yml` — signals local infrastructure dependencies (Postgres, Redis, etc.)
- `Makefile` or `package.json` scripts — `dev`, `build`, `test`, `db:migrate` scripts signal setup steps
- A `README.md` with a "Getting Started" section — God Mode can cross-reference this
- Database migration scripts in a known location (`migrations/`, `prisma/`, `drizzle/`, `db/migrate/`)

**Ideal `package.json` scripts section:**
```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "test": "...",
    "test:e2e": "...",
    "db:migrate": "...",
    "db:seed": "...",
    "lint": "...",
    "typecheck": "..."
  }
}
```

---

## 5. API Surface

**What God Mode extracts:** HTTP method, path, description, source file for each endpoint.

**What your repo needs:**
- API routes defined in discoverable file locations
- Optional: Swagger/OpenAPI spec for full embed

**Recommendations:**
- Organize routes in a clear directory: `src/api/routes/`, `src/routes/`, or `src/controllers/`
- Use one file per resource: `orders.ts`, `products.ts`, `auth.ts`, `health.ts`
- Use standard HTTP method naming: `router.get()`, `router.post()`, `router.patch()`, `router.delete()`
- Include a health check endpoint: `GET /health` or `GET /api/health`
- For Swagger embed support, provide an OpenAPI spec:
  - `swagger.json` or `openapi.yaml` at the root or in `docs/`
  - Or auto-generate via `swagger-jsdoc`, `tsoa`, `nestjs/swagger`, etc.
  - When running God Mode, toggle "Add Swagger" for repos with API specs

**Ideal structure:**
```
src/
  api/
    routes/
      orders.ts        # POST /api/v2/orders, GET /api/v2/orders/:id, etc.
      products.ts      # GET /api/v2/products, POST /api/v2/products
      auth.ts          # POST /api/v2/auth/token
      health.ts        # GET /api/v2/health
      checkout.ts      # POST /api/v2/checkout
```

---

## 6. Domain Glossary

**What God Mode extracts:** Abbreviations/jargon used in code, with occurrence count, file locations, and inferred definitions.

**What your repo needs:**
- Domain-specific terms actually used in variable names, comments, and file names

**Recommendations:**
- Use domain abbreviations naturally in code: `txn`, `sku`, `pnl`, `dau`, `sla`, `mfe`, `aov`, `ltv`, etc.
- Don't over-explain them in code comments — God Mode infers definitions from context
- Use terms consistently across files (more occurrences = higher confidence)
- Having a `GLOSSARY.md` in your repo helps God Mode validate inferred definitions
- Domain terms in file paths are especially valuable: `src/services/payment.ts`, `src/models/order.ts`

---

## 7. Hot Zones (High-Churn Files)

**What God Mode extracts:** Files with the most changes in the last 6 months, with change counts, contributors, and reasons.

**What your repo needs:**
- At least 6 months of commit history (not a fresh repo with one initial commit)
- Multiple contributors touching the same files

**Recommendations:**
- Don't squash all history into a single commit when importing code
- Preserve full git history — this is the primary data source
- Files that evolve frequently (core business logic, API routes, config) produce the best hot zone data
- Commit messages that explain *why* a file changed help God Mode describe the reason for churn

---

## 8. Error Taxonomy

**What God Mode extracts:** Custom error class names, HTTP status codes, error messages, and source file locations.

**What your repo needs:**
- Custom error classes extending `Error` (or your language's equivalent)

**Recommendations:**
- Create a dedicated errors directory: `src/errors/`
- Define one error class per domain concern:
  ```
  src/errors/
    payment.ts      # InsufficientFundsError, PaymentDeclinedError
    order.ts        # OrderNotFoundError, OrderAlreadyFulfilledError
    api.ts          # RateLimitExceededError, UnauthorizedError
    checkout.ts     # StaleCartError, CouponExpiredError
    inventory.ts    # InventoryHoldExpiredError, OutOfStockError
  ```
- Include an `httpStatus` property on error classes:
  ```typescript
  export class OrderNotFoundError extends Error {
    httpStatus = 404;
    constructor(id: string) {
      super(`Order ${id} does not exist or has been archived`);
    }
  }
  ```
- Use descriptive error messages — they appear directly in the generated document

---

## 9. Architecture Decisions

**What God Mode extracts:** Date, summary, source (PR/ADR/commit), and context for each decision.

**What your repo needs:**
- Architecture Decision Records (ADRs) and/or well-written PR descriptions

**Recommendations:**
- Maintain ADRs in `docs/decisions/` or `docs/adr/`:
  ```
  docs/decisions/
    ADR-001-event-sourcing.md
    ADR-002-rest-to-grpc.md
    ADR-003-redis-streams.md
  ```
- Each ADR should contain:
  - **Date** of the decision
  - **Summary** — one-line description
  - **Context** — why this decision was made, what alternatives were considered
  - **Status** — accepted, superseded, deprecated
- Write meaningful PR descriptions for major changes — God Mode scans PR bodies
- Use descriptive commit messages for architectural changes (not just "refactor")

**ADR template:**
```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD
**Status:** Accepted

## Context
[Why was this decision needed? What problem were we solving?]

## Decision
[What did we decide to do?]

## Consequences
[What are the tradeoffs? What does this enable or constrain?]
```

---

## 10. System Interaction Map (Multi-Repo)

**What God Mode extracts:** Connections between repositories — type (API, event, shared-db, import, webhook), description, and endpoints.

**What your repo needs:**
- References to other services in your codebase

**Recommendations:**
- Use service client files that reference external APIs:
  ```
  src/clients/
    orderService.ts     # calls order-service REST API
    notificationService.ts  # publishes to notification queue
  ```
- Define event schemas or message types:
  ```
  src/events/
    orderCreated.ts
    paymentProcessed.ts
    inventoryUpdated.ts
  ```
- Use environment variables for external service URLs (detectable in `.env.example`):
  ```
  ORDER_SERVICE_URL=http://localhost:3001
  NOTIFICATION_SERVICE_URL=http://localhost:3002
  DATABASE_URL=postgresql://...
  REDIS_URL=redis://...
  ```
- Shared database references (same DB URL across repos) trigger `shared-db` connection type
- Webhook endpoints and event publishing trigger `event` / `webhook` connection types
- **Run God Mode with multiple repos** to activate this feature — single-repo configs skip this section

---

## 11. Test Frameworks

**What God Mode extracts:** Testing tools in use.

**What your repo needs:**
- Test configuration and test files

**Recommendations:**
- Include test config files: `jest.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.mocharc.yml`
- Have actual test files in standard locations:
  ```
  src/__tests__/          # or
  src/**/*.test.ts        # or
  src/**/*.spec.ts        # or
  tests/                  # or
  e2e/
  ```
- Use multiple test types for richer detection:
  - Unit tests (Jest, Vitest, Mocha)
  - Integration tests (Supertest, Testcontainers)
  - E2E tests (Playwright, Cypress)

---

## 12. CI/CD Platform

**What God Mode extracts:** The CI/CD platform name.

**What your repo needs:**
- CI/CD configuration files

**Recommendations:**
- `.github/workflows/` — GitHub Actions (preferred, easiest detection)
- `.circleci/config.yml` — CircleCI
- `Jenkinsfile` — Jenkins
- `.gitlab-ci.yml` — GitLab CI
- `.travis.yml` — Travis CI
- Include at least: build, test, and deploy stages in your pipeline

---

## Ideal Repository Structure (Complete)

Here's the full recommended structure for maximum God Mode output:

```
your-repo/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Build + test pipeline
│       └── deploy.yml                # Deployment pipeline
├── docs/
│   └── decisions/
│       ├── ADR-001-event-sourcing.md # Architecture decisions
│       ├── ADR-002-rest-to-grpc.md
│       └── ADR-003-cache-strategy.md
├── src/
│   ├── api/
│   │   └── routes/
│   │       ├── orders.ts             # CRUD endpoints per resource
│   │       ├── products.ts
│   │       ├── auth.ts
│   │       ├── checkout.ts
│   │       └── health.ts
│   ├── services/
│   │   ├── orderProcessor.ts         # Core business logic
│   │   ├── payment.ts
│   │   ├── inventory.ts
│   │   └── reporting.ts
│   ├── clients/
│   │   ├── orderService.ts           # External service clients
│   │   └── notificationService.ts
│   ├── events/
│   │   ├── orderCreated.ts           # Event schemas
│   │   └── paymentProcessed.ts
│   ├── errors/
│   │   ├── payment.ts                # Domain-specific error classes
│   │   ├── order.ts
│   │   ├── api.ts
│   │   ├── checkout.ts
│   │   └── inventory.ts
│   ├── models/
│   │   ├── order.ts
│   │   ├── product.ts
│   │   └── user.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── rateLimit.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── monitoring.ts
│   └── __tests__/
│       ├── orders.test.ts
│       ├── checkout.test.ts
│       └── auth.test.ts
├── e2e/
│   └── checkout.spec.ts              # E2E tests
├── migrations/
│   ├── 001_create_orders.sql
│   └── 002_add_products.sql
├── .env.example                      # Env var template
├── .nvmrc                            # Node version
├── docker-compose.yml                # Local infrastructure
├── Dockerfile
├── package.json                      # With dev/build/test/db:migrate scripts
├── tsconfig.json
├── jest.config.ts                    # or vitest.config.ts
├── playwright.config.ts
├── CODEOWNERS
├── TEAM.md                           # Team members and roles
└── README.md                         # Getting started section
```

---

## Checklist: Is Your Repo God-Mode Ready?

| Dimension | Minimum Requirement | Ideal State |
|---|---|---|
| Contributors | 2+ contributors with commits | 4+ contributors, active in last 30 days |
| Team Members | Know your PMs | `CODEOWNERS` + `TEAM.md` in repo |
| Tech Stack | `package.json` or equivalent | Framework configs, Docker, K8s manifests |
| Setup | `README` with steps | `.nvmrc` + `.env.example` + `docker-compose.yml` + migration scripts |
| API Surface | Route files exist | Organized `src/api/routes/` + OpenAPI spec for Swagger embed |
| Glossary | Domain terms in code | Consistent abbreviations across 3+ files each |
| Hot Zones | 6+ months of git history | Multiple contributors modifying same core files |
| Errors | Custom error classes | `src/errors/` directory with `httpStatus` on each class |
| Arch Decisions | Descriptive PR descriptions | `docs/decisions/` with dated ADRs |
| Connections | References to other services | Service clients + event schemas + env vars for URLs |
| Tests | Test files exist | Unit + integration + E2E with config files |
| CI/CD | Pipeline config file | `.github/workflows/` with build, test, deploy stages |

---

## Multi-Repo Tips

God Mode shines brightest with **multiple repositories** configured together:

1. **Designate one repo as "primary"** — this is the main service; others are secondary/supporting
2. **Use consistent naming** across repos for shared concepts (same event names, same API paths)
3. **Reference each other explicitly** — service client files, shared DB connections, event consumers
4. **Each repo should be independently set up** — own docker-compose, own .env.example, own CI pipeline
5. **Connections are auto-detected** when repos reference each other's APIs, events, or databases
