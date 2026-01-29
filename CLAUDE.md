# DarDocs

A minimalist document editor inspired by Lark Docs, built with React, Tiptap, and tldraw.

## Project Structure

```
src/
├── App.tsx                     # Main application layout and header
├── components/
│   ├── Editor/
│   │   ├── Editor.tsx          # Main Tiptap editor component
│   │   ├── SlashCommandMenu.tsx # Slash command interface
│   │   └── extensions/         # Tiptap extensions
│   ├── Viewer/
│   │   └── DocumentViewer.tsx  # Read-only document viewer
│   ├── Blocks/
│   │   ├── BoardBlock/         # Tldraw whiteboard integration
│   │   └── TableBlock/         # Table component
│   ├── FileHandler/            # Save, Load, Import components
│   └── UI/                     # Reusable UI components
├── stores/
│   ├── documentStore.ts        # Document state management (Zustand)
│   └── boardStore.ts           # Whiteboard state management
├── lib/
│   ├── constants.ts            # Application constants
│   ├── documentSchema.ts       # Document type definitions
│   └── serialization.ts        # Document serialization utilities
└── index.css                   # Global styles and Tailwind
```

## Key Technologies

- **React 19** - UI framework
- **Tiptap** - Rich text editor (ProseMirror-based)
- **tldraw** - Whiteboard/drawing functionality
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Design Principles

- **Minimal UI** - No visible toolbar; all formatting via slash commands
- **Clean aesthetics** - Lark-inspired color scheme with subtle blues
- **Command-driven** - Type `/` to access all document features
- **Focused editing** - Narrow content width for comfortable reading/writing

## Development

```bash
npm install    # Install dependencies
npm run dev    # Start development server
npm run build  # Production build
npm run test   # Run tests
```

## File Format

Documents are saved as `.dardocs.json` files containing:
- Document metadata (title, dates)
- Rich text content (Tiptap JSON)
- Embedded board states (tldraw snapshots)
