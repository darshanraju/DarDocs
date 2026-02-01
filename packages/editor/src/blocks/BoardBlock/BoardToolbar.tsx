import { Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { Button, Tooltip } from '../../ui';

interface BoardToolbarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onDelete: () => void;
}

export function BoardToolbar({ isFullscreen, onToggleFullscreen, onDelete }: BoardToolbarProps) {
  return (
    <div className="flex gap-1">
      <Tooltip content={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        <Button variant="ghost" size="sm" onClick={onToggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
      </Tooltip>
      <Tooltip content="Delete whiteboard">
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </Tooltip>
    </div>
  );
}
