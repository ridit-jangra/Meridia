# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development (Vite + Electron hot reload)
npm run build      # Full build: tsc → vite build → electron packaging
npm run preview    # Preview production build
npm run rebuild    # Rebuild native modules (node-pty) for Electron
```

There is no linting, formatting, or test runner configured.

## Architecture

Meridia is an Electron-based code editor. The codebase is split into three layers:

### 1. Electron Main Process (`electron/`)
- `electron/main.ts` — window creation, auto-updater, menu, IPC handler registration
- `electron/preload.ts` — exposes IPC bridge to renderer via `contextBridge`
- `electron/ipc/` — handlers for workspace, files, storage, shell, explorer, watcher, terminal
- `electron/lsp.resolver.ts` — detects Python interpreter and starts pylsp via `@ridit/relay`

### 2. Renderer Process (`src/`)
- `src/main.ts` — entry point; initializes layout engine, command palette, keyboard shortcuts
- `src/code/workbench/` — UI shell (layout, parts, components)
- `src/code/platform/` — core services (explorer, terminal, editor, insight, events)
- `src/code/editor/` — Monaco editor integration, LSP client, language configs
- `src/types/` — type definitions

### 3. Shared (`shared/`)
IPC channel type definitions, LSP constants, URI utilities, storage key constants — used by both main and renderer.

## Key Patterns

**No React.** The UI is built with a custom DOM utility (`h()` for element creation) and an event emitter pattern for component communication. Do not introduce React or other UI frameworks.

**Registry pattern** — editors and panels are registered into maps (e.g., `editors_registry`). This enables the pluggable/extension-ready architecture.

**Redux** manages UI state in three slices: `layout` (panels, command palette, focus), `explorer` (file tree), `editor` (open files, active tab).

**IPC** is the only way for renderer code to access the filesystem, terminal PTY, or shell. All IPC channels are typed in `shared/ipc/`.

**LSP** uses a WebSocket bridge (`@ridit/relay`) — the main process spawns the language server and forwards JSON-RPC over WebSocket; Monaco's LSP client (`src/code/editor/editor.monaco.lsp.ts`) connects to it.

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

`node-pty` is a native module. After any `npm install`, run `npm run rebuild` to recompile it against the installed Electron version. This is automated via `postinstall`.
