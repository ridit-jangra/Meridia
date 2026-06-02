# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development (Vite + Electron hot reload)
npm run build      # Full build: tsc → vite build → electron-builder packaging
npm run preview    # Preview production build
npm run rebuild    # Rebuild native modules (node-pty) for Electron
```

There is no linting, formatting, or test runner configured. However, `tsc` runs as the
first step of `build` with `strict`, `noUnusedLocals`, and `noUnusedParameters` enabled —
unused variables/parameters or type errors will fail the build, so keep the tree clean.

Local-dev prerequisites: Node 20.x and Python 3.x (the latter only for the Python LSP).
`bun.lock` is committed, but the npm scripts above are the canonical workflow.

## Architecture

Meridia is an Electron-based code editor following VS Code-like layering (workbench /
contrib / platform). The codebase splits into three top-level layers:

### 1. Electron Main Process (`electron/`)
- `electron/main.ts` — window creation, auto-updater, menu, IPC registration, and the
  `@ridit/relay` WebSocket **Server** for the LSP bridge.
- `electron/preload.ts` — exposes the typed IPC bridge to the renderer via `contextBridge`.
- `electron/ipc/` — **thin** IPC handlers (chat, clipboard, dialog, explorer, files, git,
  shell, storage, terminal, watcher, workspace).
- `electron/main-services/` — the **actual** main-process service logic (explorer, git,
  storage, terminal, workspace). IPC handlers delegate here; put real logic in services.
- `electron/lsp.resolver.ts` — detects a Python interpreter and resolves `pylsp`.

### 2. Renderer Process (`src/`)
- `src/main.ts` — entry point; initializes the layout engine, command palette, shortcuts.
- `src/code/workbench/` — UI shell, itself split three ways:
  - `browser/parts/` — visual parts (activitybar, titlebar, statusbar, tabs, panels, and
    shared `components/`).
  - `common/` — cross-cutting infra: Redux store + slices (`common/state/`), the shortcut
    service with when-clauses (`common/shortcut/`), focus tracking, virtual-tree helpers.
  - `contrib/` — feature modules (chat, editor, explorer, terminal, theme, notification)
    plus `contrib/core/` which holds the foundational primitives: `dom/h.ts` (the `h()`
    DOM builder), `event-emitter.ts`, and `registry.ts`.
- `src/code/platform/` — renderer-side services (explorer, terminal, git, history,
  insight) and their `events/` emitters.
- `src/code/editor/` — Monaco integration, the custom LSP client
  (`editor.monaco.lsp.ts`), language configs, and the pluggable editor implementations.
- `src/types/` — type definitions.

### 3. Shared (`shared/`)
IPC channel types (`shared/ipc/channels.ts`), LSP constants, URI utilities, storage-key
constants, and shared domain types — imported by both main and renderer.

## Key Patterns

**No React.** UI is built with the custom `h()` DOM builder (`contrib/core/dom/h.ts`) and
an event-emitter pattern for component communication. `react-redux` is present only as RTK
glue — do not introduce React or any other UI framework.

**snake_case for functions and variables** (e.g. `resolve_python`, `explorer_service`).
Types and components use PascalCase. Match this; it is consistent across the codebase.

**Registry pattern** — `contrib/core/registry.ts` exports maps (`editors_registry`,
`panels_registry`, `tabs_registry`, ...) that map keys to element factories. This is what
makes parts pluggable/extension-ready.

**Redux (RTK)** — store in `src/code/workbench/common/state/store.ts` with three slices:
`layout` (panels, command palette, focus), `explorer` (file tree), `editor` (open files,
active tab). Use the typed hooks in `common/state/hooks.ts`.

**IPC is the only renderer path to the filesystem, terminal PTY, or shell.** All channels
are typed in `shared/ipc/`; renderer reaches them via the `contextBridge` preload.

**LSP** uses `@ridit/relay`: the main process runs the relay `Server` and spawns the
language server, forwarding JSON-RPC over WebSocket; the renderer's `Client`
(`src/code/editor/editor.monaco.lsp.ts`) connects to it. A custom client is used
deliberately to avoid pulling VS Code deps via `monaco-languageclient`.

## First-Party Packages

| Package | Role |
|---|---|
| `@ridit/relay` | WebSocket JSON-RPC bridge between main (Server) and renderer (Client) for LSP |
| `@ridit/dev` | AI feature tooling (`Tool` types, chat) used by the chat contrib/IPC |
| `@ridit/ai` | AI runtime support |

## File Naming Conventions

| Pattern | Example |
|---|---|
| `<domain>.service.ts` | `explorer.service.ts` |
| `<domain>.events.ts` | `editor.events.ts` |
| `<domain>.slice.ts` | `layout.slice.ts` |
| `<domain>.actions.ts` | `explorer.actions.ts` |
| `<domain>.helper.ts` | `editor.helper.ts` |
| `<domain>.types.ts` | `theme.types.ts` |

## Native Modules

`node-pty` is a native module. After any `npm install`, run `npm run rebuild`
(`electron-rebuild`) to recompile it against the installed Electron version. This is
automated via `postinstall`.
