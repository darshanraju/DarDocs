# DarDocs

A minimalist document editor inspired by Lark Docs, built with React, Tiptap, and tldraw.

## Monorepo Structure

```
packages/
├── core/                        # @dardocs/core — shared types, schemas, utilities
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── documentSchema.ts    # Document & comment type definitions
│       ├── constants.ts         # Application constants
│       ├── serialization.ts     # Document serialization utilities
│       ├── persistence.ts       # DocumentPersistence interface
│       ├── LocalFilePersistence.ts # Browser file download/upload adapter
│       ├── slashCommands.ts     # Slash command definitions & filtering
│       └── docxConverter.ts     # DOCX import converter
├── editor/                      # @dardocs/editor — React editor, viewer, stores
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── stores/              # Zustand stores (document, board, comment)
│       ├── hooks/               # React hooks (useDocument, useEditor, etc.)
│       └── components/
│           ├── Editor/          # Tiptap editor + extensions
│           ├── Viewer/          # Read-only document viewer
│           ├── Blocks/          # BoardBlock, TableBlock
│           ├── Comments/        # CommentSection, CommentsSidebar, CommentPanel
│           ├── FileHandler/     # Save, Load, Import components
│           ├── TableOfContents/ # TOC sidebar
│           ├── UI/              # Button, Tooltip, Modal, Dropdown
│           └── Whiteboard2/     # Custom whiteboard engine
apps/
└── web/                         # @dardocs/web — Vite SPA shell
    └── src/
        ├── App.tsx              # Main application layout
        ├── main.tsx             # Entry point
        └── index.css            # Global styles and Tailwind
```

## Key Technologies

- **React 19** - UI framework
- **Tiptap** - Rich text editor (ProseMirror-based)
- **tldraw** - Whiteboard/drawing functionality
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **npm workspaces** - Monorepo package management

## Package Architecture

- **@dardocs/core** — Zero-dependency types, schemas, and pure utilities. No React.
- **@dardocs/editor** — All React components, stores, and hooks. Depends on @dardocs/core.
- **@dardocs/web** — The SPA shell. Imports from @dardocs/editor and @dardocs/core.

Packages export TypeScript source directly (no build step). Vite and vitest resolve
`@dardocs/*` imports via path aliases.

## Design Principles

- **Minimal UI** - No visible toolbar; all formatting via slash commands
- **Clean aesthetics** - Lark-inspired color scheme with subtle blues
- **Command-driven** - Type `/` to access all document features
- **Focused editing** - Narrow content width for comfortable reading/writing

## Development

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start dev server (apps/web)
npm run build        # Production build (apps/web)
npm run test         # Run all tests (vitest from root)
npm run test:run     # Single test run
```

## File Format

Documents are saved as `.dardocs.json` files containing:
- Document metadata (title, dates)
- Rich text content (Tiptap JSON)
- Embedded board states (tldraw snapshots)
- Comments (inline + document-level)
