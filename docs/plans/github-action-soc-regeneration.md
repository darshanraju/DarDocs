# Plan: GitHub Action to Trigger SOC Regeneration (GodMode)

## Problem

GodMode SOC (System Overview Chart) generation is currently manual-only — a user
must open the DarDocs UI, configure repos, and trigger analysis. When source repos
change (new contributors, API routes, tech stack updates), the existing SOC document
becomes stale with no automated way to refresh it.

## Goal

A GitHub Action that runs when source repos change and tells the DarDocs API to
**regenerate** a specific SOC document, updating it in-place.

---

## Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────┐
│  GitHub Repo         │        │  DarDocs API          │
│  (source code)       │        │  (apps/api)           │
│                      │        │                       │
│  .github/workflows/  │  HTTP  │  POST /api/socs/:id/  │
│  regenerate-soc.yml  │───────▶│       regenerate      │
│                      │        │                       │
│  push to main ──────▶│        │  ┌─────────────┐      │
│  schedule (cron) ───▶│        │  │ Clone & Analyze│    │
│  manual dispatch ───▶│        │  │ (existing     │    │
│                      │        │  │  GodMode flow)│    │
└─────────────────────┘        │  └───────┬───────┘    │
                               │          │            │
                               │          ▼            │
                               │  ┌─────────────┐     │
                               │  │ Update doc   │     │
                               │  │ in Postgres  │     │
                               │  └─────────────┘     │
                               └──────────────────────┘
```

**Key principle:** The GitHub Action is a thin trigger. All analysis logic stays in
the DarDocs API (reuses the existing GodMode pipeline). The action just says
"regenerate SOC X" and waits for a result.

---

## Implementation Plan

### Phase 1: SOC Config Persistence (Backend)

Currently, GodMode configs (`GodModeConfig`) are ephemeral — passed from the
frontend at analysis time. To regenerate a SOC later, we need to persist the config.

#### 1.1 New DB table: `soc_configs`

**File:** `apps/api/src/lib/schema.ts`

```ts
export const socConfigs = pgTable('soc_configs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  documentId: text('document_id')
    .references(() => documents.id, { onDelete: 'set null' }),
  name: text('name').notNull(),                    // e.g. "Backend SOC", "Platform Overview"
  type: text('type').notNull().default('godmode'), // future: other SOC types
  config: jsonb('config').notNull(),               // GodModeConfig JSON
  aiConfig: jsonb('ai_config'),                    // optional AIConfig
  lastGeneratedAt: timestamp('last_generated_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Key fields:**
- `config` — stores the full `GodModeConfig` (repos, team members, roles)
- `documentId` — the document that gets updated on regeneration
- `type` — extensible for future SOC types beyond GodMode

#### 1.2 New DB table: `api_keys`

API keys allow the GitHub Action to authenticate without a user session.

**File:** `apps/api/src/lib/schema.ts`

```ts
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),           // e.g. "GitHub Action - SOC regen"
  keyHash: text('key_hash').notNull(),    // SHA-256 hash of the actual key
  keyPrefix: text('key_prefix').notNull(),// first 8 chars for identification
  scopes: jsonb('scopes').notNull().default(['soc:regenerate']),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),     // optional expiration
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Auth flow:** GitHub Action sends `Authorization: Bearer dardocs_xxxx...` →
API hashes the key → looks up in `api_keys` → verifies workspace scope.

#### 1.3 Save SOC config on GodMode generation

When a user generates a GodMode document from the UI, automatically persist the
config to `soc_configs` and link it to the created document.

**File:** `apps/api/src/routes/godMode.ts` — modify the `/api/god-mode/analyze`
endpoint to accept an optional `saveSocConfig: true` flag, and after successful
analysis, insert into `soc_configs`.

---

### Phase 2: Regeneration API Endpoint (Backend)

#### 2.1 `POST /api/socs/:id/regenerate`

**File:** `apps/api/src/routes/socs.ts` (new)

```
POST /api/socs/:id/regenerate
Authorization: Bearer dardocs_xxxx...

Response (202 Accepted):
{
  "regenerationId": "uuid",
  "status": "queued"
}
```

**Behavior:**
1. Validate API key → resolve workspace
2. Load `soc_configs` by ID → verify it belongs to the workspace
3. Run the existing GodMode analysis pipeline (clone → analyze → generate)
4. Generate new document content via `generateGodModeDocument()`
5. Update the linked document's `content` field in `documents` table
6. Update `soc_configs.lastGeneratedAt`
7. Return result

**Auth:** API key auth (not session-based). New middleware: `requireApiKey`.

#### 2.2 `GET /api/socs/:id/regenerate/:regenerationId`

Poll for regeneration status (since analysis can take 30-60s).

```
GET /api/socs/:id/regenerate/:regenerationId
Authorization: Bearer dardocs_xxxx...

Response:
{
  "status": "running" | "completed" | "failed",
  "progress": { "phase": "analyzing-structure", "percent": 45 },
  "completedAt": "2026-02-03T...",
  "error": null
}
```

Alternative: the regenerate endpoint could be synchronous with a longer timeout
since the GitHub Action can wait. Start synchronous, add async polling later if
needed.

#### 2.3 Supporting routes

```
GET    /api/socs                    — list SOC configs for workspace
GET    /api/socs/:id                — get a single SOC config
PATCH  /api/socs/:id                — update SOC config (repos, name, etc.)
DELETE /api/socs/:id                — delete SOC config
POST   /api/workspaces/:id/api-keys — create an API key
GET    /api/workspaces/:id/api-keys — list API keys (metadata only, no secrets)
DELETE /api/api-keys/:id            — revoke an API key
```

---

### Phase 3: GitHub Action Workflow

#### 3.1 Reusable workflow definition

Ship a reference workflow file that users copy into their repos.

**File:** `docs/github-action/regenerate-soc.yml`

```yaml
name: Regenerate DarDocs SOC

on:
  push:
    branches: [main, master]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am UTC
  workflow_dispatch:       # Manual trigger

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SOC regeneration
        env:
          DARDOCS_API_URL: ${{ secrets.DARDOCS_API_URL }}
          DARDOCS_API_KEY: ${{ secrets.DARDOCS_API_KEY }}
          SOC_CONFIG_ID: ${{ secrets.DARDOCS_SOC_CONFIG_ID }}
        run: |
          response=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $DARDOCS_API_KEY" \
            -H "Content-Type: application/json" \
            "$DARDOCS_API_URL/api/socs/$SOC_CONFIG_ID/regenerate")

          http_code=$(echo "$response" | tail -1)
          body=$(echo "$response" | head -n -1)

          if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "SOC regeneration triggered successfully"
            echo "$body" | jq .
          else
            echo "Failed to trigger SOC regeneration (HTTP $http_code)"
            echo "$body"
            exit 1
          fi

      - name: Wait for completion
        env:
          DARDOCS_API_URL: ${{ secrets.DARDOCS_API_URL }}
          DARDOCS_API_KEY: ${{ secrets.DARDOCS_API_KEY }}
          SOC_CONFIG_ID: ${{ secrets.DARDOCS_SOC_CONFIG_ID }}
        run: |
          regen_id=$(echo "$body" | jq -r .regenerationId)
          for i in $(seq 1 30); do
            sleep 10
            status=$(curl -s \
              -H "Authorization: Bearer $DARDOCS_API_KEY" \
              "$DARDOCS_API_URL/api/socs/$SOC_CONFIG_ID/regenerate/$regen_id" \
              | jq -r .status)

            echo "Attempt $i: status=$status"

            if [ "$status" = "completed" ]; then
              echo "SOC regeneration completed"
              exit 0
            elif [ "$status" = "failed" ]; then
              echo "SOC regeneration failed"
              exit 1
            fi
          done

          echo "Timed out waiting for SOC regeneration"
          exit 1
```

#### 3.2 Required GitHub Secrets

Users configure these in their repo's Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `DARDOCS_API_URL` | Base URL of DarDocs API (e.g. `https://api.dardocs.com`) |
| `DARDOCS_API_KEY` | API key created in DarDocs workspace settings |
| `DARDOCS_SOC_CONFIG_ID` | ID of the SOC config to regenerate |

---

### Phase 4: Frontend — SOC Management UI

#### 4.1 SOC config management page

Show a list of saved SOC configs in the workspace settings. Each entry shows:
- SOC name and type
- Linked document
- Repos being analyzed
- Last generated timestamp
- "Regenerate now" button (manual trigger from UI)
- "Copy GitHub Action setup" button

#### 4.2 API key management

Workspace settings page to:
- Create new API keys (show the key once on creation)
- List existing keys (prefix + name + last used)
- Revoke keys

#### 4.3 Auto-save SOC config on generation

When a user completes GodMode generation, prompt them to save the config as a
named SOC for future regeneration.

---

## Detailed File Change List

### New files
| File | Description |
|------|-------------|
| `apps/api/src/routes/socs.ts` | SOC CRUD + regeneration endpoint |
| `apps/api/src/routes/apiKeys.ts` | API key management routes |
| `apps/api/src/lib/requireApiKey.ts` | API key auth middleware |
| `apps/api/src/services/socRegenerationService.ts` | Orchestrates regeneration (wraps existing analysis pipeline) |
| `packages/core/src/soc/types.ts` | SOC config types |
| `docs/github-action/regenerate-soc.yml` | Reference GitHub Action workflow |

### Modified files
| File | Change |
|------|--------|
| `apps/api/src/lib/schema.ts` | Add `soc_configs` and `api_keys` tables |
| `apps/api/src/routes/godMode.ts` | Save SOC config after successful analysis |
| `apps/api/src/index.ts` | Register new routes (`socRoutes`, `apiKeyRoutes`) |
| `packages/core/src/index.ts` | Export new SOC types |
| `apps/web/src/pages/GodModePage.tsx` | Add "Save as SOC" option after generation |

---

## Implementation Order

```
1. Schema + migration (soc_configs, api_keys tables)
   └─ apps/api/src/lib/schema.ts
   └─ drizzle migration

2. Core types
   └─ packages/core/src/soc/types.ts

3. API key auth middleware
   └─ apps/api/src/lib/requireApiKey.ts

4. SOC CRUD routes
   └─ apps/api/src/routes/socs.ts

5. API key management routes
   └─ apps/api/src/routes/apiKeys.ts

6. Regeneration service
   └─ apps/api/src/services/socRegenerationService.ts

7. Regeneration endpoint (the core feature)
   └─ apps/api/src/routes/socs.ts (POST /:id/regenerate)

8. Modify GodMode to auto-save SOC config
   └─ apps/api/src/routes/godMode.ts

9. Register routes
   └─ apps/api/src/index.ts

10. GitHub Action workflow reference
    └─ docs/github-action/regenerate-soc.yml

11. Frontend: SOC & API key management UI
    └─ apps/web/src/pages/WorkspaceSettingsPage.tsx (or new)
```

---

## Open Questions / Decisions

1. **Sync vs async regeneration?** The analysis pipeline takes 30-60s. Options:
   - **Synchronous** (simpler): API blocks until done, Action uses long timeout.
     Risk: HTTP timeouts if analysis is slow.
   - **Async with polling** (recommended): Return 202 + regeneration ID, Action
     polls for completion. More robust but slightly more complex.

2. **Document versioning on regeneration?** When a SOC is regenerated:
   - **Overwrite in-place** (simpler): Update the document content directly.
     Previous content is lost.
   - **Version history** (better UX): Store previous versions so users can diff
     or rollback. Could be a future Phase 5.

3. **Notification on regeneration?** Should users get notified (in-app, email)
   when a SOC is regenerated by the Action? Useful but not required for v1.

4. **Multi-repo trigger?** If a SOC covers repos A, B, and C, and the Action is
   installed only on repo A, pushes to B and C won't trigger regeneration.
   Solutions:
   - Install the Action on all source repos (recommended for v1)
   - Use a scheduled cron as fallback
   - Future: GitHub organization-level webhook

5. **Rate limiting?** Should regeneration requests be rate-limited to prevent
   abuse? Probably yes — something like 1 regeneration per SOC per 5 minutes.

---

## Future Extensions

- **Diff-aware regeneration**: Only re-analyze what changed (uses `git diff`
  since last analysis) instead of full re-clone
- **Staleness detection**: Compare current analysis with previous one and only
  update the document if there are meaningful changes
- **PR comment integration**: Post a comment on the PR showing what changed
  in the SOC
- **Custom GitHub Action** (`uses: dardocs/regenerate-soc@v1`): Published
  marketplace action instead of raw curl commands
- **Webhook-based trigger**: Instead of polling, DarDocs sends a webhook back
  to GitHub to update check status
- **Multiple SOC types**: Extend beyond GodMode to other document generation
  templates
