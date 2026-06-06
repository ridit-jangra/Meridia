# AGENTS.md

Tight guide for OpenCode agents working in `Meridia/`. For deeper architecture see `CLAUDE.md`.

## Commands

- `npm run dev` — Vite dev server; `vite-plugin-electron/simple` auto-launches Electron with HMR.
- `npm run build` — runs in this exact order: `tsc` → `vite build` → `electron-builder`. If `tsc` fails, nothing else runs.
- `npm run rebuild` — recompiles `node-pty` against the installed Electron. Runs automatically via `postinstall` after every `npm install`.
- `npm run preview` — preview the renderer only (no Electron).

There is **no test runner, linter, or formatter configured**. `tsc` (strict, `noUnusedLocals`, `noUnusedParameters`) is the only gate. Unused imports/params or type errors will fail the build.

## Setup gotchas

- Node 20.x required. Python 3.x is only needed for the Python LSP (`pylsp`, resolved by `electron/lsp.resolver.ts`).
- `bun.lock` is committed, but use the `npm` scripts — they are the canonical workflow.
- `node-pty` is a native module. If `npm install` was run with native ABI mismatch (e.g. wrong Electron), run `npm run rebuild` manually.

## Architecture (one-line per layer)

- `electron/` — Electron main process. `main.ts` wires window, auto-updater, menu, IPC, and the `@ridit/relay` WebSocket **Server** for LSP.
- `electron/ipc/` — **thin** handlers. Put real logic in `electron/main-services/`.
- `src/` — renderer. UI shell is `src/code/workbench/`, split into `browser/parts/`, `common/`, `contrib/`.
- `shared/` — IPC channel types, URI utils, storage keys, shared domain types. Imported by both main and renderer.

## Hard constraints (agents will get these wrong)

- **No React.** UI is built with the custom `h()` DOM builder at `src/code/workbench/contrib/core/dom/h.ts`. `react-redux` exists only as RTK glue — do not add React components or other UI frameworks.
- **Renderer reaches fs / PTY / shell only through IPC.** The `contextBridge` preload is the only bridge. Do not import `node:*` or `fs` from `src/`.
- **Naming:** `snake_case` for functions and variables; `PascalCase` for types and components. Match the surrounding file.
- **LSP is custom.** Renderer uses `@ridit/relay` `Client` (`src/code/editor/editor.monaco.lsp.ts`) over WebSocket to a main-process `Server` that spawns the language server. Do not introduce `monaco-languageclient` or `vscode-jsonrpc` LSP wrappers.
- **Registry pattern.** `src/code/workbench/contrib/core/registry.ts` exposes maps (`editors_registry`, `panels_registry`, `tabs_registry`, …). New UI parts are pluggable via these registries, not by hard-coding.
- **State.** Redux store at `src/code/workbench/common/state/store.ts` with three slices: `layout`, `explorer`, `editor`. Use the typed hooks in `common/state/hooks.ts`.

## `tsconfig.json` `include` is explicit

The `include` array in `tsconfig.json` is a hand-curated list, not a glob. New `.ts` files outside the listed paths are **silently excluded from type-checking** and may even fail to resolve at build time. When adding a new file/dir under `src/` or `electron/`, verify the path is in `include`, or the build will misbehave in confusing ways.

## Conventions that differ from defaults

- File naming: `<domain>.<role>.ts` — e.g. `explorer.service.ts`, `layout.slice.ts`, `editor.actions.ts`, `editor.helper.ts`, `*.types.ts`. See `CLAUDE.md` table.
- IPC handler module name matches the channel domain (`electron/ipc/chat.ts`, etc.) and delegates to `electron/main-services/<domain>-service.ts`.
- Generated/build output goes to `dist/` (renderer) and `dist-electron/` (main). Do not edit by hand; `.gitignore` already covers them.

## CI

Only `.github/workflows/release.yml` exists — it runs on tags and is the only automated check. There is no PR-time lint/test pipeline. Run `npm run build` locally before pushing if you want the same checks.
