# Meridia IDE - Project Context

## Project Overview
Meridia is a modern Electron-based IDE where you code and AI collaborates — never takes control. Architecture follows VS Code-like patterns with workbench/contrib/platform layers. Cross-platform desktop app built for Windows, macOS, and Linux.

## Tech Stack
- **Language**: TypeScript (ES2020, strict mode)
- **Runtime**: Electron 30.x + Node.js
- **Build**: Vite 5.x + TypeScript Compiler
- **UI**: Custom DOM library (`h()` function) + Tailwind CSS 4.x
- **State**: Redux Toolkit (RTK)
- **Editor**: Monaco Editor + xterm.js terminal
- **Package Manager**: Bun (bun.lock present, but npm/yarn compatible)

## Platform
Running on **win32** (Electron). Cross-platform builds configured via electron-builder (NSIS for Windows, DMG for macOS, AppImage for Linux).

## Build & Dev Commands
```bash
bun install                # Install dependencies
bun run dev               # Start dev server with Vite + Electron
bun run build             # Build app: tsc && vite build && electron-builder
bun run preview           # Preview production build
bun run rebuild           # Rebuild native modules (node-pty)
bun run postinstall       # Auto-rebuild after install
```

## Project Structure
```
src/
├── code/                 # Core application logic
│   ├── workbench/       # UI components & layout engine
│   ├── platform/        # Services (explorer, terminal, insight)
│   └── editor/          # Editor integrations & Monaco
├── types/               # TypeScript type definitions
├── main.ts              # App entry point
├── style.css            # Global styles
electron/
├── main.ts             # Electron main process
├── preload.ts          # IPC bridge
├── main-services/      # Native services
└── ipc/               # IPC channel definitions
shared/                # Shared types & utilities
```

## Code Style
- **Imports**: ES modules (`import/export`), no default exports except pages
- **Formatting**: No Prettier/ESLint configs found — likely manual formatting
- **TypeScript**: Strict mode enabled, no `any`, discriminated unions for state
- **Naming**: snake_case for functions/vars, PascalCase for types/components
- **Error Handling**: Explicit error types, no silent failures
- **Components**: Functional components using custom `h()` DOM library
- **State**: RTK slices (`layout.slice.ts`, `editor.slice.ts`, `explorer.slice.ts`)

## Architecture Notes
- **Registry Pattern**: `tabs_registry`, `panels_registry`, `editors_registry` for extensibility
- **Service Layer**: Platform services handle native operations (explorer, terminal, insight)
- **IPC Bridge**: Electron preload exposes `window.ipc` for secure communication
- **Layout Engine**: Dynamic layout system with presets (IDE, Agent, Editor modes)
- **Shortcut System**: Centralized shortcut service with IPC synchronization
- **Custom DOM**: Lightweight `h()` function instead of React for performance
- **Theme System**: Dark/light themes via CSS custom properties
- **Virtual Tree**: Custom virtual DOM implementation for file explorer

## Key Dependencies
- `@reduxjs/toolkit` + `react-redux` - State management
- `monaco-editor` - Code editor
- `@xterm/xterm` + addons - Terminal emulator
- `node-pty` - Native pseudoterminal
- `tailwindcss` + `@tailwindcss/vite` - Styling
- `electron-updater` - Auto-updates
- `@ridit/dev` + `@ridit/relay` - Custom dev tools