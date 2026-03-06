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

## 2026-03-06

Nothing much just fixing some bugs, adding minor features and improving the ui to match v1 vibe.

- Improved padding and text size in virtual tree.
- Added loading state in virtual tree node.
- Update file icons like image, font, rust, etc.
- Added formatting options in lsp.
- Add custom createModelReference because monaco doesn't handle fs paths natively.
- Add codelens for usage using lsp.
- Merge v2 branch in main.

### Next Milestone

- Add Git panel and tracking information using different colors for modified, untracked and ignored.
- Add search panel to search queries across the codebase (only basic for now, will implement AI in future).
- Add settings system with very customizability options.
