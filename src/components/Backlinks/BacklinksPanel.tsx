import { useMemo } from 'react';
import { ArrowUpRight, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useDocumentStore } from '../../stores/documentStore';

export function BacklinksPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { document } = useDocumentStore();
  const { getBacklinks } = useLibraryStore();

  const backlinks = useMemo(() => {
    if (!document?.metadata.id) return [];
    return getBacklinks(document.metadata.id);
  }, [document?.metadata.id, getBacklinks]);

  if (backlinks.length === 0) return null;

  return (
    <div className="backlinks-panel mt-8 border-t border-gray-100 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Link2 className="w-4 h-4" />
        <span className="font-medium">
          {backlinks.length} document{backlinks.length !== 1 ? 's' : ''} link here
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {backlinks.map((doc) => (
            <div
              key={doc.id}
              className="backlink-item flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
            >
              <ArrowUpRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0 group-hover:text-[#3370ff]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 group-hover:text-[#3370ff] truncate">
                  {doc.title || 'Untitled'}
                </div>
                {doc.textPreview && (
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                    {doc.textPreview}
                  </div>
                )}
                <div className="text-xs text-gray-300 mt-1">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
