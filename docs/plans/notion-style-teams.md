# Plan: Notion-Style Teams (Teamspaces)

## Context

DarDocs currently has a flat workspace model: one workspace contains all documents, and every workspace member sees everything. With Okta SSO now in place (via BetterAuth's `genericOAuth` plugin), the next step is adding **Teams** inside a workspace so that content can be scoped to departments, squads, or project groups — following the Notion Teamspaces pattern.

### What exists today

| Layer | Table | Notes |
|-------|-------|-------|
| **Auth** | `users`, `sessions`, `accounts` | BetterAuth-managed. Okta via `genericOAuth` plugin. |
| **Workspace** | `workspaces` | `id`, `name`, `ownerId`. One per company. |
| **Membership** | `workspace_members` | `userId`, `workspaceId`, `role` (owner/admin/editor/viewer). |
| **Documents** | `documents` | `workspaceId`, `parentId`, `position`. All docs visible to all members. |
| **Comments** | `comments` | Scoped to document. |

**Key files:**

| File | Role |
|------|------|
| `apps/api/src/lib/schema.ts` | Drizzle schema (all tables) |
| `apps/api/src/routes/workspaces.ts` | Workspace CRUD |
| `apps/api/src/routes/members.ts` | Workspace member management |
| `apps/api/src/routes/documents.ts` | Document CRUD + tree |
| `packages/editor/src/lib/api.ts` | Frontend API client |
| `packages/editor/src/stores/workspaceStore.ts` | Zustand store — doc tree, CRUD, navigation |
| `packages/editor/src/components/Sidebar/Sidebar.tsx` | Left nav — renders doc tree recursively |
| `packages/editor/src/components/Sidebar/ShareModal.tsx` | Member invite/role management |
| `apps/api/src/lib/auth.ts` | BetterAuth config with Okta genericOAuth |

---

## Target Model

```
Workspace (company)
  ├── Team A (open)
  │     ├── Doc 1
  │     └── Doc 2
  ├── Team B (closed)
  │     └── Doc 3
  ├── Team C (private)
  │     └── Doc 4
  └── (General / unscoped)
        ├── Doc 5
        └── Doc 6
```

- A **Team** lives inside a workspace. It groups documents and members.
- Documents with `teamId = null` are **workspace-level** (visible to everyone, like Notion's "General" space).
- Teams have a **visibility** setting that controls discoverability and access.

### Team visibility (mirrors Notion)

| Visibility | Who can see it exists | Who can see its docs | How to join |
|------------|----------------------|---------------------|-------------|
| **open** | All workspace members | All workspace members | Self-join |
| **closed** | All workspace members | Team members only | Invited by team owner |
| **private** | Team members only | Team members only | Invited by team owner |

### Team roles

| Role | Permissions |
|------|------------|
| **owner** | Full control — manage members, change visibility, delete team, all doc operations |
| **member** | Create/edit/delete docs within the team |

Workspace-level roles still apply as a ceiling: a workspace `viewer` cannot edit docs even if they're a team `member`. A workspace `admin` or `owner` can see and manage all teams regardless of visibility.

---

## Phase 1 — Database Schema

### New tables

**`teams`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUID |
| `workspace_id` | `text` FK → `workspaces.id` | ON DELETE CASCADE |
| `name` | `text` NOT NULL | Display name |
| `description` | `text` | Optional description |
| `visibility` | `enum('open','closed','private')` | Default `open` |
| `icon` | `text` | Emoji or icon key |
| `created_by` | `text` FK → `users.id` | Creator |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

**`team_members`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUID |
| `team_id` | `text` FK → `teams.id` | ON DELETE CASCADE |
| `user_id` | `text` FK → `users.id` | ON DELETE CASCADE |
| `role` | `enum('owner','member')` | Default `member` |
| `created_at` | `timestamp` | |

### Modified tables

**`documents`** — add one column:

| Column | Type | Notes |
|--------|------|-------|
| `team_id` | `text` FK → `teams.id` NULLABLE | ON DELETE SET NULL. `null` = workspace-level (General). |

### Implementation

**File: `apps/api/src/lib/schema.ts`**

Add after the existing `workspaceRoleEnum`:

```ts
export const teamVisibilityEnum = pgEnum('team_visibility', [
  'open',
  'closed',
  'private',
]);

export const teamRoleEnum = pgEnum('team_role', ['owner', 'member']);

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  visibility: teamVisibilityEnum('visibility').notNull().default('open'),
  icon: text('icon'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

Add `teamId` to the existing `documents` table:

```ts
export const documents = pgTable('documents', {
  // ... existing columns ...
  teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
});
```

### Migration

Create a Drizzle migration that:
1. Creates the `team_visibility` and `team_role` enums
2. Creates the `teams` table
3. Creates the `team_members` table
4. Adds `team_id` column to `documents` (nullable, FK to `teams.id`, ON DELETE SET NULL)

All existing documents keep `team_id = null` (workspace-level). No data migration needed.

---

## Phase 2 — API Routes

### New route file: `apps/api/src/routes/teams.ts`

All routes require auth (`requireAuth` hook).

#### Team CRUD

**`GET /api/workspaces/:workspaceId/teams`** — List teams visible to the current user

Logic:
1. Assert workspace membership.
2. Query all teams in the workspace.
3. For each team, check visibility:
   - `open` → include (with member count)
   - `closed` → include name/description but mark `isMember: true/false`
   - `private` → only include if user is a team member, OR user is workspace admin/owner
4. Return array of team summaries.

Response shape:
```ts
{
  id: string;
  name: string;
  description: string | null;
  visibility: 'open' | 'closed' | 'private';
  icon: string | null;
  memberCount: number;
  isMember: boolean;
  role: 'owner' | 'member' | null; // null if not a member
}[]
```

**`POST /api/workspaces/:workspaceId/teams`** — Create a team

- Requires workspace role: owner, admin, or editor.
- Body: `{ name, description?, visibility?, icon? }`
- Auto-adds creator as team `owner` in `team_members`.
- Returns the created team.

**`PATCH /api/teams/:teamId`** — Update team metadata

- Requires team role: owner. Or workspace role: owner/admin.
- Body: `{ name?, description?, visibility?, icon? }`

**`DELETE /api/teams/:teamId`** — Delete a team

- Requires team role: owner. Or workspace role: owner/admin.
- Documents in the team get `team_id` set to `null` (become workspace-level). They are NOT deleted.

#### Team Membership

**`GET /api/teams/:teamId/members`** — List team members

- Requires: team member, or workspace admin/owner, or team is `open`/`closed`.

**`POST /api/teams/:teamId/members`** — Add a member

- For `open` teams: any workspace member can self-join (body: `{}` — adds the current user).
- For `closed`/`private` teams: requires team owner or workspace admin/owner. Body: `{ userId, role? }`.

**`PATCH /api/teams/:teamId/members/:memberId`** — Update member role

- Requires team owner or workspace admin/owner.
- Body: `{ role: 'owner' | 'member' }`

**`DELETE /api/teams/:teamId/members/:memberId`** — Remove member / leave team

- Any member can remove themselves (leave).
- Team owner or workspace admin/owner can remove others.
- Cannot remove the last team owner (must transfer ownership first).

#### Team-scoped documents

**`POST /api/teams/:teamId/join`** — Self-join an open team

- Shorthand for `POST /api/teams/:teamId/members` with current user.
- Only works for `open` visibility teams.

### Modified routes

**`GET /api/workspaces/:workspaceId/documents`** — Filter doc tree by team access

Current behavior: returns ALL docs in the workspace. New behavior:

1. Get all teams the user is a member of.
2. Get workspace role (admin/owner see everything).
3. Return documents where:
   - `team_id IS NULL` (workspace-level — always visible), OR
   - `team_id` is in a team the user belongs to, OR
   - `team_id` is in an `open` visibility team, OR
   - user is workspace admin/owner (sees all)

Add `teamId` to the response shape:
```ts
{
  id, parentId, position, title, teamId, createdAt, updatedAt
}
```

**`POST /api/workspaces/:workspaceId/documents`** — Accept optional `teamId`

Body gains: `{ title?, parentId?, teamId? }`

Validation: if `teamId` is provided, verify the user is a member of that team (or it's an open team, or user is workspace admin/owner).

**`PATCH /api/documents/:id`** — Allow moving doc to/from a team

Body gains: `{ ..., teamId?: string | null }`

Moving a document to a team requires membership in the target team. Moving a document out of a team (to workspace-level) requires membership in the source team.

### Registration

**File: `apps/api/src/index.ts`** (or wherever routes are registered)

```ts
import { teamRoutes } from './routes/teams.js';
// ...
app.register(teamRoutes);
```

---

## Phase 3 — Frontend API Client

**File: `packages/editor/src/lib/api.ts`**

Add new types and API methods:

```ts
// ─── Teams ───────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description: string | null;
  visibility: 'open' | 'closed' | 'private';
  icon: string | null;
  memberCount: number;
  isMember: boolean;
  role: 'owner' | 'member' | null;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: 'owner' | 'member';
  joinedAt: string;
}

export const teamsApi = {
  list: (workspaceId: string) =>
    request<Team[]>(`/api/workspaces/${workspaceId}/teams`),

  create: (workspaceId: string, data: {
    name: string;
    description?: string;
    visibility?: 'open' | 'closed' | 'private';
    icon?: string;
  }) =>
    request<Team>(`/api/workspaces/${workspaceId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (teamId: string, data: {
    name?: string;
    description?: string;
    visibility?: 'open' | 'closed' | 'private';
    icon?: string;
  }) =>
    request<Team>(`/api/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (teamId: string) =>
    request<void>(`/api/teams/${teamId}`, { method: 'DELETE' }),

  join: (teamId: string) =>
    request<TeamMember>(`/api/teams/${teamId}/join`, { method: 'POST' }),

  listMembers: (teamId: string) =>
    request<TeamMember[]>(`/api/teams/${teamId}/members`),

  addMember: (teamId: string, userId: string, role?: 'owner' | 'member') =>
    request<TeamMember>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  updateMemberRole: (teamId: string, memberId: string, role: 'owner' | 'member') =>
    request<{ ok: boolean }>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (teamId: string, memberId: string) =>
    request<void>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    }),
};
```

Also update `DocTreeItem` to include `teamId`:

```ts
export interface DocTreeItem {
  id: string;
  parentId: string;
  position: number;
  title: string;
  teamId: string | null;  // <-- add
  createdAt: string;
  updatedAt: string;
}
```

And update `documentsApi.create` to accept optional `teamId`:

```ts
create: (workspaceId: string, title: string, parentId: string | null, teamId?: string | null) =>
  request<DocFull>(`/api/workspaces/${workspaceId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ title, parentId, teamId }),
  }),
```

---

## Phase 4 — Team Store (Zustand)

**New file: `packages/editor/src/stores/teamStore.ts`**

```ts
import { create } from 'zustand';
import { teamsApi } from '../lib/api.js';
import type { Team, TeamMember } from '../lib/api.js';

interface TeamStore {
  teams: Team[];
  loading: boolean;
  activeTeamId: string | null; // null = "General" / workspace-level

  loadTeams: (workspaceId: string) => Promise<void>;
  createTeam: (workspaceId: string, name: string, visibility?: 'open' | 'closed' | 'private') => Promise<Team>;
  updateTeam: (teamId: string, data: { name?: string; description?: string; visibility?: 'open' | 'closed' | 'private' }) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  joinTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string, memberId: string) => Promise<void>;
  setActiveTeamId: (id: string | null) => void;
}
```

This store is loaded alongside `workspaceStore.loadTree()`. When `activeTeamId` changes, the sidebar filters the document tree to show only docs belonging to that team (or all workspace-level docs when `null`).

---

## Phase 5 — Sidebar UI Changes

**File: `packages/editor/src/components/Sidebar/Sidebar.tsx`**

### Current sidebar structure:

```
[Logo / Title]
[Share button]
[New document button]
[Settings button]
[Templates]
──────────────
[Document tree (flat — all docs)]
```

### New sidebar structure:

```
[Logo / Title]
[Share button]
[New document button]
[Settings button]
[Templates]
──────────────
General                    ← workspace-level docs (teamId = null)
  ├── Doc 5
  └── Doc 6

TEAMS                      ← section header
  [+ Create team]

  Backend Engineering  (open)  ← clickable team header
    ├── Doc 1
    └── Doc 2

  Platform Team  (closed) 🔒
    └── Doc 3
```

### Implementation details:

1. **Group documents by `teamId`** — When `workspaceStore.tree` is loaded, partition docs:
   - `teamId === null` → render under "General" section
   - `teamId === X` → render under Team X's collapsible section

2. **Team headers** — Each team renders as a collapsible section with:
   - Team icon + name
   - Visibility indicator (lock icon for closed/private)
   - "+" button to create a doc within that team
   - Context menu: manage members, edit team, leave team, delete team

3. **"Create team" button** — Opens a modal/inline form to create a new team.

4. **Team-scoped document creation** — When creating a doc within a team section, automatically set `teamId` on the document.

### New component: `TeamSection.tsx`

A reusable collapsible section that wraps a filtered subset of the document tree for one team. Props: `team: Team`, `documents: TreeNode[]`. Renders the team header and the recursive doc tree underneath it.

### New component: `TeamModal.tsx`

Modal for creating/editing a team. Fields: name, description, visibility selector, icon picker. Reuses the existing Modal component from `packages/editor/src/components/UI/Modal.tsx`.

### New component: `TeamMembersModal.tsx`

Modal for managing team membership. Similar to the existing `ShareModal.tsx` but scoped to a team. Shows current members, allows adding workspace members to the team, changing roles, removing members. For open teams, shows a "Join" button instead.

---

## Phase 6 — Workspace Store Changes

**File: `packages/editor/src/stores/workspaceStore.ts`**

### Modifications:

1. **`DocTreeNode`** — Add `teamId: string | null` field.

2. **`loadTree()`** — After loading flat nodes from API, also load teams via `teamsApi.list()`. Store both in state.

3. **`createDocument()`** — Accept optional `teamId` parameter. Pass to `documentsApi.create()`.

4. **New computed helper** — `getDocsByTeam(teamId: string | null): TreeNode[]` that filters the tree to only show docs belonging to a specific team. This is used by the sidebar to render each team section.

### Updated interface:

```ts
interface WorkspaceStore {
  // ... existing fields ...
  teams: Team[];

  loadTree: () => Promise<void>; // now also loads teams
  createDocument: (title: string, parentId: string | null, teamId?: string | null) => Promise<DarDocsDocument>;
  // ... rest unchanged ...
}
```

---

## Phase 7 — Document Access Control (Backend)

The most critical behavioral change. Every document read/write must now check team-level access.

### New helper: `apps/api/src/lib/teamAccess.ts`

```ts
/**
 * Determine if a user can access a document based on team membership and visibility.
 *
 * Returns true if:
 * - Document has no team (workspace-level) and user is a workspace member
 * - Document's team is "open" and user is a workspace member
 * - User is a member of the document's team
 * - User is a workspace admin or owner
 */
export async function canAccessDocument(
  userId: string,
  doc: { workspaceId: string; teamId: string | null }
): Promise<boolean>
```

This function is called in:
- `GET /api/documents/:id` — before returning the document
- `PATCH /api/documents/:id` — before allowing edits
- `DELETE /api/documents/:id` — before allowing deletion

The existing `assertWorkspaceAccess()` check remains but is supplemented with team-level checks.

---

## Phase 8 — SCIM Group Sync (Future)

Not in the initial build, but the schema supports it. The flow would be:

1. Add a `scim_group_id` column to the `teams` table.
2. Implement SCIM v2 endpoints: `GET/POST/PATCH /scim/v2/Groups`.
3. When Okta pushes a group, DarDocs creates or updates a team with matching `scim_group_id`.
4. When Okta pushes group membership changes, DarDocs syncs `team_members`.

This makes team creation automatic — Okta is the source of truth.

---

## Implementation Order

| Step | What | Files touched | Depends on |
|------|------|--------------|------------|
| **1** | Schema: add `teams`, `team_members` tables + `team_id` column on `documents` | `schema.ts`, new migration | — |
| **2** | API: team CRUD routes (`/api/workspaces/:wsId/teams`, `/api/teams/:id`) | new `routes/teams.ts`, `index.ts` | Step 1 |
| **3** | API: team membership routes (`/api/teams/:id/members`, `/api/teams/:id/join`) | `routes/teams.ts` | Step 1 |
| **4** | API: update document routes to handle `teamId` + access control | `routes/documents.ts`, new `lib/teamAccess.ts` | Step 1 |
| **5** | Frontend: API client — add `teamsApi`, update `DocTreeItem` | `lib/api.ts` | Step 2, 3 |
| **6** | Frontend: team store | new `stores/teamStore.ts` | Step 5 |
| **7** | Frontend: update workspace store — load teams, group docs by team | `stores/workspaceStore.ts` | Step 5, 6 |
| **8** | Frontend: sidebar — team sections, team headers, team-scoped doc creation | `Sidebar.tsx`, new `TeamSection.tsx` | Step 7 |
| **9** | Frontend: team management modals (create/edit team, manage members) | new `TeamModal.tsx`, `TeamMembersModal.tsx` | Step 5, 6 |
| **10** | Access control: wire `canAccessDocument()` into all document routes | `routes/documents.ts`, `lib/teamAccess.ts` | Step 4 |

---

## Risks & Decisions

### 1. Document tree query performance

The current document tree query is a simple `SELECT * FROM documents WHERE workspace_id = ?`. With team access filtering, this becomes a join against `team_members` and `teams`. For workspaces with many teams and documents, this could slow down.

**Mitigation:** The query can be done in two steps — first fetch the user's team IDs (small set), then filter documents with a `WHERE team_id IN (...)` clause. No complex joins needed.

### 2. Moving documents between teams

When a user drags a document from Team A to Team B in the sidebar, we need to update `team_id`. This requires membership in both the source and target teams.

**Decision:** Allow it if the user is a member of both teams, or if the user is a workspace admin/owner.

### 3. Child documents inherit team

When a document has `teamId = X`, should its child documents also belong to team X?

**Decision:** Yes. Creating a sub-page under a team-scoped document automatically sets the same `teamId`. Moving a parent document to a different team moves all descendants too.

### 4. What happens when a team is deleted

**Decision:** All documents in the team get `team_id = null` — they become workspace-level. They are not deleted. This is the least destructive option and matches Notion's behavior.

### 5. Workspace admins and private teams

**Decision:** Workspace owners and admins can always see and manage all teams, even private ones. This is necessary for governance and prevents "shadow" teams that no admin can audit.
