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
  PenTool,
  Image as ImageIcon,
  Video,
  Figma,
  Github,
  FileCode2,
  Workflow,
  BarChart3,
  Braces,
  Table2,
} from 'lucide-react';
import { useBoardStore } from '../../stores/boardStore';
import { useWhiteboard2Store } from '../Whiteboard2/whiteboardStore';
import { readFileAsDataURL } from './extensions/MediaBlock/mediaUtils';

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
    icon: <Type className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['text', 'paragraph', 'plain'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    name: 'Heading 1',
    icon: <Heading1 className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['heading1', 'h1', 'title', 'large'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    name: 'Heading 2',
    icon: <Heading2 className="w-5 h-5" style={{ color: '#00b386' }} />,
    keywords: ['heading2', 'h2', 'subtitle', 'medium'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    name: 'Heading 3',
    icon: <Heading3 className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['heading3', 'h3', 'small'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    name: 'Numbered List',
    icon: <ListOrdered className="w-5 h-5" style={{ color: '#cf8a00' }} />,
    keywords: ['numbered', 'list', 'ordered', 'ol', 'number'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    name: 'Bulleted List',
    icon: <List className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'Code Block',
    icon: <Code className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['code', 'codeblock', 'programming', 'snippet'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    name: 'Quote',
    icon: <Quote className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['quote', 'blockquote', 'citation'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    name: 'Divider',
    icon: <Minus className="w-5 h-5" style={{ color: '#cf8a00' }} />,
    keywords: ['divider', 'horizontal', 'rule', 'hr', 'line'],
    category: 'Basics',
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    name: 'Image',
    icon: <ImageIcon className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['image', 'photo', 'picture', 'upload', 'media', 'img'],
    category: 'Media',
    action: (editor) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const dataUrl = await readFileAsDataURL(file);
        editor.chain().focus().setImage({ src: dataUrl }).run();
      };
      input.click();
    },
  },
  {
    name: 'Video',
    icon: <Video className="w-5 h-5" style={{ color: '#cf8a00' }} />,
    keywords: ['video', 'movie', 'clip', 'upload', 'media', 'mp4'],
    category: 'Media',
    action: (editor) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const dataUrl = await readFileAsDataURL(file);
        editor
          .chain()
          .focus()
          .insertContent({ type: 'videoBlock', attrs: { src: dataUrl } })
          .run();
      };
      input.click();
    },
  },
  {
    name: 'Table',
    icon: <Table className="w-5 h-5" style={{ color: '#0fc6c2' }} />,
    keywords: ['table', 'grid', 'spreadsheet'],
    category: 'Blocks',
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    name: 'Whiteboard',
    icon: <Palette className="w-5 h-5" style={{ color: '#7c3aed' }} />,
    keywords: ['board', 'whiteboard', 'drawing', 'canvas', 'sketch'],
    category: 'Blocks',
    action: (editor) => {
      const boardId = crypto.randomUUID();
      useBoardStore.getState().setPendingFullscreenBoardId(boardId);
      editor.chain().focus().insertBoard({ boardId }).run();
    },
  },
  {
    name: 'Whiteboard 2',
    icon: <PenTool className="w-5 h-5" style={{ color: '#3370ff' }} />,
    keywords: ['whiteboard2', 'canvas', 'draw', 'board2', 'sketch2'],
    category: 'Blocks',
    action: (editor) => {
      const boardId = crypto.randomUUID();
      useWhiteboard2Store.getState().setPendingFullscreenBoardId(boardId);
      editor.chain().focus().insertWhiteboard2({ boardId }).run();
    },
  },
  // ---- Embeds ----
  {
    name: 'Figma',
    icon: <Figma className="w-5 h-5" style={{ color: '#a259ff' }} />,
    keywords: ['figma', 'design', 'prototype', 'wireframe', 'embed'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertEmbed({ embedType: 'figma' }).run(),
  },
  {
    name: 'Google Sheet',
    icon: <Table2 className="w-5 h-5" style={{ color: '#0f9d58' }} />,
    keywords: ['google', 'sheet', 'spreadsheet', 'excel', 'embed'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertEmbed({ embedType: 'google-sheet' }).run(),
  },
  {
    name: 'GitHub',
    icon: <Github className="w-5 h-5" style={{ color: '#24292e' }} />,
    keywords: ['github', 'issue', 'pr', 'pull', 'request', 'repo', 'embed'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertEmbed({ embedType: 'github' }).run(),
  },
  {
    name: 'GitHub Gist',
    icon: <FileCode2 className="w-5 h-5" style={{ color: '#24292e' }} />,
    keywords: ['gist', 'github', 'snippet', 'code', 'embed'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertEmbed({ embedType: 'github-gist' }).run(),
  },
  {
    name: 'Mermaid Diagram',
    icon: <Workflow className="w-5 h-5" style={{ color: '#ff6b6b' }} />,
    keywords: ['mermaid', 'diagram', 'flowchart', 'sequence', 'graph', 'chart', 'er'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertMermaid().run(),
  },
  {
    name: 'Grafana',
    icon: <BarChart3 className="w-5 h-5" style={{ color: '#f46800' }} />,
    keywords: ['grafana', 'dashboard', 'metrics', 'monitoring', 'graph', 'embed'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertEmbed({ embedType: 'grafana' }).run(),
  },
  {
    name: 'Swagger',
    icon: <Braces className="w-5 h-5" style={{ color: '#49cc90' }} />,
    keywords: ['swagger', 'openapi', 'api', 'docs', 'rest', 'embed'],
    category: 'Embeds',
    action: (editor) => editor.chain().focus().insertEmbed({ embedType: 'swagger' }).run(),
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
