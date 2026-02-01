import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Share01Icon, Delete01Icon, Drag01Icon, Link01Icon } from '@hugeicons/core-free-icons';
import { EMBED_CONFIGS, parseGitHubUrl, parseGistUrl } from './embedUtils';
import type { EmbedType, GitHubUrlInfo } from './embedUtils';

export function EmbedBlockComponent({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { embedType, url } = node.attrs as { embedType: EmbedType; url: string | null };
  const config = EMBED_CONFIGS[embedType];
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!url && inputRef.current) {
      inputRef.current.focus();
    }
  }, [url]);

  const handleSubmit = useCallback(() => {
    const trimmedUrl = inputUrl.trim();
    if (!trimmedUrl) return;

    if (!config.urlPattern.test(trimmedUrl)) {
      setError(`Please enter a valid ${config.label} URL`);
      return;
    }

    setError('');
    updateAttributes({ url: trimmedUrl });
  }, [inputUrl, config, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        deleteNode();
      }
    },
    [handleSubmit, deleteNode]
  );

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  // URL input state
  if (!url) {
    return (
      <NodeViewWrapper className="my-4">
        <div className={`embed-input-wrapper ${selected ? 'is-selected' : ''}`}>
          <div className="embed-input-header">
            <span className="embed-input-label" style={{ color: config.iconColor }}>
              {config.label}
            </span>
          </div>
          <div className="embed-input-body">
            <div className="embed-input-row">
              <HugeiconsIcon icon={Link01Icon} size={16} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="url"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder={config.placeholder}
                className="embed-url-input"
              />
              <button onClick={handleSubmit} className="embed-submit-btn">
                Embed
              </button>
            </div>
            {error && <div className="embed-input-error">{error}</div>}
            <div className="embed-input-hint">Paste a URL and press Enter · Escape to cancel</div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const renderEmbed = () => {
    switch (config.renderMode) {
      case 'iframe':
        return <IframeEmbed url={url} config={config} />;
      case 'github-card':
        return <GitHubCardEmbed url={url} />;
      case 'gist':
        return <GistEmbed url={url} />;
      case 'swagger':
        return <SwaggerEmbed url={url} config={config} />;
      default:
        return null;
    }
  };

  return (
    <NodeViewWrapper className="my-4">
      <div className={`embed-block-wrapper ${selected ? 'is-selected' : ''}`}>
        {/* Drag handle */}
        <div className="embed-drag-handle" data-drag-handle>
          <HugeiconsIcon icon={Drag01Icon} size={16} className="text-gray-400" />
        </div>

        {/* Header bar */}
        <div className="embed-block-header">
          <span className="embed-block-label" style={{ color: config.iconColor }}>
            {config.label}
          </span>
          <div className="embed-block-actions">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="embed-action-btn"
              title={`Open in ${config.label}`}
            >
              <HugeiconsIcon icon={Share01Icon} size={14} />
              <span>Open</span>
            </a>
            <button
              onClick={handleDelete}
              className="embed-action-btn embed-action-delete"
              title="Remove embed"
            >
              <HugeiconsIcon icon={Delete01Icon} size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {renderEmbed()}
      </div>
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Iframe-based embed (Figma, Google Sheets, Grafana)                */
/* ------------------------------------------------------------------ */

function IframeEmbed({
  url,
  config,
}: {
  url: string;
  config: (typeof EMBED_CONFIGS)[EmbedType];
}) {
  const embedUrl = config.getEmbedUrl(url);
  const [height, setHeight] = useState(config.defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
    },
    [height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      setHeight(Math.max(200, Math.min(800, startHeightRef.current + deltaY)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="embed-iframe-container">
      <iframe
        src={embedUrl}
        className="embed-iframe"
        style={{ height: `${height}px` }}
        allowFullScreen
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      <div className="embed-resize-handle" onMouseDown={handleResizeStart} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GitHub card embed                                                  */
/* ------------------------------------------------------------------ */

function GitHubCardEmbed({ url }: { url: string }) {
  const [info, setInfo] = useState<GitHubUrlInfo | null>(null);
  const [apiData, setApiData] = useState<{
    title?: string;
    state?: string;
    labels?: string[];
    user?: string;
  } | null>(null);

  useEffect(() => {
    const parsed = parseGitHubUrl(url);
    setInfo(parsed);

    if (parsed && parsed.type !== 'repo' && parsed.number) {
      const apiType = parsed.type === 'pull' ? 'pulls' : 'issues';
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/${apiType}/${parsed.number}`
      )
        .then((res) => {
          if (!res.ok) throw new Error('API fetch failed');
          return res.json();
        })
        .then((data) => {
          setApiData({
            title: data.title,
            state: data.state,
            labels: data.labels?.map((l: { name: string }) => l.name) || [],
            user: data.user?.login,
          });
        })
        .catch(() => {
          /* silently fail — card still works with URL info */
        });
    }
  }, [url]);

  if (!info) {
    return <div className="embed-error">Invalid GitHub URL</div>;
  }

  const typeLabel =
    info.type === 'pull'
      ? 'Pull Request'
      : info.type === 'issue'
        ? 'Issue'
        : info.type === 'discussion'
          ? 'Discussion'
          : 'Repository';

  const stateColor =
    apiData?.state === 'open'
      ? '#22c55e'
      : apiData?.state === 'closed'
        ? '#ef4444'
        : apiData?.state === 'merged'
          ? '#8b5cf6'
          : '#6b7280';

  return (
    <div className="github-card">
      <div className="github-card-repo">
        {info.owner}/{info.repo}
      </div>
      {apiData?.title && <div className="github-card-title">{apiData.title}</div>}
      <div className="github-card-meta">
        <span className="github-card-type">{typeLabel}</span>
        {info.number && <span className="github-card-number">#{info.number}</span>}
        {apiData?.state && (
          <span className="github-card-state" style={{ color: stateColor }}>
            {apiData.state}
          </span>
        )}
      </div>
      {apiData?.labels && apiData.labels.length > 0 && (
        <div className="github-card-labels">
          {apiData.labels.map((label) => (
            <span key={label} className="github-card-label">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GitHub Gist embed                                                  */
/* ------------------------------------------------------------------ */

function SwaggerEmbed({
  url,
  config,
}: {
  url: string;
  config: (typeof EMBED_CONFIGS)[EmbedType];
}) {
  const [height, setHeight] = useState(config.defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Create a blob URL containing a self-contained Swagger UI page.
  // Blob URLs behave like normal pages — no X-Frame-Options or sandbox issues.
  useEffect(() => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html, body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: ${JSON.stringify(url)},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: -1
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const objectUrl = URL.createObjectURL(blob);
    setBlobUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [url]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = height;
    },
    [height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      setHeight(Math.max(200, Math.min(1200, startHeightRef.current + deltaY)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!blobUrl) return null;

  return (
    <div className="embed-iframe-container">
      <iframe
        src={blobUrl}
        className="embed-iframe"
        style={{ height: `${height}px` }}
      />
      <div className="embed-resize-handle" onMouseDown={handleResizeStart} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GitHub Gist embed                                                  */
/* ------------------------------------------------------------------ */

function GistEmbed({ url }: { url: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);
  const gist = parseGistUrl(url);

  useEffect(() => {
    if (!gist || !iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <base target="_blank">
  <style>
    body { margin: 0; font-family: -apple-system, sans-serif; }
    .gist .gist-file { border: none !important; margin-bottom: 0 !important; }
    .gist .gist-data { border-bottom: none !important; }
  </style>
</head>
<body>
  <script src="https://gist.github.com/${gist.user}/${gist.gistId}.js"><\/script>
  <script>
    function notifyHeight() {
      var h = document.body.scrollHeight;
      window.parent.postMessage({ type: 'gist-height', gistId: '${gist.gistId}', height: h }, '*');
    }
    setTimeout(notifyHeight, 1000);
    setTimeout(notifyHeight, 2500);
  <\/script>
</body>
</html>`);
    doc.close();
  }, [gist?.user, gist?.gistId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.data?.type === 'gist-height' &&
        e.data?.gistId === gist?.gistId &&
        typeof e.data.height === 'number'
      ) {
        setHeight(Math.max(100, Math.min(800, e.data.height + 16)));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [gist?.gistId]);

  if (!gist) {
    return <div className="embed-error">Invalid GitHub Gist URL</div>;
  }

  return (
    <div className="embed-gist-container">
      <iframe
        ref={iframeRef}
        className="embed-gist-iframe"
        style={{ height: `${height}px` }}
        sandbox="allow-scripts allow-popups allow-same-origin"
      />
    </div>
  );
}
