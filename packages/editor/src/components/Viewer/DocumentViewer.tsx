import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import { useDocumentStore } from '../../stores/documentStore';
import { BoardBlockExtension } from '../Editor/extensions/BoardBlock/BoardBlockExtension';

const lowlight = createLowlight(common);

export function DocumentViewer() {
  const { document } = useDocumentStore();

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        Link.configure({
          openOnClick: true,
        }),
        Underline,
        Highlight,
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Table.configure({
          resizable: false,
        }),
        TableRow,
        TableCell,
        TableHeader,
        Image,
        BoardBlockExtension,
      ],
      content: document?.content || { type: 'doc', content: [{ type: 'paragraph' }] },
      editable: false,
      editorProps: {
        attributes: {
          class: 'prose prose-sm focus:outline-none max-w-none min-h-[300px]',
        },
      },
    },
    [document?.metadata?.id]
  );

  // Update content when document changes
  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);
    }
  }, [editor, document?.content]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <EditorContent editor={editor} />
    </div>
  );
}
