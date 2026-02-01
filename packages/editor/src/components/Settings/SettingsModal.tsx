import { useState, useCallback } from 'react';
import {
  X,
  GitBranch,
  Activity,
  Bot,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useWorkspaceConfigStore } from '../../stores/workspaceConfigStore';
import { AutoUpdateSettings } from './AutoUpdateSettings';
import type {
  GrafanaCredentials,
  SentryCredentials,
  DatadogCredentials,
  PagerDutyCredentials,
  AIConfig,
} from '@dardocs/core';

type Tab = 'repos' | 'providers' | 'ai' | 'auto-update';

export function SettingsModal() {
  const { config, settingsOpen, closeSettings } = useWorkspaceConfigStore();
  const [activeTab, setActiveTab] = useState<Tab>('repos');

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={closeSettings}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Workspace Settings</h2>
          <button onClick={closeSettings} className="settings-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'repos' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('repos')}
          >
            <GitBranch className="w-4 h-4" />
            Repositories
          </button>
          <button
            className={`settings-tab ${activeTab === 'providers' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            <Activity className="w-4 h-4" />
            Providers
          </button>
          <button
            className={`settings-tab ${activeTab === 'ai' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot className="w-4 h-4" />
            AI
          </button>
          <button
            className={`settings-tab ${activeTab === 'auto-update' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('auto-update')}
          >
            <RefreshCw className="w-4 h-4" />
            Auto-Update
            <span className="settings-tab-badge">Soon</span>
          </button>
        </div>

        <div className="settings-body">
          {activeTab === 'repos' && <RepoSettings />}
          {activeTab === 'providers' && <ProviderSettings />}
          {activeTab === 'ai' && <AISettings />}
          {activeTab === 'auto-update' && <AutoUpdateSettings />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Repositories tab                                                    */
/* ------------------------------------------------------------------ */

function RepoSettings() {
  const { config, addRepo, removeRepo, updateRepoToken } = useWorkspaceConfigStore();
  const [newUrl, setNewUrl] = useState('');
  const [newToken, setNewToken] = useState('');
  const [error, setError] = useState('');

  const handleAdd = useCallback(async () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    if (!trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+)/)) {
      setError('Enter a valid GitHub repository URL');
      return;
    }

    if (config.repos.some((r) => r.url === trimmed)) {
      setError('This repository is already added');
      return;
    }

    await addRepo(trimmed, newToken.trim() || undefined);
    setNewUrl('');
    setNewToken('');
    setError('');
  }, [newUrl, newToken, config.repos, addRepo]);

  return (
    <div className="settings-section">
      <div className="settings-section-desc">
        Connect GitHub repositories so the monitor can discover metrics from your codebase.
      </div>

      <div className="settings-form-group">
        <label className="settings-label">Repository URL</label>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => { setNewUrl(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="https://github.com/org/repo"
          className="settings-input"
        />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">
          Access Token <span className="settings-label-hint">(optional, for private repos)</span>
        </label>
        <PasswordInput
          value={newToken}
          onChange={setNewToken}
          placeholder="ghp_..."
        />
      </div>
      {error && <div className="settings-error">{error}</div>}
      <button onClick={handleAdd} className="settings-add-btn">
        <Plus className="w-4 h-4" />
        Add Repository
      </button>

      {config.repos.length > 0 && (
        <div className="settings-list">
          {config.repos.map((repo) => (
            <div key={repo.id} className="settings-list-item">
              <div className="settings-list-item-info">
                <span className="settings-list-item-name">
                  {repo.owner}/{repo.repo}
                </span>
                <span className="settings-list-item-meta">
                  {repo.token ? 'Authenticated' : 'Public only'}
                </span>
              </div>
              <button
                onClick={() => removeRepo(repo.id)}
                className="settings-list-item-delete"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Providers tab                                                       */
/* ------------------------------------------------------------------ */

function ProviderSettings() {
  return (
    <div className="settings-section">
      <div className="settings-section-desc">
        Configure credentials for monitoring providers. These are stored locally in your browser.
      </div>
      <GrafanaSettings />
      <SentrySettings />
      <DatadogSettings />
      <PagerDutySettings />
    </div>
  );
}

function GrafanaSettings() {
  const { config, updateProviderCredentials, clearProviderCredentials } = useWorkspaceConfigStore();
  const existing = config.providers.grafana;
  const [url, setUrl] = useState(existing?.url || '');
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [dsUid, setDsUid] = useState(existing?.defaultDataSourceUid || '');
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!url.trim() || !apiKey.trim()) return;
    const creds: GrafanaCredentials = {
      url: url.trim().replace(/\/$/, ''),
      apiKey: apiKey.trim(),
      defaultDataSourceUid: dsUid.trim() || undefined,
    };
    await updateProviderCredentials('grafana', creds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [url, apiKey, dsUid, updateProviderCredentials]);

  return (
    <ProviderCard
      name="Grafana"
      color="#f46800"
      isConfigured={!!existing}
      onClear={() => clearProviderCredentials('grafana')}
    >
      <div className="settings-form-group">
        <label className="settings-label">Instance URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://grafana.mycompany.com"
          className="settings-input"
        />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">API Key / Service Account Token</label>
        <PasswordInput value={apiKey} onChange={setApiKey} placeholder="glsa_..." />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">
          Default Data Source UID <span className="settings-label-hint">(optional)</span>
        </label>
        <input
          value={dsUid}
          onChange={(e) => setDsUid(e.target.value)}
          placeholder="prometheus-uid"
          className="settings-input"
        />
      </div>
      <button onClick={handleSave} className="settings-save-btn">
        {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save'}
      </button>
    </ProviderCard>
  );
}

function SentrySettings() {
  const { config, updateProviderCredentials, clearProviderCredentials } = useWorkspaceConfigStore();
  const existing = config.providers.sentry;
  const [url, setUrl] = useState(existing?.url || 'https://sentry.io');
  const [authToken, setAuthToken] = useState(existing?.authToken || '');
  const [org, setOrg] = useState(existing?.org || '');
  const [project, setProject] = useState(existing?.project || '');
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!authToken.trim() || !org.trim()) return;
    const creds: SentryCredentials = {
      url: url.trim().replace(/\/$/, ''),
      authToken: authToken.trim(),
      org: org.trim(),
      project: project.trim() || undefined,
    };
    await updateProviderCredentials('sentry', creds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [url, authToken, org, project, updateProviderCredentials]);

  return (
    <ProviderCard
      name="Sentry"
      color="#362d59"
      isConfigured={!!existing}
      onClear={() => clearProviderCredentials('sentry')}
    >
      <div className="settings-form-group">
        <label className="settings-label">Sentry URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="settings-input" />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">Auth Token</label>
        <PasswordInput value={authToken} onChange={setAuthToken} placeholder="sntrys_..." />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">Organization Slug</label>
        <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="my-org" className="settings-input" />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">
          Project <span className="settings-label-hint">(optional)</span>
        </label>
        <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="my-project" className="settings-input" />
      </div>
      <button onClick={handleSave} className="settings-save-btn">
        {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save'}
      </button>
    </ProviderCard>
  );
}

function DatadogSettings() {
  const { config, updateProviderCredentials, clearProviderCredentials } = useWorkspaceConfigStore();
  const existing = config.providers.datadog;
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [appKey, setAppKey] = useState(existing?.appKey || '');
  const [site, setSite] = useState(existing?.site || 'datadoghq.com');
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim() || !appKey.trim()) return;
    const creds: DatadogCredentials = {
      apiKey: apiKey.trim(),
      appKey: appKey.trim(),
      site: site.trim() || undefined,
    };
    await updateProviderCredentials('datadog', creds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [apiKey, appKey, site, updateProviderCredentials]);

  return (
    <ProviderCard
      name="Datadog"
      color="#632ca6"
      isConfigured={!!existing}
      onClear={() => clearProviderCredentials('datadog')}
    >
      <div className="settings-form-group">
        <label className="settings-label">API Key</label>
        <PasswordInput value={apiKey} onChange={setApiKey} placeholder="dd-api-..." />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">Application Key</label>
        <PasswordInput value={appKey} onChange={setAppKey} placeholder="dd-app-..." />
      </div>
      <div className="settings-form-group">
        <label className="settings-label">Site</label>
        <input value={site} onChange={(e) => setSite(e.target.value)} className="settings-input" />
      </div>
      <button onClick={handleSave} className="settings-save-btn">
        {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save'}
      </button>
    </ProviderCard>
  );
}

function PagerDutySettings() {
  const { config, updateProviderCredentials, clearProviderCredentials } = useWorkspaceConfigStore();
  const existing = config.providers.pagerduty;
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) return;
    const creds: PagerDutyCredentials = { apiKey: apiKey.trim() };
    await updateProviderCredentials('pagerduty', creds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [apiKey, updateProviderCredentials]);

  return (
    <ProviderCard
      name="PagerDuty"
      color="#06ac38"
      isConfigured={!!existing}
      onClear={() => clearProviderCredentials('pagerduty')}
    >
      <div className="settings-form-group">
        <label className="settings-label">API Key</label>
        <PasswordInput value={apiKey} onChange={setApiKey} placeholder="u+..." />
      </div>
      <button onClick={handleSave} className="settings-save-btn">
        {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save'}
      </button>
    </ProviderCard>
  );
}

/* ------------------------------------------------------------------ */
/*  AI tab                                                              */
/* ------------------------------------------------------------------ */

function AISettings() {
  const { config, updateAIConfig, clearAIConfig } = useWorkspaceConfigStore();
  const existing = config.ai;
  const [provider, setProvider] = useState<AIConfig['provider']>(existing?.provider || 'anthropic');
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [model, setModel] = useState(existing?.model || '');
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) return;
    await updateAIConfig({
      provider,
      apiKey: apiKey.trim(),
      model: model.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [provider, apiKey, model, updateAIConfig]);

  return (
    <div className="settings-section">
      <div className="settings-section-desc">
        Configure an AI provider to enable natural language dashboard creation.
        Your API key is stored locally in your browser.
      </div>

      <div className="settings-form-group">
        <label className="settings-label">Provider</label>
        <div className="settings-radio-group">
          <label className={`settings-radio ${provider === 'anthropic' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="ai-provider"
              value="anthropic"
              checked={provider === 'anthropic'}
              onChange={() => setProvider('anthropic')}
            />
            Anthropic
          </label>
          <label className={`settings-radio ${provider === 'openai' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="ai-provider"
              value="openai"
              checked={provider === 'openai'}
              onChange={() => setProvider('openai')}
            />
            OpenAI
          </label>
        </div>
      </div>

      <div className="settings-form-group">
        <label className="settings-label">API Key</label>
        <PasswordInput
          value={apiKey}
          onChange={setApiKey}
          placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
        />
      </div>

      <div className="settings-form-group">
        <label className="settings-label">
          Model <span className="settings-label-hint">(optional, uses default if blank)</span>
        </label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
          className="settings-input"
        />
      </div>

      <div className="settings-actions-row">
        <button onClick={handleSave} className="settings-save-btn">
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save'}
        </button>
        {existing && (
          <button onClick={clearAIConfig} className="settings-clear-btn">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                   */
/* ------------------------------------------------------------------ */

function ProviderCard({
  name,
  color,
  isConfigured,
  onClear,
  children,
}: {
  name: string;
  color: string;
  isConfigured: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="settings-provider-card">
      <button className="settings-provider-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="settings-provider-card-left">
          <span className="settings-provider-dot" style={{ background: color }} />
          <span className="settings-provider-card-name">{name}</span>
          {isConfigured && <span className="settings-provider-configured-badge">Configured</span>}
        </div>
        <span className={`settings-chevron ${expanded ? 'is-expanded' : ''}`}>&#9656;</span>
      </button>
      {expanded && (
        <div className="settings-provider-card-body">
          {children}
          {isConfigured && (
            <button onClick={onClear} className="settings-clear-btn">
              Clear credentials
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="settings-password-wrapper">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="settings-input settings-password-input"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="settings-password-toggle"
        title={visible ? 'Hide' : 'Show'}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
