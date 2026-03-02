# DEVLOG

## 2026-03-01

### LSP

- Added python-lsp-server as the primary Python language server.
- Built a custom LSP client because monaco-languageclient pulls in VS Code deps and bloats the app.
- Wired the LSP client in `src/code/editor/editor.monaco.lsp.ts`.

### Terminal

- Terminal is stable with WebGL, clipboard, fit, etc. addons.
- Using xterm for frontend and node-pty for backend.

### Editor

- Monaco is now the primary editor.
- Added a pluggable editor system (multiple editors for extensions).
- Added image viewer support.

### Explorer

- Using a virtualized tree instead of normal DOM elements.
- Added tree helpers: add, remove, rename.

### UI

- Theme service implemented.
- UI is close to final polish.

### TODO

- Search panel missing.
- Git panel missing.
- Settings page missing.

### Future

- After core is done, start adding AI features.
