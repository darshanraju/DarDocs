import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import {
  Type,
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
} from 'lucide-react';
import { useBoardStore } from '../../stores/boardStore';

interface SlashCommand {
  name: string;
  icon: React.ReactNode;
  keywords: string[];
  category: string;
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
    name: 'Text',
    icon: <Type className="w-5 h-5 text-blue-400" />,
    keywords: ['text', 'paragraph', 'plain'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    name: 'Heading 1',
    icon: <Heading1 className="w-5 h-5 text-blue-400" />,
    keywords: ['heading1', 'h1', 'title', 'large'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    name: 'Heading 2',
    icon: <Heading2 className="w-5 h-5 text-blue-400" />,
    keywords: ['heading2', 'h2', 'subtitle', 'medium'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    name: 'Heading 3',
    icon: <Heading3 className="w-5 h-5 text-blue-400" />,
    keywords: ['heading3', 'h3', 'small'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    name: 'Numbered List',
    icon: <ListOrdered className="w-5 h-5 text-green-400" />,
    keywords: ['numbered', 'list', 'ordered', 'ol', 'number'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    name: 'Bulleted List',
    icon: <List className="w-5 h-5 text-blue-400" />,
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'Code Block',
    icon: <Code className="w-5 h-5 text-blue-400" />,
    keywords: ['code', 'codeblock', 'programming', 'snippet'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    name: 'Quote',
    icon: <Quote className="w-5 h-5 text-blue-400" />,
    keywords: ['quote', 'blockquote', 'citation'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    name: 'Divider',
    icon: <Minus className="w-5 h-5 text-amber-400" />,
    keywords: ['divider', 'horizontal', 'rule', 'hr', 'line'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    name: 'Table',
    icon: <Table className="w-5 h-5 text-teal-400" />,
    keywords: ['table', 'grid', 'spreadsheet'],
    category: 'Blocks',
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    name: 'Whiteboard',
    icon: <Palette className="w-5 h-5 text-purple-400" />,
    keywords: ['board', 'whiteboard', 'drawing', 'canvas', 'sketch'],
    category: 'Blocks',
    action: (editor) => {
      const boardId = crypto.randomUUID();
      useBoardStore.getState().setPendingFullscreenBoardId(boardId);
      editor.chain().focus().insertBoard({ boardId }).run();
    },
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

  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some((keyword) => keyword.includes(lowerQuery))
    );
  }, [query]);

  const groupedCommands = useMemo(() => {
    const groups: { category: string; items: SlashCommand[] }[] = [];
    const categoryMap = new Map<string, SlashCommand[]>();

    for (const cmd of filteredCommands) {
      const existing = categoryMap.get(cmd.category);
      if (existing) {
        existing.push(cmd);
      } else {
        const items = [cmd];
        categoryMap.set(cmd.category, items);
        groups.push({ category: cmd.category, items });
      }
    }

    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (!editor) return;

      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = textBefore.lastIndexOf('/');

      if (slashIndex !== -1) {
        const from = $from.start() + slashIndex;
        const to = $from.pos;
        editor.chain().deleteRange({ from, to }).run();
      }

      command.action(editor);
      onClose();
    },
    [editor, onClose]
  );

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
      {groupedCommands.map((group) => (
        <div key={group.category}>
          <div className="slash-command-category">{group.category}</div>
          {group.items.map((command) => {
            const index = filteredCommands.indexOf(command);
            return (
              <div
                key={command.name}
                className={`slash-command-item ${index === selectedIndex ? 'is-selected' : ''}`}
                onClick={() => executeCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="slash-command-item-icon">{command.icon}</div>
                <div className="slash-command-item-title">{command.name}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
