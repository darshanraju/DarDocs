import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Table,
  Palette,
  MessageSquare,
  Table2,
  ListTree,
} from 'lucide-react';

interface SlashCommand {
  name: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  action: (editor: Editor) => void;
}

interface SlashCommandMenuProps {
  editor: Editor | null;
  query: string;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
}

const commands: SlashCommand[] = [
  {
    name: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="w-5 h-5" />,
    keywords: ['heading1', 'h1', 'title', 'large'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    name: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="w-5 h-5" />,
    keywords: ['heading2', 'h2', 'subtitle', 'medium'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    name: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="w-5 h-5" />,
    keywords: ['heading3', 'h3', 'small'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    name: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="w-5 h-5" />,
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="w-5 h-5" />,
    keywords: ['numbered', 'list', 'ordered', 'ol', 'number'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    name: 'Quote',
    description: 'Add a blockquote',
    icon: <Quote className="w-5 h-5" />,
    keywords: ['quote', 'blockquote', 'citation'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    name: 'Code Block',
    description: 'Add a code block',
    icon: <Code className="w-5 h-5" />,
    keywords: ['code', 'codeblock', 'programming', 'snippet'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    name: 'Divider',
    description: 'Add a horizontal divider',
    icon: <Minus className="w-5 h-5" />,
    keywords: ['divider', 'horizontal', 'rule', 'hr', 'line'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    name: 'Table',
    description: 'Insert a table',
    icon: <Table className="w-5 h-5" />,
    keywords: ['table', 'grid', 'spreadsheet'],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    name: 'Whiteboard',
    description: 'Insert a drawing board',
    icon: <Palette className="w-5 h-5" />,
    keywords: ['board', 'whiteboard', 'drawing', 'canvas', 'sketch'],
    action: (editor) => editor.chain().focus().insertBoard().run(),
  },
  {
    name: 'Table of Contents',
    description: 'Auto-generated outline of headings',
    icon: <ListTree className="w-5 h-5" />,
    keywords: ['toc', 'contents', 'outline', 'navigation', 'index'],
    action: (editor) => editor.chain().focus().insertTableOfContents().run(),
  },
  {
    name: 'Slack Thread',
    description: 'Embed a Slack conversation',
    icon: <MessageSquare className="w-5 h-5" />,
    keywords: ['slack', 'thread', 'message', 'conversation', 'chat'],
    action: (editor) => editor.chain().focus().insertSlackEmbed('').run(),
  },
  {
    name: 'Google Sheet',
    description: 'Embed a live spreadsheet',
    icon: <Table2 className="w-5 h-5" />,
    keywords: ['sheet', 'google', 'spreadsheet', 'excel', 'gsheet'],
    action: (editor) => editor.chain().focus().insertGoogleSheet('').run(),
  },
];

export function SlashCommandMenu({
  editor,
  query,
  isOpen,
  onClose,
  position,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some((keyword) => keyword.includes(lowerQuery))
    );
  }, [query]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Execute selected command
  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (!editor) return;

      // Delete the slash and query from the document
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // Find the slash position
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = textBefore.lastIndexOf('/');

      if (slashIndex !== -1) {
        const from = $from.start() + slashIndex;
        const to = $from.pos;

        editor.chain().deleteRange({ from, to }).run();
      }

      // Execute the command action
      command.action(editor);
      onClose();
    },
    [editor, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, executeCommand, onClose]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <div
      className="slash-command-menu fixed"
      style={{ top: position.top, left: position.left }}
    >
      {filteredCommands.map((command, index) => (
        <div
          key={command.name}
          className={`slash-command-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => executeCommand(command)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="slash-command-item-icon">{command.icon}</div>
          <div className="slash-command-item-content">
            <div className="slash-command-item-title">{command.name}</div>
            <div className="slash-command-item-description">{command.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
