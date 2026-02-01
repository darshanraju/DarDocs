import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextStrikethroughIcon,
  Link01Icon,
  SourceCodeIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  CommentAdd01Icon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextAlignJustifyCenterIcon,
} from '@hugeicons/core-free-icons';
import { useCommentStore } from '../../stores/commentStore';

interface FloatingToolbarProps {
  editor: Editor | null;
}

type HeadingLevel = 0 | 1 | 2 | 3;
const HEADING_LABELS: Record<HeadingLevel, string> = {
  0: 'T',
  1: 'H1',
  2: 'H2',
  3: 'H3',
};

const COLOR_PRESETS = [
  '#1f2937', '#374151', '#6b7280',
  '#ef4444', '#f97316', '#f59e0b',
  '#22c55e', '#14b8a6', '#3b82f6',
  '#6366f1', '#a855f7', '#ec4899',
];

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const { addComment, setActiveComment } = useCommentStore();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    if (!editor) {
      setPosition(null);
      setHasSelection(false);
      return;
    }

    const { state } = editor;
    const { selection } = state;
    const { from, to } = selection;

    if (from === to || !editor.isFocused) {
      setHasSelection(false);
      return;
    }

    const $from = state.doc.resolve(from);
    if ($from.parent.type.name === 'codeBlock') {
      setHasSelection(false);
      return;
    }

    setHasSelection(true);

    // Position toolbar centered above the selection
    const startCoords = editor.view.coordsAtPos(from);
    const endCoords = editor.view.coordsAtPos(to);
    const centerX = (startCoords.left + endCoords.left) / 2;

    setPosition({
      top: startCoords.top - 48,
      left: centerX,
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    editor.on('selectionUpdate', updateToolbar);
    const handleBlur = () => {
      setTimeout(() => {
        if (!editor.isFocused) {
          setHasSelection(false);
          setShowAlignMenu(false);
          setShowColorMenu(false);
          setShowLinkInput(false);
        }
      }, 200);
    };
    editor.on('blur', handleBlur);
    editor.on('focus', updateToolbar);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('blur', handleBlur);
      editor.off('focus', updateToolbar);
    };
  }, [editor, updateToolbar]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowAlignMenu(false);
        setShowColorMenu(false);
        setShowLinkInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus link input when shown
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  const getCurrentHeadingLevel = useCallback((): HeadingLevel => {
    if (!editor) return 0;
    for (const level of [1, 2, 3] as const) {
      if (editor.isActive('heading', { level })) return level;
    }
    return 0;
  }, [editor]);

  const cycleHeading = useCallback(
    (direction: 'up' | 'down') => {
      if (!editor) return;
      const current = getCurrentHeadingLevel();
      let next: HeadingLevel;

      if (direction === 'up') {
        // Up means higher heading level (lower number) or wrap to body
        if (current === 0) next = 3;
        else if (current === 1) next = 0;
        else next = (current - 1) as HeadingLevel;
      } else {
        // Down means lower heading level (higher number) or wrap to body
        if (current === 0) next = 1;
        else if (current === 3) next = 0;
        else next = (current + 1) as HeadingLevel;
      }

      if (next === 0) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor.chain().focus().toggleHeading({ level: next }).run();
      }
    },
    [editor, getCurrentHeadingLevel]
  );

  const getActiveAlignment = useCallback((): string => {
    if (!editor) return 'left';
    if (editor.isActive({ textAlign: 'center' })) return 'center';
    if (editor.isActive({ textAlign: 'right' })) return 'right';
    if (editor.isActive({ textAlign: 'justify' })) return 'justify';
    return 'left';
  }, [editor]);

  const handleAddComment = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    if (from === to) return;

    const hasCommentMark = state.doc.rangeHasMark(from, to, state.schema.marks.comment);
    if (hasCommentMark) return;

    const quotedText = state.doc.textBetween(from, to, ' ');
    const commentId = crypto.randomUUID();
    editor.chain().focus().setComment(commentId).run();
    addComment(commentId, '', quotedText);
    setActiveComment(commentId);
  }, [editor, addComment, setActiveComment]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;
    editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const existingHref = editor.getAttributes('link').href || '';
      setLinkUrl(existingHref);
      setShowLinkInput(true);
      setShowAlignMenu(false);
      setShowColorMenu(false);
    }
  }, [editor]);

  const getCurrentColor = useCallback((): string => {
    if (!editor) return '#1f2937';
    return editor.getAttributes('textStyle').color || '#1f2937';
  }, [editor]);

  if (!hasSelection || !position || !editor) return null;

  const headingLevel = getCurrentHeadingLevel();
  const alignment = getActiveAlignment();

  const AlignIconData = alignment === 'center' ? TextAlignCenterIcon
    : alignment === 'right' ? TextAlignRightIcon
    : alignment === 'justify' ? TextAlignJustifyCenterIcon
    : TextAlignLeftIcon;

  return (
    <div
      ref={toolbarRef}
      className="floating-toolbar"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 99,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Heading selector */}
      <div className="floating-toolbar-group">
        <span className="floating-toolbar-heading-label">
          {HEADING_LABELS[headingLevel]}
        </span>
        <div className="floating-toolbar-heading-arrows">
          <button
            className="floating-toolbar-arrow-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              cycleHeading('up');
            }}
            title="Previous heading level"
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
          </button>
          <button
            className="floating-toolbar-arrow-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              cycleHeading('down');
            }}
            title="Next heading level"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
          </button>
        </div>
      </div>

      <div className="floating-toolbar-divider" />

      {/* Alignment dropdown */}
      <div className="floating-toolbar-dropdown-wrapper">
        <button
          className={`floating-toolbar-btn${showAlignMenu ? ' active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowAlignMenu(!showAlignMenu);
            setShowColorMenu(false);
            setShowLinkInput(false);
          }}
          title="Text alignment"
        >
          <HugeiconsIcon icon={AlignIconData} size={16} />
          <HugeiconsIcon icon={ArrowDown01Icon} size={10} className="floating-toolbar-chevron" />
        </button>
        {showAlignMenu && (
          <div className="floating-toolbar-dropdown">
            {(['left', 'center', 'right', 'justify'] as const).map((align) => {
              const IconData = align === 'center' ? TextAlignCenterIcon
                : align === 'right' ? TextAlignRightIcon
                : align === 'justify' ? TextAlignJustifyCenterIcon
                : TextAlignLeftIcon;
              return (
                <button
                  key={align}
                  className={`floating-toolbar-dropdown-item${alignment === align ? ' active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().setTextAlign(align).run();
                    setShowAlignMenu(false);
                  }}
                >
                  <HugeiconsIcon icon={IconData} size={16} />
                  <span>{align.charAt(0).toUpperCase() + align.slice(1)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="floating-toolbar-divider" />

      {/* Bold */}
      <button
        className={`floating-toolbar-btn${editor.isActive('bold') ? ' active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBold().run();
        }}
        title="Bold"
      >
        <HugeiconsIcon icon={TextBoldIcon} size={16} />
      </button>

      {/* Strikethrough */}
      <button
        className={`floating-toolbar-btn${editor.isActive('strike') ? ' active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleStrike().run();
        }}
        title="Strikethrough"
      >
        <HugeiconsIcon icon={TextStrikethroughIcon} size={16} />
      </button>

      {/* Italic */}
      <button
        className={`floating-toolbar-btn${editor.isActive('italic') ? ' active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleItalic().run();
        }}
        title="Italic"
      >
        <HugeiconsIcon icon={TextItalicIcon} size={16} />
      </button>

      {/* Underline */}
      <button
        className={`floating-toolbar-btn${editor.isActive('underline') ? ' active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleUnderline().run();
        }}
        title="Underline"
      >
        <HugeiconsIcon icon={TextUnderlineIcon} size={16} />
      </button>

      {/* Link */}
      <div className="floating-toolbar-dropdown-wrapper">
        <button
          className={`floating-toolbar-btn${editor.isActive('link') ? ' active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleLinkToggle();
          }}
          title="Link"
        >
          <HugeiconsIcon icon={Link01Icon} size={16} />
        </button>
        {showLinkInput && (
          <div className="floating-toolbar-dropdown floating-toolbar-link-input">
            <input
              ref={linkInputRef}
              type="text"
              value={linkUrl}
              placeholder="Enter URL..."
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLinkSubmit();
                }
                if (e.key === 'Escape') {
                  setShowLinkInput(false);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <button
              className="floating-toolbar-link-submit"
              onMouseDown={(e) => {
                e.preventDefault();
                handleLinkSubmit();
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Code */}
      <button
        className={`floating-toolbar-btn${editor.isActive('code') ? ' active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleCode().run();
        }}
        title="Inline code"
      >
        <HugeiconsIcon icon={SourceCodeIcon} size={16} />
      </button>

      {/* Text color */}
      <div className="floating-toolbar-dropdown-wrapper">
        <button
          className={`floating-toolbar-btn${showColorMenu ? ' active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowColorMenu(!showColorMenu);
            setShowAlignMenu(false);
            setShowLinkInput(false);
          }}
          title="Text color"
        >
          <span className="floating-toolbar-color-label">A</span>
          <span
            className="floating-toolbar-color-indicator"
            style={{ backgroundColor: getCurrentColor() }}
          />
        </button>
        {showColorMenu && (
          <div className="floating-toolbar-dropdown floating-toolbar-color-grid">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                className="floating-toolbar-color-swatch"
                style={{ backgroundColor: color }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setColor(color).run();
                  setShowColorMenu(false);
                }}
                title={color}
              />
            ))}
            <button
              className="floating-toolbar-color-reset"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetColor().run();
                setShowColorMenu(false);
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div className="floating-toolbar-divider" />

      {/* Comment */}
      <button
        className="floating-toolbar-btn"
        onMouseDown={(e) => {
          e.preventDefault();
          handleAddComment();
        }}
        title="Add comment"
      >
        <HugeiconsIcon icon={CommentAdd01Icon} size={16} />
      </button>
    </div>
  );
}
