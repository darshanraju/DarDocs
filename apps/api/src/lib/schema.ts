import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Better Auth tables ──────────────────────────────────────
// Better Auth manages these; we declare them for Drizzle awareness

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Application tables ──────────────────────────────────────

export const workspaceRoleEnum = pgEnum('workspace_role', [
  'owner',
  'admin',
  'editor',
  'viewer',
]);

export const teamVisibilityEnum = pgEnum('team_visibility', [
  'open',
  'closed',
  'private',
]);

export const teamRoleEnum = pgEnum('team_role', ['owner', 'member']);

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: workspaceRoleEnum('role').notNull().default('editor'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Teams ───────────────────────────────────────────────────

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

// ─── Documents ───────────────────────────────────────────────

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
  parentId: text('parent_id'),
  position: integer('position').notNull().default(0),
  title: text('title').notNull().default('Untitled'),
  content: jsonb('content').default({}),
  boards: jsonb('boards').default({}),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull().default('inline'), // 'inline' | 'document'
  text: text('text').notNull().default(''),
  quotedText: text('quoted_text'),
  resolved: boolean('resolved').notNull().default(false),
  parentCommentId: text('parent_comment_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── GitHub App installations ────────────────────────────────

export const githubAppInstallations = pgTable('github_app_installations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  installationId: bigint('installation_id', { mode: 'number' }).notNull(),
  githubOrg: text('github_org').notNull(),
  installedBy: text('installed_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Repo clone tracking ─────────────────────────────────────

export const cloneStatusEnum = pgEnum('clone_status', [
  'pending',
  'cloning',
  'ready',
  'error',
  'evicted',
]);

export const repoClones = pgTable('repo_clones', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  repo: text('repo').notNull(),
  cloneUrl: text('clone_url').notNull(),
  diskPath: text('disk_path').notNull(),
  status: cloneStatusEnum('status').notNull().default('pending'),
  cloneDepth: integer('clone_depth').notNull().default(500),
  diskSizeBytes: bigint('disk_size_bytes', { mode: 'number' }),
  lastSyncedAt: timestamp('last_synced_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
