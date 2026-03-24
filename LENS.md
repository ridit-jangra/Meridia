# Lens

> Generated: 2026-03-24T13:33:16.421Z

## Overview

Meridia is an Electron-based code editor with AI collaboration features. It includes a VS Code-like workbench with panels, activity bars, and command palette. Key features include file explorer, terminal integration, Monaco editor, and workspace management. The editor supports multiple layout presets and has a Redux-based state management system.

## Architecture

The application follows a client-server architecture with Electron as the runtime. The renderer process uses a custom UI framework built with DOM manipulation utilities. Data flows through Redux for state management, with IPC channels for communication between main and renderer processes. Services like explorer, terminal, and editor are managed through platform-level classes.

## Tooling & Conventions

- **packageManager**: bun
- **language**: TypeScript
- **runtime**: Electron + Node.js
- **bundler**: Vite
- **framework**: Custom DOM-based UI framework

## Important Folders

- src/code/workbench: Contains UI components and layout system for the editor workbench
- src/code/platform: Core services like explorer, terminal, editor, and insight services
- src/code/editor: Editor implementations including Monaco editor integration
- electron: Main process code with IPC handlers and system services
- shared: Type definitions and constants shared between main and renderer processes

## Key Files

- src/main.ts: Application entry point that initializes layout engine and command palette
- electron/main.ts: Electron main process entry with window management and IPC setup
- src/code/workbench/common/state/store.ts: Redux store configuration with layout, explorer, and editor slices
- src/code/platform/explorer/explorer.service.ts: File explorer service that manages file system watching and tree structure
- src/code/platform/terminal/terminal.service.ts: Terminal service that manages xterm.js terminals and pty processes

## Patterns & Idioms

- Custom DOM element creation pattern using h() function throughout UI components
- Event emitter pattern for cross-component communication (explorer_events, terminal_events)
- Registry pattern for extensible component registration (editors_registry, panels_registry)
- Service classes with state management and action methods (explorer_service, terminal_service)

## Suggestions

- In src/code/workbench/common/state/slices/layout.slice.ts, add middleware to persist layout state to localStorage for better durability
- In electron/main-services/terminal-service.ts, add proper shell detection for Windows systems that checks multiple PowerShell versions
- In src/code/platform/explorer/explorer.service.ts, implement debouncing for file watcher events to reduce redundant updates

