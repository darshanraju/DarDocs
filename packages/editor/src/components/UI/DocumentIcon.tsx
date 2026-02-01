import { useState, useCallback } from 'react';
import { EmojiPicker } from './EmojiPicker';

interface DocumentIconProps {
  icon?: string;
  onIconChange: (icon: string | undefined) => void;
}

export function DocumentIcon({ icon, onIconChange }: DocumentIconProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelect = useCallback(
    (emoji: string) => {
      onIconChange(emoji);
      setShowPicker(false);
    },
    [onIconChange]
  );

  const handleRemove = useCallback(() => {
    onIconChange(undefined);
    setShowPicker(false);
  }, [onIconChange]);

  const handleClose = useCallback(() => {
    setShowPicker(false);
  }, []);

  return (
    <div className="document-icon-wrapper">
      {icon ? (
        <button
          className="document-icon-display"
          onClick={() => setShowPicker(!showPicker)}
          title="Change icon"
        >
          {icon}
        </button>
      ) : (
        <button
          className="document-icon-add"
          onClick={() => setShowPicker(!showPicker)}
        >
          Add icon
        </button>
      )}

      {showPicker && (
        <div className="document-icon-picker-container">
          <EmojiPicker
            onSelect={handleSelect}
            onRemove={handleRemove}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
