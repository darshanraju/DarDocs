import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, Maximize01Icon, Minimize01Icon } from '@hugeicons/core-free-icons';
import { Button, Tooltip } from '../../UI';

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
            <HugeiconsIcon icon={Minimize01Icon} size={16} />
          ) : (
            <HugeiconsIcon icon={Maximize01Icon} size={16} />
          )}
        </Button>
      </Tooltip>
      <Tooltip content="Delete whiteboard">
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <span className="text-red-500"><HugeiconsIcon icon={Delete01Icon} size={16} /></span>
        </Button>
      </Tooltip>
    </div>
  );
}
