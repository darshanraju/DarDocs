import { useCallback, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Table2, ExternalLink, Trash2, Link, RefreshCw } from 'lucide-react';

export function GoogleSheetEmbedComponent({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { url, sheetId, height } = node.attrs;
  const [showUrlInput, setShowUrlInput] = useState(!url);
  const [inputUrl, setInputUrl] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const embedUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?widget=true&headers=false`
    : '';

  const handleDelete = useCallback(() => {
    if (confirm('Remove this Google Sheet embed?')) {
      deleteNode();
    }
  }, [deleteNode]);

  const handleSubmitUrl = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputUrl.trim()) {
        const extractedId = inputUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || '';
        if (extractedId) {
          updateAttributes({ url: inputUrl, sheetId: extractedId });
          setShowUrlInput(false);
        }
      }
    },
    [inputUrl, updateAttributes]
  );

  // Resize handling
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
      const newHeight = Math.max(200, Math.min(800, startHeightRef.current + deltaY));
      updateAttributes({ height: newHeight });
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateAttributes]);

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`gsheet-embed-wrapper group ${selected ? 'ring-2 ring-blue-500' : ''}`}
      >
        {/* Header */}
        <div className="gsheet-embed-header">
          <div className="flex items-center gap-2">
            <div className="gsheet-embed-icon">
              <Table2 className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-medium text-gray-800">Google Sheet</div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {embedUrl && (
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Open in Google Sheets"
              >
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </a>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-red-50 rounded transition-colors"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        {showUrlInput || !sheetId ? (
          <form onSubmit={handleSubmitUrl} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Paste a Google Sheet URL</span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-3 py-2 text-sm bg-[#3370ff] text-white rounded-lg hover:bg-[#2860e0]"
              >
                Embed
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Make sure the spreadsheet is shared (at least &quot;Anyone with the link can view&quot;)
            </p>
          </form>
        ) : (
          <div style={{ height: `${height}px` }} className="relative">
            <iframe
              key={refreshKey}
              src={embedUrl}
              className="w-full h-full border-0"
              title="Google Sheet"
              sandbox="allow-scripts allow-same-origin"
            />

            {/* Resize handle */}
            <div
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-blue-100 transition-colors"
              onMouseDown={handleResizeStart}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
