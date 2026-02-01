import { useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  Delete01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { useGodModeStore } from '../../stores/godModeStore';
import type { RepoRole, TeamMember } from '@dardocs/core';
import { GOD_MODE_USE_MOCK_DATA } from '@dardocs/core';

interface GodModeTemplateProps {
  onComplete: (documentContent: import('@tiptap/react').JSONContent, title: string) => void;
  onCancel: () => void;
}

export function GodModeTemplate({ onComplete, onCancel }: GodModeTemplateProps) {
  const {
    config,
    isAnalyzing,
    progress,
    error,
    addRepo,
    removeRepo,
    updateRepo,
    addTeamMember,
    removeTeamMember,
    runAnalysis,
    reset,
  } = useGodModeStore();

  return (
    <div className="godmode-page">
      <div className="godmode-container">
        <div className="godmode-header">
          <div>
            <h1 className="godmode-title">God Mode</h1>
            <p className="godmode-subtitle">
              Auto-generate comprehensive system documentation from your repositories.
              {GOD_MODE_USE_MOCK_DATA && (
                <span className="godmode-mock-badge">MOCK DATA</span>
              )}
            </p>
          </div>
          <button className="godmode-cancel-btn" onClick={onCancel}>
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        {isAnalyzing ? (
          <AnalysisProgressView progress={progress} />
        ) : error ? (
          <ErrorView error={error} onRetry={runAnalysis} onReset={reset} />
        ) : (
          <ConfigurationForm
            config={config}
            onAddRepo={addRepo}
            onRemoveRepo={removeRepo}
            onUpdateRepo={updateRepo}
            onAddTeamMember={addTeamMember}
            onRemoveTeamMember={removeTeamMember}
            onBuild={async () => {
              const result = await runAnalysis();
              const { generateGodModeDocument } = await import('@dardocs/core');
              const content = generateGodModeDocument(result);
              const primaryRepo = config.repos.find((r) => r.role === 'primary');
              const title = `God Mode — ${primaryRepo?.repo || 'System Overview'}`;
              onComplete(content, title);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Configuration Form ───────────────────────────────────────

interface ConfigFormProps {
  config: import('@dardocs/core').GodModeConfig;
  onAddRepo: (url: string, role: RepoRole, description: string) => void;
  onRemoveRepo: (id: string) => void;
  onUpdateRepo: (id: string, updates: Partial<import('@dardocs/core').GodModeRepoConfig>) => void;
  onAddTeamMember: (repoId: string, member: TeamMember) => void;
  onRemoveTeamMember: (repoId: string, memberName: string) => void;
  onBuild: () => void;
}

function ConfigurationForm({
  config,
  onAddRepo,
  onRemoveRepo,
  onUpdateRepo,
  onAddTeamMember,
  onRemoveTeamMember,
  onBuild,
}: ConfigFormProps) {
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoRole, setNewRepoRole] = useState<RepoRole>('primary');
  const [newRepoDesc, setNewRepoDesc] = useState('');

  const hasPrimary = config.repos.some((r) => r.role === 'primary');

  const handleAddRepo = useCallback(() => {
    if (!newRepoUrl.trim()) return;
    onAddRepo(newRepoUrl, hasPrimary ? newRepoRole : 'primary', newRepoDesc);
    setNewRepoUrl('');
    setNewRepoDesc('');
    setNewRepoRole('secondary');
  }, [newRepoUrl, newRepoRole, newRepoDesc, hasPrimary, onAddRepo]);

  return (
    <div className="godmode-form">
      {/* Existing repos */}
      {config.repos.length > 0 && (
        <div className="godmode-repos">
          {config.repos.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              onRemove={() => onRemoveRepo(repo.id)}
              onUpdate={(updates) => onUpdateRepo(repo.id, updates)}
              onAddMember={(member) => onAddTeamMember(repo.id, member)}
              onRemoveMember={(name) => onRemoveTeamMember(repo.id, name)}
            />
          ))}
        </div>
      )}

      {/* Add repo form */}
      <div className="godmode-add-repo">
        <h3 className="godmode-section-title">
          {config.repos.length === 0 ? 'Add Primary Repository' : 'Add Repository'}
        </h3>
        <div className="godmode-input-group">
          <input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={newRepoUrl}
            onChange={(e) => setNewRepoUrl(e.target.value)}
            className="godmode-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
          />
          {hasPrimary && (
            <select
              value={newRepoRole}
              onChange={(e) => setNewRepoRole(e.target.value as RepoRole)}
              className="godmode-select"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          )}
        </div>
        <textarea
          placeholder="Brief description of what this repo does..."
          value={newRepoDesc}
          onChange={(e) => setNewRepoDesc(e.target.value)}
          className="godmode-textarea"
          rows={2}
        />
        <button
          className="godmode-add-btn"
          onClick={handleAddRepo}
          disabled={!newRepoUrl.trim()}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          Add repository
        </button>
      </div>

      {/* BUIDL button */}
      {config.repos.length > 0 && (
        <button className="godmode-buidl-btn" onClick={onBuild}>
          BUIDL
          <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
        </button>
      )}
    </div>
  );
}

// ─── Repo Card ────────────────────────────────────────────────

interface RepoCardProps {
  repo: import('@dardocs/core').GodModeRepoConfig;
  onRemove: () => void;
  onUpdate: (updates: Partial<import('@dardocs/core').GodModeRepoConfig>) => void;
  onAddMember: (member: TeamMember) => void;
  onRemoveMember: (name: string) => void;
}

function RepoCard({ repo, onRemove, onUpdate, onAddMember, onRemoveMember }: RepoCardProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<TeamMember['role']>('developer');

  const handleAddMember = () => {
    if (!memberName.trim()) return;
    onAddMember({ name: memberName.trim(), role: memberRole });
    setMemberName('');
    setShowAddMember(false);
  };

  return (
    <div className="godmode-repo-card">
      <div className="godmode-repo-card-header">
        <div className="godmode-repo-card-info">
          <span className={`godmode-role-badge godmode-role-${repo.role}`}>
            {repo.role}
          </span>
          <span className="godmode-repo-name">{repo.owner}/{repo.repo}</span>
        </div>
        <button className="godmode-icon-btn" onClick={onRemove} title="Remove">
          <HugeiconsIcon icon={Delete01Icon} size={16} />
        </button>
      </div>

      {/* Description */}
      <textarea
        className="godmode-textarea godmode-textarea-sm"
        value={repo.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="What does this repo do?"
        rows={2}
      />

      {/* Team members */}
      <div className="godmode-team">
        <div className="godmode-team-header">
          <span className="godmode-team-label">Team</span>
          <button
            className="godmode-text-btn"
            onClick={() => setShowAddMember(!showAddMember)}
          >
            + Add member
          </button>
        </div>

        {repo.teamMembers.length > 0 && (
          <div className="godmode-member-list">
            {repo.teamMembers.map((m) => (
              <div key={m.name} className="godmode-member">
                <span className={`godmode-member-role godmode-member-role-${m.role}`}>
                  {m.role}
                </span>
                <span className="godmode-member-name">{m.name}</span>
                <button
                  className="godmode-icon-btn-sm"
                  onClick={() => onRemoveMember(m.name)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddMember && (
          <div className="godmode-add-member">
            <input
              type="text"
              placeholder="Name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="godmode-input godmode-input-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
            />
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as TeamMember['role'])}
              className="godmode-select godmode-select-sm"
            >
              <option value="developer">Developer</option>
              <option value="pm">PM</option>
              <option value="designer">Designer</option>
              <option value="other">Other</option>
            </select>
            <button className="godmode-add-btn godmode-add-btn-sm" onClick={handleAddMember}>
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analysis Progress ────────────────────────────────────────

function AnalysisProgressView({ progress }: { progress: import('@dardocs/core').AnalysisProgress | null }) {
  if (!progress) return null;

  return (
    <div className="godmode-progress">
      <div className="godmode-progress-header">
        <span className="godmode-progress-phase">
          {phaseLabel(progress.phase)}
        </span>
        <span className="godmode-progress-percent">{progress.percent}%</span>
      </div>
      <div className="godmode-progress-bar">
        <div
          className="godmode-progress-fill"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="godmode-progress-message">{progress.message}</p>
    </div>
  );
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    'idle': 'Ready',
    'fetching-metadata': 'Phase 1: Metadata',
    'cloning': 'Phase 2: Cloning',
    'analyzing-structure': 'Analyzing Structure',
    'analyzing-contributors': 'Analyzing Contributors',
    'analyzing-connections': 'Detecting Connections',
    'analyzing-glossary': 'Building Glossary',
    'generating-document': 'Generating Document',
    'complete': 'Complete',
    'error': 'Error',
  };
  return labels[phase] || phase;
}

// ─── Error View ───────────────────────────────────────────────

function ErrorView({
  error,
  onRetry,
  onReset,
}: {
  error: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="godmode-error">
      <p className="godmode-error-message">{error}</p>
      <div className="godmode-error-actions">
        <button className="godmode-add-btn" onClick={onRetry}>
          Retry
        </button>
        <button className="godmode-text-btn" onClick={onReset}>
          Start over
        </button>
      </div>
    </div>
  );
}
