import { useState } from 'react';
import { X } from 'lucide-react';
import type { Team, TeamVisibility } from '../../lib/api.js';

interface TeamModalProps {
  team?: Team | null;
  onSave: (data: { name: string; description: string; visibility: TeamVisibility }) => void;
  onClose: () => void;
}

export function TeamModal({ team, onSave, onClose }: TeamModalProps) {
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [visibility, setVisibility] = useState<TeamVisibility>(
    team?.visibility || 'open'
  );
  const [saving, setSaving] = useState(false);

  const isEdit = !!team;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      onSave({ name: name.trim(), description: description.trim(), visibility });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">
            {isEdit ? 'Edit team' : 'Create team'}
          </h2>
          <button className="share-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="team-modal-label">Name</label>
            <input
              className="share-invite-input"
              placeholder="e.g. Backend Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="team-modal-label">Description</label>
            <input
              className="share-invite-input"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="team-modal-label">Visibility</label>
            <div className="team-visibility-options">
              <label className={`team-visibility-option ${visibility === 'open' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="open"
                  checked={visibility === 'open'}
                  onChange={() => setVisibility('open')}
                />
                <div>
                  <strong>Open</strong>
                  <span>Anyone in the workspace can see and join</span>
                </div>
              </label>
              <label className={`team-visibility-option ${visibility === 'closed' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="closed"
                  checked={visibility === 'closed'}
                  onChange={() => setVisibility('closed')}
                />
                <div>
                  <strong>Closed</strong>
                  <span>Visible to all, but docs require membership</span>
                </div>
              </label>
              <label className={`team-visibility-option ${visibility === 'private' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                />
                <div>
                  <strong>Private</strong>
                  <span>Only members can see this team</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="share-invite-btn"
            style={{ alignSelf: 'flex-end', marginTop: '4px' }}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Create team'}
          </button>
        </form>
      </div>
    </div>
  );
}
