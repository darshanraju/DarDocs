import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  File01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
  Delete01Icon,
  PencilEdit01Icon,
  FileAddIcon,
  ArrowLeft01Icon,
  SidebarLeft01Icon,
  Logout01Icon,
  UserGroupIcon,
  Setting07Icon,
} from '@hugeicons/core-free-icons';
import { Users, Lock, Globe, Eye, PlusCircle, Settings, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useWorkspaceConfigStore } from '../../stores/workspaceConfigStore';
import type { TreeNode } from '../../stores/workspaceStore';
import type { Team, TeamVisibility } from '../../lib/api';
import { useTeamStore } from '../../stores/teamStore';
import { useAuthStore } from '../../stores/authStore';
import { DarkModeToggle } from '../TableOfContents/DarkModeToggle';
import { SettingsModal } from '../Settings/SettingsModal';
import { ShareModal } from './ShareModal';
import { TeamModal } from './TeamModal';
import { TeamMembersModal } from './TeamMembersModal';
import { useNavigate, useParams } from 'react-router';

const VISIBILITY_ICONS = {
  open: Globe,
  closed: Eye,
  private: Lock,
};

export function Sidebar() {
  const {
    tree,
    teams,
    loading,
    activeDocId,
    workspaceId,
    loadTree,
    createDocument,
    deleteDocument,
    renameDocument,
    toggleExpanded,
    setActiveDocId,
  } = useWorkspaceStore();
  const { user, signOut } = useAuthStore();
  const { createTeam, updateTeam, deleteTeam, joinTeam } = useTeamStore();

  const { openSettings, loadConfig } = useWorkspaceConfigStore();

  const navigate = useNavigate();
  const params = useParams<{ docId: string }>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [membersTeam, setMembersTeam] = useState<Team | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [teamContextMenu, setTeamContextMenu] = useState<{
    team: Team;
    x: number;
    y: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTree();
    loadConfig();
  }, [loadTree, loadConfig]);

  // Sync activeDocId with route
  useEffect(() => {
    if (params.docId && params.docId !== activeDocId) {
      setActiveDocId(params.docId);
    }
  }, [params.docId, activeDocId, setActiveDocId]);

  // Group docs by teamId
  const { generalDocs, docsByTeam } = useMemo(() => {
    const general: TreeNode[] = [];
    const byTeam = new Map<string, TreeNode[]>();

    for (const node of tree) {
      if (!node.teamId) {
        general.push(node);
      } else {
        const existing = byTeam.get(node.teamId) || [];
        existing.push(node);
        byTeam.set(node.teamId, existing);
      }
    }

    return { generalDocs: general, docsByTeam: byTeam };
  }, [tree]);

  const handleCreateDocument = useCallback(
    async (parentId: string | null = null, teamId?: string | null) => {
      const doc = await createDocument('Untitled', parentId, teamId);
      setActiveDocId(doc.metadata.id);
      navigate(`/doc/${doc.metadata.id}`);
      setRenamingId(doc.metadata.id);
      setRenameValue('Untitled');
    },
    [createDocument, setActiveDocId, navigate]
  );

  const handleDocClick = useCallback(
    (id: string) => {
      setActiveDocId(id);
      navigate(`/doc/${id}`);
      setContextMenu(null);
    },
    [setActiveDocId, navigate]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ id, x: e.clientX, y: e.clientY });
      setTeamContextMenu(null);
    },
    []
  );

  const handleTeamContextMenu = useCallback(
    (e: React.MouseEvent, team: Team) => {
      e.preventDefault();
      e.stopPropagation();
      setTeamContextMenu({ team, x: e.clientX, y: e.clientY });
      setContextMenu(null);
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setContextMenu(null);
      await deleteDocument(id);
      if (activeDocId === id) {
        navigate('/');
      }
    },
    [deleteDocument, activeDocId, navigate]
  );

  const handleStartRename = useCallback(
    (id: string, currentTitle: string) => {
      setContextMenu(null);
      setRenamingId(id);
      setRenameValue(currentTitle);
    },
    []
  );

  const handleRenameSubmit = useCallback(
    async (id: string) => {
      if (renameValue.trim()) {
        await renameDocument(id, renameValue.trim());
      }
      setRenamingId(null);
    },
    [renameValue, renameDocument]
  );

  const handleCreateTeam = useCallback(
    async (data: { name: string; description: string; visibility: TeamVisibility }) => {
      if (!workspaceId) return;
      await createTeam(workspaceId, data.name, data.visibility);
      setShowTeamModal(false);
      loadTree();
    },
    [workspaceId, createTeam, loadTree]
  );

  const handleUpdateTeam = useCallback(
    async (data: { name: string; description: string; visibility: TeamVisibility }) => {
      if (!editingTeam) return;
      await updateTeam(editingTeam.id, data);
      setEditingTeam(null);
      loadTree();
    },
    [editingTeam, updateTeam, loadTree]
  );

  const handleDeleteTeam = useCallback(
    async (team: Team) => {
      if (!workspaceId) return;
      setTeamContextMenu(null);
      await deleteTeam(team.id, workspaceId);
      loadTree();
    },
    [workspaceId, deleteTeam, loadTree]
  );

  const handleJoinTeam = useCallback(
    async (team: Team) => {
      if (!workspaceId) return;
      setTeamContextMenu(null);
      await joinTeam(team.id, workspaceId);
      loadTree();
    },
    [workspaceId, joinTeam, loadTree]
  );

  const toggleTeamCollapse = useCallback((teamId: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Close context menus on click outside
  useEffect(() => {
    if (!contextMenu && !teamContextMenu) return;
    const handleClick = () => {
      setContextMenu(null);
      setTeamContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu, teamContextMenu]);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isActive = node.id === activeDocId;
    const hasChildren = node.children.length > 0;
    const isRenaming = renamingId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleDocClick(node.id)}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
        >
          <button
            className="sidebar-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
          >
            {hasChildren ? (
              node.isExpanded ? (
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              ) : (
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              )
            ) : (
              <span className="w-3.5 h-3.5" />
            )}
          </button>

          {node.icon ? (
            <span className="sidebar-item-icon">{node.icon}</span>
          ) : (
            <HugeiconsIcon icon={File01Icon} size={16} className="flex-shrink-0 text-[var(--color-text-muted)]" />
          )}

          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="sidebar-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameSubmit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(node.id);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="sidebar-item-title">{node.title || 'Untitled'}</span>
          )}

          <button
            className="sidebar-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, node.id);
            }}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
          </button>
        </div>

        {hasChildren && node.isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderTeamSection = (team: Team) => {
    const teamDocs = docsByTeam.get(team.id) || [];
    const isCollapsedTeam = collapsedTeams.has(team.id);
    const VisIcon = VISIBILITY_ICONS[team.visibility];

    return (
      <div key={team.id} className="sidebar-team-section">
        <div
          className="sidebar-team-header"
          onClick={() => toggleTeamCollapse(team.id)}
          onContextMenu={(e) => handleTeamContextMenu(e, team)}
        >
          <button
            className="sidebar-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleTeamCollapse(team.id);
            }}
          >
            {isCollapsedTeam ? (
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            ) : (
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
            )}
          </button>

          <span className="sidebar-team-icon">
            {team.icon || <Users size={14} />}
          </span>
          <span className="sidebar-team-name">{team.name}</span>
          <VisIcon size={12} className="sidebar-team-vis-icon" />

          <button
            className="sidebar-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleTeamContextMenu(e, team);
            }}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
          </button>

          <button
            className="sidebar-team-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateDocument(null, team.id);
            }}
            title="New page in team"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={12} />
          </button>
        </div>

        {!isCollapsedTeam && (
          <div className="sidebar-team-docs">
            {teamDocs.length === 0 ? (
              <div className="sidebar-empty" style={{ paddingLeft: '28px', fontSize: '11px' }}>
                No pages yet
              </div>
            ) : (
              teamDocs.map((node) => renderNode(node, 1))
            )}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button
          onClick={() => setIsCollapsed(false)}
          className="toc-toggle-btn"
          title="Show sidebar"
        >
          <HugeiconsIcon icon={SidebarLeft01Icon} size={20} />
        </button>
        <DarkModeToggle />
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">DarDocs</span>
        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <button
            onClick={() => setIsCollapsed(true)}
            className="toc-collapse-btn"
            title="Collapse sidebar"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          </button>
        </div>
      </div>

      <div className="sidebar-actions">
        <button
          className="sidebar-new-btn"
          onClick={() => handleCreateDocument(null)}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          <span>New page</span>
        </button>
        <button
          className="sidebar-settings-btn"
          onClick={openSettings}
          title="Workspace settings"
        >
          <HugeiconsIcon icon={Setting07Icon} size={16} />
        </button>
        <button
          className="sidebar-share-btn"
          onClick={() => setShowShareModal(true)}
          title="Share workspace"
        >
          <HugeiconsIcon icon={UserGroupIcon} size={16} />
        </button>
      </div>

      <div className="sidebar-templates">
        <div className="sidebar-templates-label">Templates</div>
        <button
          className="sidebar-template-btn"
          onClick={() => navigate('/templates/god-mode')}
        >
          <span className="sidebar-template-icon">🔮</span>
          <span>God Mode</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {loading ? (
          <div className="sidebar-empty">Loading...</div>
        ) : (
          <>
            {/* General (workspace-level) docs */}
            {generalDocs.length > 0 && (
              <div className="sidebar-general-section">
                <div className="sidebar-section-label">General</div>
                {generalDocs.map((node) => renderNode(node, 0))}
              </div>
            )}

            {/* Teams section */}
            <div className="sidebar-teams-container">
              <div className="sidebar-section-label">
                <span>Teams</span>
                <button
                  className="sidebar-team-create-btn"
                  onClick={() => setShowTeamModal(true)}
                  title="Create team"
                >
                  <PlusCircle size={14} />
                </button>
              </div>
              {teams.length === 0 ? (
                <div className="sidebar-empty" style={{ fontSize: '11px' }}>
                  No teams yet.{' '}
                  <button
                    className="sidebar-inline-link"
                    onClick={() => setShowTeamModal(true)}
                  >
                    Create one
                  </button>
                </div>
              ) : (
                teams.map((team) => renderTeamSection(team))
              )}
            </div>

            {generalDocs.length === 0 && teams.length === 0 && (
              <div className="sidebar-empty">
                No documents yet. Create one to get started.
              </div>
            )}
          </>
        )}
      </nav>

      <SettingsModal />

      {user && (
        <div className="sidebar-footer">
          <span className="sidebar-user-name" title={user.email}>
            {user.name}
          </span>
          <button
            className="sidebar-more-btn"
            style={{ opacity: 1 }}
            onClick={signOut}
            title="Sign out"
          >
            <HugeiconsIcon icon={Logout01Icon} size={14} />
          </button>
        </div>
      )}

      {/* Document context menu */}
      {contextMenu && (
        <div
          className="sidebar-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const node = findNodeById(tree, contextMenu.id);
              if (node) handleStartRename(node.id, node.title);
            }}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
            Rename
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              handleCreateDocument(contextMenu.id);
            }}
          >
            <HugeiconsIcon icon={FileAddIcon} size={14} />
            Add sub-page
          </button>
          <button
            className="sidebar-context-delete"
            onClick={() => handleDelete(contextMenu.id)}
          >
            <HugeiconsIcon icon={Delete01Icon} size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Team context menu */}
      {teamContextMenu && (
        <div
          className="sidebar-context-menu"
          style={{ top: teamContextMenu.y, left: teamContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {!teamContextMenu.team.isMember && teamContextMenu.team.visibility === 'open' && (
            <button onClick={() => handleJoinTeam(teamContextMenu.team)}>
              <Users size={14} />
              Join team
            </button>
          )}
          {(teamContextMenu.team.role === 'owner' || teamContextMenu.team.isMember) && (
            <button
              onClick={() => {
                setMembersTeam(teamContextMenu.team);
                setTeamContextMenu(null);
              }}
            >
              <Users size={14} />
              Manage members
            </button>
          )}
          {teamContextMenu.team.role === 'owner' && (
            <button
              onClick={() => {
                setEditingTeam(teamContextMenu.team);
                setTeamContextMenu(null);
              }}
            >
              <Settings size={14} />
              Edit team
            </button>
          )}
          {teamContextMenu.team.role === 'owner' && (
            <button
              className="sidebar-context-delete"
              onClick={() => handleDeleteTeam(teamContextMenu.team)}
            >
              <Trash2 size={14} />
              Delete team
            </button>
          )}
        </div>
      )}

      {showShareModal && (
        <ShareModal onClose={() => setShowShareModal(false)} />
      )}

      {showTeamModal && (
        <TeamModal
          onSave={handleCreateTeam}
          onClose={() => setShowTeamModal(false)}
        />
      )}

      {editingTeam && (
        <TeamModal
          team={editingTeam}
          onSave={handleUpdateTeam}
          onClose={() => setEditingTeam(null)}
        />
      )}

      {membersTeam && (
        <TeamMembersModal
          team={membersTeam}
          onClose={() => setMembersTeam(null)}
        />
      )}
    </div>
  );
}

function findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return undefined;
}
