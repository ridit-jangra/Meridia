# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meridia is a modern Electron-based code editor with AI collaboration features. It uses Monaco Editor for code editing with LSP (Language Server Protocol) support for Python (pylsp).

## Commands

```bash
# Install dependencies
npm install

# Rebuild native modules (required after install - node-pty)
npm run rebuild

# Run development mode
npm run dev

# Build for production
npm run build
```

## Architecture

### Electron Main Process (`electron/`)
- `main.ts` - Entry point, window creation, IPC handlers, LSP server initialization
- `preload.ts` - Secure bridge exposing IPC APIs to renderer
- `server/lsp.server.ts` - WebSocket-based LSP bridge that spawns language servers (currently Python/pylsp)

### IPC Handlers (`electron/ipc/`)
- `workspace-ipc.ts` - Workspace management
- `files-ipc.ts` - File system operations
- `storage-ipc.ts` - Persistent storage
- `shell-ipc.ts` - Shell execution
- `explorer-ipc.ts` - File explorer operations
- `watcher-ipc.ts` - File system watching
- `terminal-ipc.ts` - Terminal pty management

### Renderer Process (`src/`)
- `main.ts` - Frontend entry point, initializes layout engine and command palette

#### Code Structure (`src/code/`)
- `editor/` - Monaco editor integration, LSP client setup, themes
- `platform/` - Core services:
  - `explorer/` - File tree management with chokidar for file watching
  - `events/` - Event emitter system for editor, explorer, terminal, layout events
  - `history/` - Navigation history tracking
  - `insight/` - AI insights service
- `workbench/` - UI framework:
  - `browser/layouts/` - Golden Layout based panel system with presets (ide, editor, agent)
  - `browser/parts/` - UI components (activitybar, tabs, statusbar, panels, context menus, etc.)
  - `common/` - State management (Redux store), shortcuts, focus management

### Shared (`shared/`)
- Types, constants, URI utilities shared between main and renderer processes

## Key Technical Details

- **State Management**: Redux Toolkit with slices for layout, editor, terminal state
- **Layout System**: Custom panel system with presets (ide, editor, agent)
- **LSP Integration**: Custom WebSocket bridge spawns pylsp server process, handles message routing with position clamping for out-of-bounds requests
- **Terminal**: node-pty + xterm.js for cross-platform terminal emulation
- **Python Discovery**: Auto-detects Python installations on Windows (various Python versions) and Unix PATH
- **Native Modules**: node-pty requires rebuilding with electron-rebuild after npm install

## TypeScript Configuration

The `tsconfig.json` uses explicit file includes rather than broad directory scanning for the renderer. When adding new source files, add their paths to the `include` array or they won't be type-checked.
