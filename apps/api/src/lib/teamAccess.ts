import { db } from './db.js';
import { teams, teamMembers, workspaceMembers } from './schema.js';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Get the workspace membership for a user (role, etc).
 */
export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );
  return membership ?? null;
}

/**
 * Check if a user is a workspace admin or owner.
 */
export function isWorkspaceAdmin(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Get the team membership for a user in a specific team.
 */
export async function getTeamMembership(userId: string, teamId: string) {
  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      )
    );
  return membership ?? null;
}

/**
 * Get all team IDs a user is a member of within a workspace.
 */
export async function getUserTeamIds(userId: string, workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teams.workspaceId, workspaceId)
      )
    );
  return rows.map((r) => r.teamId);
}

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
): Promise<boolean> {
  const wsMembership = await getWorkspaceMembership(userId, doc.workspaceId);
  if (!wsMembership) return false;

  // Workspace admins/owners see everything
  if (isWorkspaceAdmin(wsMembership.role)) return true;

  // No team = workspace-level doc, visible to all members
  if (!doc.teamId) return true;

  // Check the team's visibility
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, doc.teamId));

  if (!team) return true; // team was deleted, doc is effectively workspace-level

  // Open teams are visible to all workspace members
  if (team.visibility === 'open') return true;

  // For closed/private teams, must be a team member
  const teamMembership = await getTeamMembership(userId, doc.teamId);
  return !!teamMembership;
}

/**
 * Determine if a user can edit a document (write access).
 * Requires canAccessDocument + not being a workspace viewer.
 */
export async function canEditDocument(
  userId: string,
  doc: { workspaceId: string; teamId: string | null }
): Promise<boolean> {
  const wsMembership = await getWorkspaceMembership(userId, doc.workspaceId);
  if (!wsMembership || wsMembership.role === 'viewer') return false;

  return canAccessDocument(userId, doc);
}
