import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Type,
  Highlighter,
} from 'lucide-react';
import { Button, Dropdown, Modal, Tooltip } from '../ui';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  if (!editor) return null;

  const headingOptions = [
    { value: 'paragraph', label: 'Paragraph', icon: <Type className="w-4 h-4" /> },
    { value: '1', label: 'Heading 1', icon: <Heading1 className="w-4 h-4" /> },
    { value: '2', label: 'Heading 2', icon: <Heading2 className="w-4 h-4" /> },
    { value: '3', label: 'Heading 3', icon: <Heading3 className="w-4 h-4" /> },
    { value: '4', label: 'Heading 4', icon: <Heading4 className="w-4 h-4" /> },
    { value: '5', label: 'Heading 5', icon: <Heading5 className="w-4 h-4" /> },
    { value: '6', label: 'Heading 6', icon: <Heading6 className="w-4 h-4" /> },
  ];

  const getCurrentHeadingLevel = () => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) {
        return String(i);
      }
    }
    return 'paragraph';
  };

  const handleHeadingChange = (value: string) => {
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    }
  };

  const openLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setLinkModalOpen(true);
  };

  const setLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkModalOpen(false);
    setLinkUrl('');
  };

  return (
    <>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-wrap">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
          <Tooltip content="Undo (Ctrl+Z)">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Shift+Z)">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>

        {/* Heading dropdown */}
        <div className="pr-2 border-r border-gray-200">
          <Dropdown
            options={headingOptions}
            value={getCurrentHeadingLevel()}
            onChange={handleHeadingChange}
            className="w-32"
          />
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <Tooltip content="Bold (Ctrl+B)">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Italic (Ctrl+I)">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Underline (Ctrl+U)">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Underline className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Strikethrough (Ctrl+Shift+S)">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Highlight">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <Tooltip content="Bullet List">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Numbered List">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>

        {/* Block elements */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
          <Tooltip content="Blockquote">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Code Block">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <Code className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Horizontal Rule">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>

        {/* Link */}
        <div className="flex items-center gap-0.5 px-2">
          <Tooltip content="Add Link (Ctrl+K)">
            <Button
              variant="ghost"
              size="sm"
              isActive={editor.isActive('link')}
              onClick={openLinkModal}
            >
              <Link className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Link Modal */}
      <Modal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Insert Link"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={setLink}>
              {linkUrl ? 'Update Link' : 'Remove Link'}
            </Button>
          </>
        }
      >
        <div>
          <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <input
            id="link-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setLink();
              }
            }}
          />
        </div>
      </Modal>
    </>
  );
}
