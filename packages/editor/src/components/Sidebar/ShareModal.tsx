import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Crown, Shield, Edit3, Eye, Trash2 } from 'lucide-react';
import { membersApi } from '../../lib/api.js';
import type { WorkspaceMember } from '../../lib/api.js';
import { useWorkspaceStore } from '../../stores/workspaceStore.js';

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  editor: Edit3,
  viewer: Eye,
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

interface ShareModalProps {
  onClose: () => void;
}

export function ShareModal({ onClose }: ShareModalProps) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await membersApi.list(workspaceId);
      setMembers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!workspaceId || !email.trim()) return;
      setError(null);
      setInviting(true);
      try {
        await membersApi.invite(workspaceId, email.trim(), role);
        setEmail('');
        loadMembers();
      } catch (err: any) {
        setError(err?.message || 'Failed to invite');
      } finally {
        setInviting(false);
      }
    },
    [workspaceId, email, role, loadMembers]
  );

  const handleRoleChange = useCallback(
    async (memberId: string, newRole: string) => {
      if (!workspaceId) return;
      try {
        await membersApi.updateRole(workspaceId, memberId, newRole);
        loadMembers();
      } catch {
        // ignore
      }
    },
    [workspaceId, loadMembers]
  );

  const handleRemove = useCallback(
    async (memberId: string) => {
      if (!workspaceId) return;
      try {
        await membersApi.remove(workspaceId, memberId);
        loadMembers();
      } catch {
        // ignore
      }
    },
    [workspaceId, loadMembers]
  );

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">Share workspace</h2>
          <button className="share-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="share-invite-form" onSubmit={handleInvite}>
          <input
            type="email"
            className="share-invite-input"
            placeholder="Invite by email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            className="share-role-select"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'editor' | 'viewer' | 'admin')
            }
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="share-invite-btn"
            disabled={inviting || !email.trim()}
          >
            <UserPlus size={16} />
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>

        {error && <p className="share-error">{error}</p>}

        <div className="share-members-list">
          {loading ? (
            <div className="share-members-loading">Loading members...</div>
          ) : (
            members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role] || Eye;
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
                    {member.role === 'owner' ? (
                      <span className="share-role-badge">
                        <RoleIcon size={14} />
                        {ROLE_LABELS[member.role]}
                      </span>
                    ) : (
                      <>
                        <select
                          className="share-role-select-small"
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value)
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          className="share-remove-btn"
                          onClick={() => handleRemove(member.id)}
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
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
