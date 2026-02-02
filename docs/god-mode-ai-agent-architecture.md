# God Mode AI Agent Architecture: Research & Implementation Plan

How AI coding agents navigate large codebases, what open-source frameworks exist,
and a concrete plan to make DarDocs God Mode modular and swappable.

---

## Table of Contents

1. [How AI Coding Agents Work on Large Codebases](#1-how-ai-coding-agents-work-on-large-codebases)
2. [Open-Source Frameworks & Standards](#2-open-source-frameworks--standards)
3. [Recommendation for God Mode](#3-recommendation-for-god-mode)
4. [Provider Architecture (Modular Refactor)](#4-provider-architecture-modular-refactor)
5. [Implementation Prompt for Claude Code Agent](#5-implementation-prompt-for-claude-code-agent)
6. [Sources](#6-sources)

---

## 1. How AI Coding Agents Work on Large Codebases

Agents like Cursor and Claude Code don't read an entire codebase into context. They
use a **search-then-read** strategy with several key techniques.

### 1.1 Hierarchical Indexing & Retrieval

- **File tree awareness** — The agent first gets a high-level view of the directory
  structure (like running `tree` or `ls -R`). This gives it a mental map of where
  things live.
- **Targeted search** — Rather than reading everything, agents use tools like `grep`,
  `ripgrep`, `glob`, and AST-based symbol search to find specific files relevant to
  the task.
- **Iterative deepening** — They start broad (file names, directory structure) and
  narrow down (read specific files, specific functions). An agent might search for
  `"handleAuth"` across the codebase, find it in 3 files, then read only those files.

### 1.2 Context Window Management

The hard constraint is the LLM context window. Agents deal with this by:

- **Selective reading** — Only pulling in files/functions that are relevant to the
  current task. Never dumping the whole repo.
- **Summarization** — Some systems pre-compute summaries of files or modules. When a
  file is too large, the agent reads a summary first, then dives into specific sections.
- **Conversation compaction** — Long sessions get summarized periodically so the agent
  retains key decisions without filling the window with stale content.

### 1.3 Tool-Augmented Reasoning

The agent itself doesn't "know" the codebase — it has **tools** that let it explore
on demand:

| Tool | Purpose |
|------|---------|
| `glob` / `find` | Locate files by name pattern |
| `grep` / `ripgrep` | Search file contents by regex |
| `read_file` | Read specific file contents |
| `ast_search` | Find symbol definitions (classes, functions, types) |
| `git log` / `git blame` | Understand change history and authorship |
| `tree` / `ls` | Get directory structure overview |

The agent calls these tools in a loop: **reason → search → read → reason → act**.
This is the core "agentic" pattern.

### 1.4 Structural Heuristics

Agents use conventions and heuristics to skip irrelevant code:

- **Entry points first** — `package.json`, `main.ts`, `app.ts`, `index.ts` are read
  early to understand the project shape.
- **Config files** — `tsconfig.json`, `.eslintrc`, `Dockerfile` reveal tech stack and
  project structure without reading code.
- **Convention-based navigation** — If the project uses `src/routes/`, the agent knows
  to look there for API endpoints. If there's a `tests/` directory, it knows where
  tests live.
- **README / CLAUDE.md** — Project instruction files are read first as they provide a
  human-curated map of the codebase.

### 1.5 Multi-Pass Analysis

For complex tasks, agents don't try to understand everything in one pass:

1. **Pass 1: Orientation** — Directory structure, config files, entry points
2. **Pass 2: Targeted exploration** — Search for relevant code based on the task
3. **Pass 3: Deep reading** — Read the specific files that need modification
4. **Pass 4: Cross-reference** — Check related files (tests, types, imports) to
   understand dependencies

### 1.6 What This Means for God Mode

The existing God Mode implementation in `repoAnalyzer.ts` already uses several of
these patterns. The 9 parallel sub-analyzers do targeted extraction:

- `analyzeTechStack` reads config files (`package.json`, `go.mod`, `Cargo.toml`) —
  the "config files first" heuristic
- `analyzeHotZones` uses `git log` to find high-churn files — mirrors how agents use
  git history
- `analyzeApiEndpoints` does grep-based pattern matching for route definitions
- `analyzeContributors` uses `git shortlog` for authorship data
- `analyzeArchDecisions` mines commit messages for keywords like "migrate", "adopt",
  "replace"

Key techniques to adopt from coding agents:

1. **Structure-first pass** — Generate a file tree, identify entry points, detect
   monorepo structure, map module boundaries before diving into analysis.
2. **Existing doc ingestion** — Read `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`
   as a baseline the agent enhances rather than replaces.
3. **Selective LLM reasoning** — Use grep/regex to find what's relevant, then use LLM
   to understand it. Fill in the empty `description`, `inferredDefinition`, and
   `message` fields that current analyzers leave blank.
4. **Import graph analysis** — Parse import/require statements to build a dependency
   graph. Identify core modules, leaf modules, circular dependencies.
5. **Diff-aware incremental analysis** — Run `git diff` since last analysis, only
   re-run analyzers on changed files/directories.

### 1.7 Recommended Analysis Pipeline

```
Phase 1: Orientation (no LLM needed)
  ├─ File tree generation
  ├─ Config file parsing (package.json, tsconfig, etc.)
  ├─ Existing doc ingestion (README, CLAUDE.md, docs/)
  └─ Import graph construction

Phase 2: Targeted Extraction (regex/grep, current analyzers)
  ├─ Tech stack detection
  ├─ API endpoint discovery
  ├─ Contributor analysis
  ├─ Hot zone detection
  └─ Architecture decision mining

Phase 3: LLM-Augmented Understanding (new)
  ├─ Summarize key modules (feed file tree + entry points to LLM)
  ├─ Describe API endpoints in natural language (feed route files to LLM)
  ├─ Explain architecture decisions (feed commit context to LLM)
  └─ Generate glossary definitions (feed term context to LLM)

Phase 4: Document Generation (existing documentGenerator.ts)
  └─ Enhanced with Phase 1-3 data
```

Phases 1 and 2 are cheap (no API calls). Phase 3 is where you selectively call the
LLM only on the most important files — keeping costs down while adding real
understanding. This is exactly the economy that coding agents use: **cheap tools for
discovery, expensive LLM calls only for understanding**.

---

## 2. Open-Source Frameworks & Standards

### 2.1 Repomix — Codebase Packing

[Repomix](https://github.com/yamadashy/repomix) packs an entire repo into a single
AI-friendly file (XML, Markdown, or JSON).

- Respects `.gitignore` and custom ignore patterns
- Provides token counts per file (critical for LLM context budgets)
- Uses **Tree-sitter** for a `--compress` mode that extracts key code structures
  while reducing token count
- Runs security checks via Secretlint to avoid leaking secrets
- Works as an **MCP server** so AI assistants can pull repo context on demand

**God Mode relevance:** If you add an LLM reasoning phase, Repomix could prepare the
input. Run `repomix --compress` on a cloned repo and feed the output directly to the
LLM for summarization, rather than building custom file-reading logic.

### 2.2 Aider's RepoMap — AST-Based Repo Maps

[Aider](https://github.com/Aider-AI/aider) pioneered a technique called
[RepoMap](https://aider.chat/docs/repomap.html):

1. **Tree-sitter parses** every source file into an AST
2. **Extracts definitions** — functions, classes, types, variables — and their
   cross-file references
3. **Builds a dependency graph** where nodes are files and edges are import/reference
   relationships
4. **Runs PageRank** on the graph to rank files by importance (files referenced by
   many others rank higher)
5. **Budget-aware output** — uses binary search to fit the most important symbols into
   a configurable token budget

This approach is **lightweight and deterministic** — no GPU, no embeddings, no vector
database. It runs offline and is very fast. A
[research paper (Oct 2025)](https://www.preprints.org/manuscript/202510.0924) found
Aider's graph-based approach achieves the highest efficiency (4.3–6.5% context
utilization) while preserving architectural context.

There's also a standalone version called
[RepoMapper](https://github.com/pdavis68/RepoMapper) that works as both a CLI and
MCP server.

**God Mode relevance:** Directly applicable. Could replace grep-based endpoint
discovery with AST-based extraction (more accurate, fewer false positives). The
PageRank ranking would auto-identify the most important files/modules to highlight in
documentation. The import/dependency graph powers the "System Interaction Map".

### 2.3 Claude Context (Zilliz) — Vector Search

[Claude Context](https://github.com/zilliztech/claude-context) indexes a codebase
using **hybrid search** (BM25 + dense vector embeddings):

- AST-based code splitting (understands function/class boundaries, not just line chunks)
- Supports multiple embedding providers (OpenAI, VoyageAI, Ollama, Gemini)
- **Incremental indexing** using Merkle trees — only re-indexes changed files
- Claims ~40% token reduction vs naive approaches at equivalent retrieval quality

**God Mode relevance:** The **incremental indexing via Merkle trees** is the key
insight. The existing `ensureClone()` already tracks clone freshness with a 4-hour
stale threshold. Adding a Merkle-tree-based change tracker would enable the auto-update
feature to precisely identify which files changed and only re-analyze those.

### 2.4 code-graph-rag — Knowledge Graphs

[code-graph-rag](https://github.com/vitali87/code-graph-rag) builds a full knowledge
graph of a codebase:

- Uses Tree-sitter for multi-language parsing
- Builds a graph database of code relationships (not just file-level, but
  function/class-level)
- Supports natural language queries ("how does authentication work?")
- Added semantic search via UniXcoder embeddings (Oct 2025)
- Works as an MCP server with Claude Code

**God Mode relevance:** Most ambitious approach, probably overkill for doc generation.
But the concept of a queryable knowledge graph could power a future feature where
users ask questions about their codebase and get answers grounded in the actual code
structure.

### 2.5 Model Context Protocol (MCP) — The Integration Standard

[MCP](https://modelcontextprotocol.io/specification/2025-11-25) is the open standard
(originally from Anthropic, now under the
[Linux Foundation](https://en.wikipedia.org/wiki/Model_Context_Protocol)) for how AI
agents connect to external tools and data sources. Adopted by OpenAI, Google
DeepMind, and others.

Several MCP servers exist for codebase analysis:

- **Repomix MCP** — pack repos on demand
- **Tree-sitter MCP** — expose AST parsing as a tool
- **Chroma MCP** — semantic search with persistent storage
- **Semgrep MCP** — static analysis and vulnerability scanning

**God Mode relevance:** Rather than building all analysis logic into `repoAnalyzer.ts`,
the analysis pipeline could be defined as MCP tool calls. This lets users bring their
own analysis tools (e.g., a team with a custom Semgrep ruleset could plug it in). It
also future-proofs the architecture — as better MCP servers emerge, DarDocs could use
them without code changes.

### 2.6 AGENTS.md — The Context File Standard

[AGENTS.md](https://agents.md/) is the **vendor-neutral standard** for telling AI
agents about a codebase. Used by 60k+ open source projects and supported by Codex,
Cursor, Amp, Zed, and others. It's essentially what `CLAUDE.md` is for Claude Code,
but cross-tool.

**God Mode relevance:** The analyzer should **read AGENTS.md / CLAUDE.md / README.md**
as a first step. These files are human-curated maps of the codebase — they tell you
what the project is, how it's structured, and what matters. The doc generator should
treat them as a trusted baseline to build on. This is low-hanging fruit.

### 2.7 Cline — Three-Tier Retrieval (No Indexing)

[Cline](https://github.com/cline/cline) takes a lightweight approach with no
pre-indexing:

1. Regex-based content search using ripgrep with result limits and output caps
2. Fuzzy file/folder search combining file listing with fzf matching and custom scoring
3. AST-based definition extraction using Tree-sitter parsers for multi-language
   syntactic analysis

Intelligence emerges from LLM-driven orchestration rather than vector embeddings.

**God Mode relevance:** Validates that a grep + Tree-sitter approach (without a vector
database) is a viable and proven strategy. This is essentially the direction the
provider architecture enables — start with grep, upgrade to Tree-sitter, let the LLM
orchestrate.

---

## 3. Recommendation for God Mode

No single framework wins across the board. Different parts of the pipeline have
different needs.

### 3.1 Which Framework for Which Analyzer

#### Category 1: Git History Extraction — Keep As-Is

| Analyzer | What It Does | Recommendation |
|---|---|---|
| `analyzeContributors` | `git shortlog` + `git log --numstat` | **No framework needed.** Raw git commands are the right tool. |
| `analyzeHotZones` | `git log --name-only` + change counting | Same — raw git is optimal. |
| `analyzeArchDecisions` | Commit message keyword mining + ADR scan | Same. |

#### Category 2: Config File Parsing — Keep As-Is

| Analyzer | What It Does | Recommendation |
|---|---|---|
| `analyzeTechStack` | Reads `package.json`, `go.mod`, `Cargo.toml` | **No framework needed.** Hardcoded detection logic is correct. |
| `analyzeSetupSteps` | Reads config files to infer setup commands | Same. |

#### Category 3: Grep-Based Code Search — Upgrade to Tree-sitter

| Analyzer | Current Approach | Problem | Better Approach |
|---|---|---|---|
| `analyzeApiEndpoints` | `grep -E` for `.get(`, `.post(` | Matches in comments, strings, test files. Misses dynamic routes. | **Tree-sitter** — extract actual function call nodes |
| `analyzeErrorPatterns` | `grep -E` for `class.*Error extends` | Can't extract error message or status code reliably | **Tree-sitter** — parse the class body, extract constructor args |
| `analyzeGlossary` | `grep -oh` for uppercase 2-6 char tokens | No semantic understanding. Returns empty `inferredDefinition`. | **Tree-sitter + LLM** — find terms in context, LLM infers definitions |
| `analyzeConnections` | `grep -rl` for repo name + URL patterns | Misses env-var-based URLs, SDK clients, shared proto files. | **Tree-sitter** for import graph + **LLM** to classify connections |

**Recommended tool:** Aider's RepoMap approach (Tree-sitter + graph). The
[RepoMapper](https://github.com/pdavis68/RepoMapper) standalone tool is MIT-licensed.

#### Category 4: LLM-Augmented Understanding — Add with Repomix

Several analyzers produce data with empty fields only an LLM can fill:

- `analyzeApiEndpoints` → `description: ''` (line 338)
- `analyzeGlossary` → `inferredDefinition: ''` (line 456)
- `analyzeErrorPatterns` → `message: ''` (line 379)
- `analyzeHotZones` → `description` is just `Changed N times...` (line 195)

**Recommended tool:** [Repomix](https://github.com/yamadashy/repomix) to prepare
context, then the existing LLM reasoning engine in `apps/agent/src/reasoning/` to
fill in the gaps.

Workflow:
1. Grep/tree-sitter phase identifies the *locations* (which files, which lines)
2. Repomix `--compress` packs those specific files into an LLM-friendly format
3. LLM fills in the descriptions, definitions, and summaries

### 3.2 Prioritized Recommendations

Ranked by impact-to-effort ratio:

| Priority | What | How | Effort |
|----------|------|-----|--------|
| 1 | **Ingest existing docs** | Read `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/` in orientation phase | Small |
| 2 | **Use Repomix for LLM context** | Run `repomix --compress` on cloned repos, feed to LLM for module summaries | Small |
| 3 | **Add Tree-sitter parsing** | Use Tree-sitter to extract function/class definitions instead of regex | Medium |
| 4 | **Merkle-tree change tracking** | Track file hashes between analyses to enable incremental re-analysis | Medium |
| 5 | **PageRank file ranking** | Build import graph + PageRank to identify most important modules to document | Medium |
| 6 | **Expose analysis as MCP tools** | Make analyzers callable via MCP so they're composable and extensible | Large |

---

## 4. Provider Architecture (Modular Refactor)

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  analyzeRepo() — orchestrator                       │
│  Calls providers via interfaces, not implementations │
└──────────┬──────────┬──────────┬────────────────────┘
           │          │          │
     ┌─────▼───┐ ┌────▼────┐ ┌──▼──────────┐
     │ Git     │ │ Code    │ │ Enrichment  │
     │ Provider│ │ Provider│ │ Provider    │
     └─────────┘ └─────────┘ └─────────────┘
     Impl:       Impl:       Impl:
     git CLI     grep → TS   null → LLM
     (no swap    → aider     → repomix+LLM
      needed)    → MCP       → custom
```

### 4.2 Provider Interfaces

```typescript
// GitProvider — extracts data from git history
interface GitProvider {
  getContributors(cwd: string): Promise<Contributor[]>;
  getHotZones(cwd: string): Promise<HotZone[]>;
  getArchDecisions(cwd: string): Promise<ArchDecision[]>;
}

// CodeProvider — extracts structural data from source code
// Primary swap target: starts as grep, later becomes Tree-sitter or MCP
interface CodeProvider {
  getApiEndpoints(cwd: string): Promise<ApiEndpoint[]>;
  getErrorPatterns(cwd: string): Promise<ErrorPattern[]>;
  getGlossaryTerms(cwd: string): Promise<GlossaryTerm[]>;
  getConnections(cwd: string, repoName: string, otherRepos: string[]): Promise<SystemConnection[]>;
  getTechStack(cwd: string): Promise<{ techStack: string[]; testFrameworks: string[]; cicdPlatform: string }>;
  getSetupSteps(cwd: string): Promise<SetupStep[]>;
}

// EnrichmentProvider — fills in LLM-generated fields
// Starts as no-op passthrough, later wired to LLM
interface EnrichmentProvider {
  enrichEndpoints(endpoints: ApiEndpoint[], repoContext: string): Promise<ApiEndpoint[]>;
  enrichGlossary(terms: GlossaryTerm[], repoContext: string): Promise<GlossaryTerm[]>;
  enrichHotZones(zones: HotZone[], repoContext: string): Promise<HotZone[]>;
  enrichErrors(errors: ErrorPattern[], repoContext: string): Promise<ErrorPattern[]>;
}

// ContextProvider — prepares codebase context for enrichment
// Starts as no-op, later becomes Repomix, vector search, or MCP
interface ContextProvider {
  getRepoContext(cwd: string, relevantFiles?: string[]): Promise<string>;
  getFileContext(cwd: string, filePath: string): Promise<string>;
}

// Bundle for dependency injection
interface AnalysisProviders {
  git: GitProvider;
  code: CodeProvider;
  enrichment: EnrichmentProvider;
  context: ContextProvider;
}
```

### 4.3 Refactored Orchestrator

The current `analyzeRepo()` signature:

```typescript
export async function analyzeRepo(
  config: GodModeRepoConfig,
  clonePath: string,
  otherRepoNames: string[]
): Promise<RepoAnalysis>
```

Becomes:

```typescript
export async function analyzeRepo(
  config: GodModeRepoConfig,
  clonePath: string,
  otherRepoNames: string[],
  providers: AnalysisProviders
): Promise<RepoAnalysis> {
  const { git, code, enrichment, context } = providers;

  // Phase 1: Extract (parallel, no LLM)
  const [
    contributors,
    hotZones,
    { techStack, testFrameworks, cicdPlatform },
    apiEndpoints,
    errorPatterns,
    glossary,
    setupSteps,
    archDecisions,
    connections,
  ] = await Promise.all([
    git.getContributors(clonePath),
    git.getHotZones(clonePath),
    code.getTechStack(clonePath),
    code.getApiEndpoints(clonePath),
    code.getErrorPatterns(clonePath),
    code.getGlossaryTerms(clonePath),
    code.getSetupSteps(clonePath),
    git.getArchDecisions(clonePath),
    code.getConnections(clonePath, config.repo, otherRepoNames),
  ]);

  // Phase 2: Enrich (LLM-augmented, optional)
  const repoContext = await context.getRepoContext(clonePath);
  const [enrichedEndpoints, enrichedGlossary, enrichedZones, enrichedErrors] =
    await Promise.all([
      enrichment.enrichEndpoints(apiEndpoints, repoContext),
      enrichment.enrichGlossary(glossary, repoContext),
      enrichment.enrichHotZones(hotZones, repoContext),
      enrichment.enrichErrors(errorPatterns, repoContext),
    ]);

  const pms = config.teamMembers.filter((m) => m.role === 'pm');

  return {
    repoId: config.id,
    repoName: config.repo,
    repoRole: config.role,
    description: config.description,
    contributors,
    pms,
    connections,
    glossary: enrichedGlossary,
    hotZones: enrichedZones,
    apiEndpoints: enrichedEndpoints,
    errorPatterns: enrichedErrors,
    setupSteps,
    archDecisions,
    techStack,
    testFrameworks,
    cicdPlatform,
    lastAnalyzedAt: new Date().toISOString(),
  };
}
```

### 4.4 Provider Sets

```typescript
// Today: grep-based, no LLM
const defaultProviders: AnalysisProviders = {
  git: new GitCliProvider(),
  code: new GrepCodeProvider(),
  enrichment: new NoOpEnrichment(),
  context: new NoOpContext(),
};

// Next: tree-sitter + repomix + LLM
const enhancedProviders: AnalysisProviders = {
  git: new GitCliProvider(),
  code: new TreeSitterCodeProvider(),
  enrichment: new LLMEnrichment(),
  context: new RepomixContext(),
};
```

### 4.5 Migration Path

1. **Define the interfaces now** — extract current functions into a `GrepCodeProvider`
   class that implements `CodeProvider`. Pure refactor, no new functionality.

2. **Add `ContextProvider` with Repomix** — `npx repomix --compress` on the cloned
   repo. Low effort, immediate value.

3. **Add `EnrichmentProvider` with existing LLM reasoning engine** — the
   Anthropic/OpenAI integration already exists in `apps/agent/src/reasoning/`. Wire it
   up to fill in empty `description`, `inferredDefinition`, and `message` fields.
   Biggest visible quality jump.

4. **Swap `GrepCodeProvider` → `TreeSitterCodeProvider`** — Most work but greatest
   accuracy improvement for API endpoints, error patterns, and connections. Use
   tree-sitter npm packages or adapt from RepoMapper.

5. **Add AGENTS.md / README.md ingestion** — Read existing docs as part of the
   orientation phase. Feed as additional context to the enrichment provider.

Each step is independently shippable. The interface boundaries mean you never need to
rewrite the orchestrator or the document generator — only swap provider implementations.

---

## 5. Implementation Prompt for Claude Code Agent

The following prompt is self-contained and can be given to another Claude Code agent
to execute the provider architecture refactor.

> **Coordination note:** This refactor should happen AFTER the mock-to-real migration
> is complete, since both changes touch `repoAnalyzer.ts` and `godMode.ts`. If they
> run in parallel, there will be merge conflicts. Have the mock removal agent finish
> first, then rebase this refactor on top.

---

### Prompt

```
## Task: Refactor God Mode Analysis Pipeline into a Modular Provider Architecture

### Goal

Refactor `apps/api/src/services/repoAnalyzer.ts` from hardcoded implementations
into a provider-based architecture with swappable interfaces. The current 9
sub-analyzers are all inline functions tightly coupled to specific tools (git CLI,
grep). The goal is to define provider interfaces so each extraction strategy can
be swapped independently — e.g., replacing grep-based API endpoint discovery with
Tree-sitter AST parsing later, or adding LLM-powered enrichment, without rewriting
the orchestration logic.

This is a PURE REFACTOR of the analysis pipeline. Do NOT change the output types,
the SSE streaming, the document generator, or the frontend. The `RepoAnalysis`
type in `packages/core/src/godMode/types.ts` is the contract — providers must
produce data that conforms to those existing interfaces.


### Context: Current Architecture

The analysis pipeline works like this:

    godMode.ts route (SSE) → analyzeRepo() → 9 parallel sub-analyzers → RepoAnalysis

Key files:
- `apps/api/src/services/repoAnalyzer.ts` — 9 sub-analyzers + `analyzeRepo()` orchestrator (line 695)
- `apps/api/src/routes/godMode.ts` — SSE route that calls `analyzeRepo()` (line 111)
- `packages/core/src/godMode/types.ts` — all result types (RepoAnalysis, Contributor, ApiEndpoint, etc.)
- `packages/core/src/godMode/documentGenerator.ts` — converts RepoAnalysis → TipTap JSON (DO NOT TOUCH)
- `apps/agent/src/reasoning/` — existing LLM provider infrastructure (ReasoningEngine, AnthropicProvider, OpenAIProvider)
- `apps/agent/src/reasoning/types.ts` — existing `LLMProvider` interface: `{ name: string; complete(prompt: string, systemPrompt?: string): Promise<string> }`


### What To Build

#### 1. Define Provider Interfaces

Create a new file: `packages/core/src/godMode/providers.ts`

Define these 4 interfaces:

    // -- GitProvider --
    // Extracts data from git history. Unlikely to ever need swapping.
    interface GitProvider {
      getContributors(cwd: string): Promise<Contributor[]>;
      getHotZones(cwd: string): Promise<HotZone[]>;
      getArchDecisions(cwd: string): Promise<ArchDecision[]>;
    }

    // -- CodeProvider --
    // Extracts structural data from source code. This is the primary
    // swap target — starts as grep, later becomes Tree-sitter or MCP.
    interface CodeProvider {
      getApiEndpoints(cwd: string): Promise<ApiEndpoint[]>;
      getErrorPatterns(cwd: string): Promise<ErrorPattern[]>;
      getGlossaryTerms(cwd: string): Promise<GlossaryTerm[]>;
      getConnections(cwd: string, repoName: string, otherRepos: string[]): Promise<SystemConnection[]>;
      getTechStack(cwd: string): Promise<{ techStack: string[]; testFrameworks: string[]; cicdPlatform: string }>;
      getSetupSteps(cwd: string): Promise<SetupStep[]>;
    }

    // -- EnrichmentProvider --
    // Fills in LLM-generated fields (descriptions, definitions, summaries).
    // Starts as a no-op passthrough, later wired to LLM.
    interface EnrichmentProvider {
      enrichEndpoints(endpoints: ApiEndpoint[], repoContext: string): Promise<ApiEndpoint[]>;
      enrichGlossary(terms: GlossaryTerm[], repoContext: string): Promise<GlossaryTerm[]>;
      enrichHotZones(zones: HotZone[], repoContext: string): Promise<HotZone[]>;
      enrichErrors(errors: ErrorPattern[], repoContext: string): Promise<ErrorPattern[]>;
    }

    // -- ContextProvider --
    // Prepares codebase context as a string for the enrichment provider.
    // Starts as a no-op (returns ""), later becomes Repomix, vector search, etc.
    interface ContextProvider {
      getRepoContext(cwd: string, relevantFiles?: string[]): Promise<string>;
      getFileContext(cwd: string, filePath: string): Promise<string>;
    }

    // Bundle type for dependency injection
    interface AnalysisProviders {
      git: GitProvider;
      code: CodeProvider;
      enrichment: EnrichmentProvider;
      context: ContextProvider;
    }

Export these from `packages/core/src/godMode/index.ts`.


#### 2. Create Default Provider Implementations

Create: `apps/api/src/services/providers/`

**`apps/api/src/services/providers/GitCliProvider.ts`**
- Implements `GitProvider`
- Move `analyzeContributors` (repoAnalyzer.ts lines 75-137), `analyzeHotZones`
  (lines 139-200), and `analyzeArchDecisions` (lines 572-628) into this class as
  methods
- Keep the `exec()` helper and constants (`GIT_TIMEOUT`) — either move them to a
  shared utils file or keep them in-scope

**`apps/api/src/services/providers/GrepCodeProvider.ts`**
- Implements `CodeProvider`
- Move `analyzeApiEndpoints` (lines 301-349), `analyzeErrorPatterns` (lines 351-390),
  `analyzeGlossary` (lines 392-462), `analyzeConnections` (lines 630-691),
  `analyzeTechStack` (lines 202-299), and `analyzeSetupSteps` (lines 464-570) into
  this class
- Keep the `GREP_TIMEOUT`, `IGNORE_DIRS`, `SOURCE_EXTENSIONS` constants,
  `readFileIfExists`, `fileExists` helpers

**`apps/api/src/services/providers/NoOpEnrichment.ts`**
- Implements `EnrichmentProvider`
- Every method is a passthrough that returns the input unchanged
- This preserves current behavior exactly

**`apps/api/src/services/providers/NoOpContext.ts`**
- Implements `ContextProvider`
- `getRepoContext()` returns `""`
- `getFileContext()` returns `""`

**`apps/api/src/services/providers/index.ts`**
- Export a `createDefaultProviders()` function that returns an `AnalysisProviders`
  bundle using the 4 implementations above


#### 3. Refactor `analyzeRepo()` to Use Providers

The current signature:

    export async function analyzeRepo(
      config: GodModeRepoConfig,
      clonePath: string,
      otherRepoNames: string[]
    ): Promise<RepoAnalysis>

Change to:

    export async function analyzeRepo(
      config: GodModeRepoConfig,
      clonePath: string,
      otherRepoNames: string[],
      providers: AnalysisProviders
    ): Promise<RepoAnalysis>

The function body becomes:

    const { git, code, enrichment, context } = providers;

    // Phase 1: Extract (parallel, no LLM)
    const [
      contributors,
      hotZones,
      { techStack, testFrameworks, cicdPlatform },
      apiEndpoints,
      errorPatterns,
      glossary,
      setupSteps,
      archDecisions,
      connections,
    ] = await Promise.all([
      git.getContributors(clonePath),
      git.getHotZones(clonePath),
      code.getTechStack(clonePath),
      code.getApiEndpoints(clonePath),
      code.getErrorPatterns(clonePath),
      code.getGlossaryTerms(clonePath),
      code.getSetupSteps(clonePath),
      git.getArchDecisions(clonePath),
      code.getConnections(clonePath, config.repo, otherRepoNames),
    ]);

    // Phase 2: Enrich (LLM-augmented, optional)
    const repoContext = await context.getRepoContext(clonePath);
    const [enrichedEndpoints, enrichedGlossary, enrichedZones, enrichedErrors] =
      await Promise.all([
        enrichment.enrichEndpoints(apiEndpoints, repoContext),
        enrichment.enrichGlossary(glossary, repoContext),
        enrichment.enrichHotZones(hotZones, repoContext),
        enrichment.enrichErrors(errorPatterns, repoContext),
      ]);

    const pms = config.teamMembers.filter((m) => m.role === 'pm');

    return {
      repoId: config.id,
      repoName: config.repo,
      repoRole: config.role,
      description: config.description,
      contributors,
      pms,
      connections,
      glossary: enrichedGlossary,
      hotZones: enrichedZones,
      apiEndpoints: enrichedEndpoints,
      errorPatterns: enrichedErrors,
      setupSteps,
      archDecisions,
      techStack,
      testFrameworks,
      cicdPlatform,
      lastAnalyzedAt: new Date().toISOString(),
    };


#### 4. Update the Route to Pass Providers

In `apps/api/src/routes/godMode.ts` line 111, the call:

    const analysis = await analyzeRepo(repo, clone.diskPath, otherRepos);

Becomes:

    import { createDefaultProviders } from '../services/providers/index.js';

    // Create providers once at the top of the request handler
    const providers = createDefaultProviders();

    // ...then in the loop:
    const analysis = await analyzeRepo(repo, clone.diskPath, otherRepos, providers);


### Rules

1. **DO NOT change any types in `packages/core/src/godMode/types.ts`** — the
   `RepoAnalysis`, `Contributor`, `ApiEndpoint`, etc. interfaces are the contract.
   Providers must produce data matching these types exactly.

2. **DO NOT touch `documentGenerator.ts`** — it consumes `RepoAnalysis` and must
   continue to work unchanged.

3. **DO NOT change the SSE streaming logic in `godMode.ts`** — only change the
   `analyzeRepo()` call to pass providers.

4. **DO NOT change behavior** — the `GrepCodeProvider` + `GitCliProvider` +
   `NoOpEnrichment` + `NoOpContext` combination must produce IDENTICAL output to
   what the current hardcoded functions produce. This is a refactor, not a feature
   change.

5. **Move code, don't rewrite it** — the sub-analyzer implementations should be
   copy-pasted into their provider classes with minimal changes (just wrapping them
   as class methods). Don't "improve" the grep patterns or git commands.

6. **Keep the shared helpers accessible** — the `exec()` function,
   `readFileIfExists`, `fileExists`, `IGNORE_DIRS`, `SOURCE_EXTENSIONS` etc. should
   be extracted to a shared utils file (e.g.,
   `apps/api/src/services/providers/utils.ts`) since both `GitCliProvider` and
   `GrepCodeProvider` need them.

7. **Export the interfaces from @dardocs/core** — the provider interfaces go in
   `packages/core/src/godMode/providers.ts` and are re-exported from
   `packages/core/src/godMode/index.ts`. The implementations go in
   `apps/api/src/services/providers/`.

8. **Run `npm run build` from the project root after making changes** to verify
   nothing is broken. Run `npm run test` if tests exist.


### File Changes Summary

New files:
- `packages/core/src/godMode/providers.ts` — interface definitions
- `apps/api/src/services/providers/utils.ts` — shared exec(), readFileIfExists, fileExists, constants
- `apps/api/src/services/providers/GitCliProvider.ts` — implements GitProvider
- `apps/api/src/services/providers/GrepCodeProvider.ts` — implements CodeProvider
- `apps/api/src/services/providers/NoOpEnrichment.ts` — implements EnrichmentProvider (passthrough)
- `apps/api/src/services/providers/NoOpContext.ts` — implements ContextProvider (returns "")
- `apps/api/src/services/providers/index.ts` — createDefaultProviders() factory

Modified files:
- `packages/core/src/godMode/index.ts` — add exports for provider interfaces
- `apps/api/src/services/repoAnalyzer.ts` — slim down to just the orchestrator function that calls providers
- `apps/api/src/routes/godMode.ts` — pass providers to analyzeRepo()


### Why This Architecture

The provider interfaces are the seam points for future changes:

- **Swap GrepCodeProvider → TreeSitterCodeProvider**: Use tree-sitter AST parsing for
  more accurate endpoint/error/symbol extraction. No changes to orchestrator or doc
  generator.
- **Swap NoOpEnrichment → LLMEnrichment**: Wire in the existing ReasoningEngine from
  `apps/agent/src/reasoning/` to fill in the empty `description`,
  `inferredDefinition`, and `message` fields. The LLMProvider interface already exists
  at `apps/agent/src/reasoning/types.ts`.
- **Swap NoOpContext → RepomixContext**: Run `npx repomix --compress` on the clone dir
  to prepare LLM-friendly codebase summaries. Or use a vector DB. The orchestrator
  doesn't care which.
- **Swap NoOpContext → MCPContext**: Call an MCP server for codebase context retrieval.
  Same interface, different backend.

Each swap is isolated to one provider file. The orchestrator, types, SSE route, and
document generator remain untouched.
```

---

## 6. Sources

- [Repomix — Pack your codebase into AI-friendly formats](https://repomix.com/)
- [Repomix GitHub](https://github.com/yamadashy/repomix)
- [Aider RepoMap docs](https://aider.chat/docs/repomap.html)
- [Aider — Building a better repository map with Tree-sitter](https://aider.chat/2023/10/22/repomap.html)
- [Claude Context (Zilliz) GitHub](https://github.com/zilliztech/claude-context)
- [code-graph-rag GitHub](https://github.com/vitali87/code-graph-rag)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [AGENTS.md](https://agents.md/)
- [RepoMapper GitHub](https://github.com/pdavis68/RepoMapper)
- [Code Retrieval Techniques in Coding Agents (Research Preprint)](https://www.preprints.org/manuscript/202510.0924)
- [Semantic Code Indexing with AST and Tree-sitter](https://medium.com/@email2dineshkuppan/semantic-code-indexing-with-ast-and-tree-sitter-for-ai-agents-part-1-of-3-eb5237ba687a)
- [Tree-sitter MCP Server](https://www.pulsemcp.com/servers/wrale-tree-sitter)
