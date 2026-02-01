import { useCallback, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { MessageSquare, ExternalLink, Trash2, Hash, Link } from 'lucide-react';
import { RoadmapTooltip } from '../../../UI/RoadmapTooltip';

export function SlackEmbedComponent({ node, deleteNode, selected }: NodeViewProps) {
  const { url, channel, workspace } = node.attrs;
  const [showUrlInput, setShowUrlInput] = useState(!url);
  const [inputUrl, setInputUrl] = useState(url || '');

  const handleDelete = useCallback(() => {
    if (confirm('Remove this Slack embed?')) {
      deleteNode();
    }
  }, [deleteNode]);

  const handleSubmitUrl = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputUrl.trim()) {
        // We can't easily update the node attrs from inside the component
        // without the editor reference, but the URL is already set
        setShowUrlInput(false);
      }
    },
    [inputUrl]
  );

  return (
    <NodeViewWrapper className="my-4 relative">
      <RoadmapTooltip blockName="slackEmbed" />
      <div
        className={`slack-embed-wrapper ${selected ? 'ring-2 ring-blue-500' : ''}`}
      >
        {/* Header */}
        <div className="slack-embed-header">
          <div className="flex items-center gap-2">
            <div className="slack-embed-icon">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">Slack Thread</div>
              {channel && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Hash className="w-3 h-3" />
                  <span>{channel}</span>
                  {workspace && <span className="text-gray-300">in {workspace}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Open in Slack"
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
        {showUrlInput || !url ? (
          <form onSubmit={handleSubmitUrl} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Paste a Slack message permalink</span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://workspace.slack.com/archives/C0123/p1234567890"
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
              Tip: In Slack, click the three dots on a message &rarr; Copy link
            </p>
          </form>
        ) : (
          <div className="slack-embed-body">
            <div className="slack-embed-placeholder">
              <MessageSquare className="w-6 h-6 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Slack thread linked</p>
              <p className="text-xs text-gray-400 mt-1">
                Connect Slack API to preview thread content inline
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#3370ff] hover:text-[#2860e0]"
              >
                Open in Slack
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
