import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Crown, User, Trash2 } from 'lucide-react';
import { teamsApi, membersApi } from '../../lib/api.js';
import type { TeamMember, WorkspaceMember, Team } from '../../lib/api.js';
import { useWorkspaceStore } from '../../stores/workspaceStore.js';

interface TeamMembersModalProps {
  team: Team;
  onClose: () => void;
}

export function TeamMembersModal({ team, onClose }: TeamMembersModalProps) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const [tm, wm] = await Promise.all([
        teamsApi.listMembers(team.id),
        workspaceId ? membersApi.list(workspaceId) : Promise.resolve([]),
      ]);
      setTeamMembers(tm);
      setWsMembers(wm);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [team.id, workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const teamMemberUserIds = new Set(teamMembers.map((m) => m.userId));
  const availableMembers = wsMembers.filter(
    (m) => !teamMemberUserIds.has(m.userId)
  );

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUserId) return;
      setError(null);
      setAdding(true);
      try {
        await teamsApi.addMember(team.id, selectedUserId);
        setSelectedUserId('');
        loadMembers();
      } catch (err: any) {
        setError(err?.message || 'Failed to add member');
      } finally {
        setAdding(false);
      }
    },
    [team.id, selectedUserId, loadMembers]
  );

  const handleRoleChange = useCallback(
    async (memberId: string, role: 'owner' | 'member') => {
      try {
        await teamsApi.updateMemberRole(team.id, memberId, role);
        loadMembers();
      } catch {
        // ignore
      }
    },
    [team.id, loadMembers]
  );

  const handleRemove = useCallback(
    async (memberId: string) => {
      try {
        await teamsApi.removeMember(team.id, memberId);
        loadMembers();
      } catch (err: any) {
        setError(err?.message || 'Failed to remove member');
      }
    },
    [team.id, loadMembers]
  );

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">
            {team.name} — Members
          </h2>
          <button className="share-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {availableMembers.length > 0 && (
          <form className="share-invite-form" onSubmit={handleAdd}>
            <select
              className="share-invite-input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Add a workspace member...</option>
              {availableMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="share-invite-btn"
              disabled={adding || !selectedUserId}
            >
              <UserPlus size={16} />
              {adding ? 'Adding...' : 'Add'}
            </button>
          </form>
        )}

        {error && <p className="share-error">{error}</p>}

        <div className="share-members-list">
          {loading ? (
            <div className="share-members-loading">Loading members...</div>
          ) : teamMembers.length === 0 ? (
            <div className="share-members-loading">No members yet</div>
          ) : (
            teamMembers.map((member) => {
              const RoleIcon = member.role === 'owner' ? Crown : User;
              return (
                <div key={member.id} className="share-member-row">
                  <div className="share-member-info">
                    <div className="share-member-avatar">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="share-member-details">
                      <span className="share-member-name">{member.name}</span>
                      <span className="share-member-email">{member.email}</span>
                    </div>
                  </div>
                  <div className="share-member-actions">
                    <select
                      className="share-role-select-small"
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as 'owner' | 'member'
                        )
                      }
                    >
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      className="share-remove-btn"
                      onClick={() => handleRemove(member.id)}
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
