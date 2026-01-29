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
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
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
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Document title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {document.metadata.title}
        </h1>

        {/* Document metadata */}
        <div className="text-sm text-gray-500 mb-8">
          <span>Last updated: {new Date(document.metadata.updatedAt).toLocaleString()}</span>
        </div>

        {/* Document content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
