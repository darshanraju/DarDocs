# Phase 1 Implementation Plan

## Constraint

`.dardocs.json` files only exist inside git repos. Git is the storage layer,
version control system, and collaboration mechanism. No backend, no auth, no
hosting. The VSCode extension is the primary interface.

---

## Target Architecture

```
dardocs/
├── packages/
│   ├── core/                   # @dardocs/core
│   │   ├── src/
│   │   │   ├── schema.ts       #   DarDocsDocument types, createNewDocument()
│   │   │   ├── constants.ts    #   All constants (no DOM/browser APIs)
│   │   │   ├── serialization.ts#   serializeDocument(), deserializeDocument()
│   │   │   └── index.ts        #   Public exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts      #   Build: ESM + CJS + .d.ts
│   │
│   └── editor/                 # @dardocs/editor
│       ├── src/
│       │   ├── DarDocsEditor.tsx    #  <DarDocsEditor /> — editable
│       │   ├── DarDocsViewer.tsx    #  <DarDocsViewer /> — read-only
│       │   ├── extensions/          #  All Tiptap extensions (unchanged)
│       │   ├── menus/               #  SlashCommandMenu, FloatingToolbar
│       │   ├── comments/            #  CommentsSidebar, CommentPanel, etc.
│       │   ├── blocks/              #  BoardBlock, TableBlock components
│       │   ├── toc/                 #  TableOfContents
│       │   ├── ui/                  #  Button, Modal, Dropdown, Tooltip
│       │   ├── stores/              #  documentStore, boardStore, commentStore (internal)
│       │   ├── styles/
│       │   │   └── editor.css       #  All ProseMirror + component CSS
│       │   └── index.ts             #  Public exports
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── apps/
│   ├── web/                    # Development/demo app (current Vite app, refactored)
│   │   ├── src/
│   │   │   ├── App.tsx         #   Uses <DarDocsEditor /> from @dardocs/editor
│   │   │   ├── main.tsx
│   │   │   └── index.css       #   App-shell styles only (layout, title input)
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── vscode/                 # VSCode extension
│       ├── src/
│       │   ├── extension.ts         #  activate(): register editor provider
│       │   ├── DarDocsEditorProvider.ts  #  CustomTextEditorProvider
│       │   └── webview/
│       │       ├── index.html       #  Webview HTML shell
│       │       ├── main.tsx         #  React entry
│       │       └── WebviewApp.tsx   #  Uses <DarDocsEditor /> or <DarDocsViewer />
│       ├── package.json             #  VSCode extension manifest
│       ├── tsconfig.json
│       └── esbuild.config.mjs       #  Extension host bundle
│                                     #  + Vite for webview bundle
│
├── pnpm-workspace.yaml
├── package.json                # Root: scripts, devDependencies
├── tsconfig.base.json          # Shared compiler options
└── turbo.json                  # Build orchestration (optional, can add later)
```

---

## Package Design

### @dardocs/core

**Purpose**: Document format — types, schema validation, serialization.
Zero UI dependencies. Works in Node.js, browser, VSCode extension host.

```typescript
// Public API (@dardocs/core)

// Types
export interface DarDocsDocument { version: "1.0"; metadata: DocumentMetadata; content: JSONContent; boards: Record<string, TLEditorSnapshot>; comments: Comment[]; }
export interface DocumentMetadata { id: string; title: string; createdAt: string; updatedAt: string; }
export interface Comment { id: string; author: string; avatarUrl?: string; text: string; imageUrl?: string; createdAt: string; }
export interface BoardBlockAttrs { boardId: string; width: number; height: number; }
export type NodeType = 'doc' | 'paragraph' | 'heading' | ...
export type MarkType = 'bold' | 'italic' | 'underline' | ...

// Functions
export function createNewDocument(title?: string): DarDocsDocument
export function serializeDocument(doc: DarDocsDocument): string
export function deserializeDocument(json: string): DarDocsDocument

// Constants
export const DARDOCS_EXTENSION: string         // '.dardocs.json'
export const DEFAULT_BOARD_HEIGHT: number       // 400
export const EDITOR_PLACEHOLDER: string         // "Type '/' for commands"
export const EDITOR_SAVE_DEBOUNCE_MS: number    // 300
export const BOARD_SAVE_DEBOUNCE_MS: number     // 500
// ... etc
```

**Dependencies**: None at runtime. `@tiptap/react` and `tldraw` only for type
imports (devDependencies / peerDependencies with `import type`).

**What moves here**:
- `src/lib/documentSchema.ts` → `packages/core/src/schema.ts`
- `src/lib/constants.ts` → `packages/core/src/constants.ts`
- `src/lib/serialization.ts` → `packages/core/src/serialization.ts`
  - Remove `downloadDocument()`, `readFileAsText()`, `readFileAsArrayBuffer()`
    (browser-only helpers — move to apps/web)
  - Keep `serializeDocument()` and `deserializeDocument()` (pure functions)

**What does NOT move here**:
- `docxConverter.ts` — stays in apps/web (mammoth is heavy, not core)
- `slashCommands.ts` — moves to @dardocs/editor (it's UI config)

---

### @dardocs/editor

**Purpose**: Drop-in React components for editing and viewing DarDocs documents.
This is the npm package other developers install.

```typescript
// Public API (@dardocs/editor)

// Components
export function DarDocsEditor(props: DarDocsEditorProps): React.ReactElement
export function DarDocsViewer(props: DarDocsViewerProps): React.ReactElement

// Props
export interface DarDocsEditorProps {
  document: DarDocsDocument           // Initial document
  onChange?: (doc: DarDocsDocument) => void  // Called on every edit (debounced)
  className?: string
  editable?: boolean                  // Default true
}

export interface DarDocsViewerProps {
  document: DarDocsDocument           // Document to render
  className?: string
}

// Optional: expose individual extensions for advanced users
export { BoardBlockExtension } from './extensions/BoardBlock/BoardBlockExtension'
export { MermaidBlockExtension } from './extensions/MermaidBlock/MermaidBlockExtension'
export { EmbedBlockExtension } from './extensions/EmbedBlock/EmbedBlockExtension'
// ... etc

// CSS (users must import this)
import '@dardocs/editor/styles'
```

**Key design change**: The editor currently reads/writes to a global Zustand
store. For the package, the public API is prop-driven:

```
Current:  useDocumentStore() ← global singleton
Package:  <DarDocsEditor document={doc} onChange={fn} />
```

Internally, the stores still exist (they manage editor state, board snapshots,
comments). But they're initialized per-instance from the `document` prop, and
`onChange` fires when state changes. The stores are NOT exported.

**Dependencies** (peer):
- `react` ^19.0.0
- `react-dom` ^19.0.0

**Dependencies** (bundled):
- `@tiptap/react` ^3.18.0 + all extensions
- `tldraw` ^4.3.0
- `zustand` ^5.0.0
- `lowlight` ^3.3.0
- `mermaid` ^11.0.0
- `lucide-react` ^0.500.0
- `lodash-es` (debounce only)
- `@dardocs/core`

**What moves here**:
- `src/components/Editor/` → `packages/editor/src/`
- `src/components/Viewer/DocumentViewer.tsx` → `packages/editor/src/DarDocsViewer.tsx`
- `src/components/Blocks/` → `packages/editor/src/blocks/`
- `src/components/Comments/` → `packages/editor/src/comments/`
- `src/components/TableOfContents/` → `packages/editor/src/toc/`
- `src/components/UI/` → `packages/editor/src/ui/`
- `src/stores/` → `packages/editor/src/stores/`
- `src/lib/slashCommands.ts` → `packages/editor/src/menus/slashCommands.ts`
- ProseMirror/editor CSS from `src/index.css` → `packages/editor/src/styles/editor.css`

---

### apps/web (Development App)

**Purpose**: Local development, testing, demo. Uses packages.

```typescript
// apps/web/src/App.tsx
import { DarDocsEditor } from '@dardocs/editor'
import { createNewDocument, serializeDocument, deserializeDocument } from '@dardocs/core'
import '@dardocs/editor/styles'

function App() {
  const [doc, setDoc] = useState(() => createNewDocument('Untitled'))

  return (
    <div className="app-shell">
      <input value={doc.metadata.title} onChange={...} />
      <DarDocsEditor document={doc} onChange={setDoc} />
    </div>
  )
}
```

**What stays here**:
- `App.tsx` (simplified to use package components)
- `main.tsx`
- `index.css` (app-shell styles only: layout, title input, page background)
- File handling components (SaveDocument, LoadDocument, ImportDocx)
- `docxConverter.ts`

---

### apps/vscode (VSCode Extension)

**Purpose**: View and edit `.dardocs.json` files directly in VSCode.

#### Extension Host (Node.js side)

```typescript
// apps/vscode/src/extension.ts
import * as vscode from 'vscode'
import { DarDocsEditorProvider } from './DarDocsEditorProvider'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    DarDocsEditorProvider.register(context)
  )
}
```

```typescript
// apps/vscode/src/DarDocsEditorProvider.ts
import * as vscode from 'vscode'

export class DarDocsEditorProvider implements vscode.CustomTextEditorProvider {
  // Register for *.dardocs.json files
  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      'dardocs.editor',
      new DarDocsEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  }

  // Called when a .dardocs.json file is opened
  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ) {
    // 1. Set webview HTML (bundled React app)
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview)

    // 2. Send document content to webview
    webviewPanel.webview.postMessage({
      type: 'load',
      content: document.getText()
    })

    // 3. Listen for edits from webview → apply to TextDocument
    webviewPanel.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'edit') {
        const edit = new vscode.WorkspaceEdit()
        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          msg.content
        )
        vscode.workspace.applyEdit(edit)
      }
    })

    // 4. Listen for file changes (external edits, git checkout) → update webview
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({
          type: 'load',
          content: document.getText()
        })
      }
    })
  }
}
```

#### Webview (Browser/React side)

```typescript
// apps/vscode/src/webview/WebviewApp.tsx
import { useState, useEffect } from 'react'
import { DarDocsEditor } from '@dardocs/editor'
import { deserializeDocument, serializeDocument } from '@dardocs/core'
import '@dardocs/editor/styles'

const vscode = acquireVsCodeApi()

export function WebviewApp() {
  const [doc, setDoc] = useState(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Receive document from extension host
  useEffect(() => {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'load') {
        setDoc(deserializeDocument(event.data.content))
      }
    })
  }, [])

  // Send edits back to extension host
  function handleChange(updatedDoc) {
    setDoc(updatedDoc)
    vscode.postMessage({
      type: 'edit',
      content: serializeDocument(updatedDoc)
    })
  }

  if (!doc) return <div>Loading...</div>

  return (
    <DarDocsEditor
      document={doc}
      onChange={handleChange}
      editable={mode === 'edit'}
    />
  )
}
```

#### VSCode Extension Manifest

```jsonc
// apps/vscode/package.json
{
  "name": "dardocs",
  "displayName": "DarDocs",
  "description": "View and edit .dardocs.json documents in VSCode",
  "version": "0.1.0",
  "publisher": "dardocs",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "customEditors": [
      {
        "viewType": "dardocs.editor",
        "displayName": "DarDocs Editor",
        "selector": [
          { "filenamePattern": "*.dardocs.json" }
        ],
        "priority": "default"
      }
    ]
  }
}
```

#### Build Pipeline

The extension has two build targets:

1. **Extension host** (`src/extension.ts`, `src/DarDocsEditorProvider.ts`)
   - Built with esbuild → `dist/extension.js`
   - Target: Node.js (VSCode runtime)
   - Bundles: only vscode API types

2. **Webview** (`src/webview/`)
   - Built with Vite → `dist/webview/`
   - Target: browser (Chromium webview)
   - Bundles: React, @dardocs/editor, @dardocs/core, all CSS
   - Single HTML file with inlined JS/CSS

---

## Implementation Steps

### Step 1: Monorepo Scaffold

Initialize the structure without moving code yet.

```
1.1  Install pnpm if not present
1.2  Create pnpm-workspace.yaml
1.3  Create root package.json (private, workspaces)
1.4  Create tsconfig.base.json (shared compiler options)
1.5  Create packages/core/ scaffold (package.json, tsconfig, tsup config, empty src/)
1.6  Create packages/editor/ scaffold (same)
1.7  Move current src/ + config into apps/web/
1.8  Create apps/vscode/ scaffold
1.9  Verify: pnpm install works, apps/web dev server starts
```

### Step 2: Extract @dardocs/core

```
2.1  Copy src/lib/documentSchema.ts → packages/core/src/schema.ts
2.2  Copy src/lib/constants.ts → packages/core/src/constants.ts
2.3  Copy src/lib/serialization.ts → packages/core/src/serialization.ts
       - Remove downloadDocument() (DOM API: document.createElement)
       - Remove readFileAsText() (DOM API: FileReader)
       - Remove readFileAsArrayBuffer() (DOM API: FileReader)
       - Keep serializeDocument() and deserializeDocument() (pure)
2.4  Create packages/core/src/index.ts — re-export everything
2.5  Configure tsup to build ESM + CJS + .d.ts
2.6  Move browser-only helpers to apps/web/src/lib/fileHelpers.ts
2.7  Update apps/web imports: replace '../lib/...' with '@dardocs/core'
2.8  Run existing tests against the package
2.9  Verify: apps/web still works with @dardocs/core as dependency
```

### Step 3: Extract @dardocs/editor

This is the largest step. The editor component needs to become prop-driven
instead of reading from a global store.

```
3.1   Copy all editor source files to packages/editor/src/
        - src/components/Editor/ → packages/editor/src/
        - src/components/Viewer/ → packages/editor/src/DarDocsViewer.tsx
        - src/components/Blocks/ → packages/editor/src/blocks/
        - src/components/Comments/ → packages/editor/src/comments/
        - src/components/TableOfContents/ → packages/editor/src/toc/
        - src/components/UI/ → packages/editor/src/ui/
        - src/stores/ → packages/editor/src/stores/
        - src/lib/slashCommands.ts → packages/editor/src/menus/slashCommands.ts

3.2   Extract CSS
        - Split src/index.css into:
          a) ProseMirror / editor styles → packages/editor/src/styles/editor.css
          b) App shell styles → apps/web/src/index.css

3.3   Refactor store initialization
        Current: stores are global singletons
        Target: stores initialized per <DarDocsEditor> instance

        Create a React context provider:
          <DarDocsProvider document={doc} onChange={fn}>
            <EditorInner />
          </DarDocsProvider>

        The provider:
          - Creates store instances from the document prop
          - Provides them via context (not global import)
          - Calls onChange when stores update

3.4   Create DarDocsEditor wrapper component
        - Accepts DarDocsEditorProps
        - Renders <DarDocsProvider> + <Editor> + <SlashCommandMenu> etc.
        - Handles the connection between props and internal stores

3.5   Create DarDocsViewer wrapper component
        - Accepts DarDocsViewerProps
        - Renders read-only Tiptap instance
        - Minimal extensions (no slash commands, no comment editing)

3.6   Create packages/editor/src/index.ts with public API
3.7   Configure tsup with external: ['react', 'react-dom']
3.8   Update apps/web to use @dardocs/editor
3.9   Verify: apps/web works identically to before
3.10  Run tests
```

### Step 4: Build VSCode Extension

```
4.1   Scaffold extension
        - apps/vscode/package.json (extension manifest)
        - apps/vscode/tsconfig.json
        - apps/vscode/src/extension.ts (activate function)

4.2   Implement DarDocsEditorProvider
        - Register for *.dardocs.json
        - resolveCustomTextEditor: create webview, load file, sync edits

4.3   Build webview
        - apps/vscode/src/webview/index.html
        - apps/vscode/src/webview/main.tsx (React entry)
        - apps/vscode/src/webview/WebviewApp.tsx (uses @dardocs/editor)
        - Vite config to build webview as single bundle

4.4   Wire up communication
        - Extension → Webview: postMessage({ type: 'load', content })
        - Webview → Extension: postMessage({ type: 'edit', content })
        - Handle external file changes (git checkout, branch switch)

4.5   Handle tldraw in webview
        - Option A: Include tldraw (adds ~2-3MB to webview bundle)
        - Option B: Static SVG preview for view mode, tldraw for edit mode
        - Recommendation: Option A for now (simplicity), optimize later

4.6   Build pipeline
        - esbuild for extension host (Node.js target)
        - Vite for webview (browser target, single HTML file)
        - pnpm script: "build" runs both

4.7   Test locally
        - F5 in VSCode to launch Extension Development Host
        - Open a .dardocs.json file
        - Verify view mode works
        - Verify edit mode works
        - Verify save triggers file write
        - Verify git diff shows changes

4.8   Package extension
        - Install vsce: npm install -g @vscode/vsce
        - vsce package → produces .vsix file
        - Test: code --install-extension dardocs-0.1.0.vsix
```

### Step 5: Verify Git Workflow

End-to-end test of the git-native workflow:

```
5.1   Create a test repo
5.2   Add a .dardocs.json file (via apps/web export or manually)
5.3   Open in VSCode → verify extension activates
5.4   Edit the document → verify file changes
5.5   git diff → verify diff is readable JSON
5.6   git commit → document is versioned
5.7   Create branch, edit, PR → verify it works
5.8   git checkout main → verify extension updates to show main's version
5.9   Clone repo on another machine → verify file opens correctly
```

### Step 6: Publish

```
6.1   npm publish @dardocs/core (public)
6.2   npm publish @dardocs/editor (public)
6.3   Publish VSCode extension to marketplace
        - Create publisher account at marketplace.visualstudio.com
        - vsce publish
6.4   Create GitHub releases
```

---

## What Changes vs What Stays the Same

| Area | Current | After Phase 1 |
|------|---------|---------------|
| Code location | Single src/ directory | Monorepo: packages/ + apps/ |
| Document types | In src/lib/documentSchema.ts | @dardocs/core package |
| Editor component | Global store, single instance | Prop-driven, multi-instance capable |
| Viewer | Separate component | Part of @dardocs/editor (editable=false) |
| Stores | Global Zustand singletons | Per-instance via context provider |
| CSS | Single index.css (2200 lines) | Split: editor.css in package, app.css in app |
| Build | Vite dev + build | Vite (app) + tsup (packages) + esbuild (extension) |
| Primary interface | Browser (localhost:5173) | VSCode extension + browser app |
| File storage | Browser download/upload | Git repo (filesystem) |
| Version control | Manual save/load | Git (automatic via filesystem) |
| Collaboration | None | Git (PRs, branches) |
| All features | Unchanged | All features preserved in both surfaces |

---

## Risk Areas

**1. tldraw bundle size in VSCode webview**
tldraw is ~2-3MB gzipped. The webview will be large. Acceptable for v0.1 —
optimize later with lazy loading or static SVG preview for view mode.

**2. Store refactor (global → instance-scoped)**
The biggest code change. All components currently import `useDocumentStore`
directly. Refactoring to context-based stores touches many files. This is
the step most likely to introduce bugs.

Mitigation: Do this incrementally. First wrap existing stores in a context
provider that delegates to the same global store. Then make stores
instance-scoped. Tests catch regressions.

**3. CSS extraction**
The current `index.css` mixes ProseMirror styles, component styles, and
app-shell styles. Splitting it requires careful identification of which
styles belong where.

Mitigation: Start by copying the entire CSS file into the editor package,
then gradually move app-only styles out. Over-include initially rather
than under-include.

**4. Tiptap extensions with React components**
Extensions like BoardBlockComponent and MermaidBlockComponent use React
`NodeViewRenderer`. These need to access stores via context, not global
imports. Verify that NodeViewRenderer components can read from the new
context provider.

Mitigation: Tiptap's `ReactNodeViewRenderer` renders within the React tree,
so context propagation should work. Test early with BoardBlock specifically.

---

## Sequence (What to Build When)

```
Week-by-week execution order (not calendar estimates):

Batch 1: Foundation
├── 1.1–1.9   Monorepo scaffold
├── 2.1–2.9   Extract @dardocs/core
└── Checkpoint: pnpm dev works, core package builds

Batch 2: Editor Package
├── 3.1–3.2   Move files + extract CSS
├── 3.3–3.4   Store refactor (context provider)
├── 3.5–3.6   Viewer + public API
├── 3.7–3.10  Build config + verify apps/web
└── Checkpoint: npm pack produces working package

Batch 3: VSCode Extension
├── 4.1–4.3   Extension scaffold + webview
├── 4.4–4.5   Communication + tldraw handling
├── 4.6–4.8   Build + package + local test
└── Checkpoint: .dardocs.json opens in VSCode

Batch 4: Polish + Publish
├── 5.1–5.9   Git workflow verification
├── 6.1–6.4   Publish to npm + marketplace
└── Checkpoint: installable from npm and VS Marketplace
```
