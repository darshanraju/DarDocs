import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';

import { EDITOR_PLACEHOLDER } from '../../../lib/constants';
import { SlashCommands } from './SlashCommands';
import { CommentMark } from './CommentMark';
import { BoardBlockExtension } from './BoardBlock/BoardBlockExtension';
import { Whiteboard2BlockExtension } from '../../Whiteboard2/WhiteboardBlockExtension';
import { MediaBlockExtension } from './MediaBlock/MediaBlockExtension';
import { VideoBlockExtension } from './MediaBlock/VideoBlockExtension';
import { DropPasteHandler } from './MediaBlock/DropPasteHandler';
import { EmbedBlockExtension } from './EmbedBlock/EmbedBlockExtension';
import { MermaidBlockExtension } from './MermaidBlock/MermaidBlockExtension';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

export function getExtensions(onSlashCommand: (query: string) => void, onSlashCommandClose: () => void) {
  return [
    StarterKit.configure({
      codeBlock: false, // We use CodeBlockLowlight instead
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    Placeholder.configure({
      placeholder: EDITOR_PLACEHOLDER,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-500 underline cursor-pointer',
      },
    }),
    Underline,
    TextStyle,
    Color,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Highlight.configure({
      multicolor: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse',
      },
    }),
    TableRow,
    TableCell,
    TableHeader,
    MediaBlockExtension.configure({
      inline: false,
      allowBase64: true,
    }),
    VideoBlockExtension,
    DropPasteHandler,
    SlashCommands.configure({
      onQuery: onSlashCommand,
      onClose: onSlashCommandClose,
    }),
    CommentMark,
    BoardBlockExtension,
    Whiteboard2BlockExtension,
    EmbedBlockExtension,
    MermaidBlockExtension,
  ];
}
