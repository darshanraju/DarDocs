import { useDocumentStore } from '../../stores/documentStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { FileText, ArrowUpRight } from 'lucide-react';

export function BacklinksPanel() {
  const { document } = useDocumentStore();
  const { getBacklinks } = useLibraryStore();

  if (!document?.metadata?.id) return null;

  const backlinks = getBacklinks(document.metadata.id);

  if (backlinks.length === 0) return null;

  return (
    <div className="backlinks-panel mt-12 pt-6 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <ArrowUpRight className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-500">
          Referenced by ({backlinks.length})
        </h3>
      </div>

      <div className="space-y-2">
        {backlinks.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
          >
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
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
    </div>
  );
}
