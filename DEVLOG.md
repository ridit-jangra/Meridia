# DEVLOG

## 1st March 2026

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

## 6th March 2026

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

## 9th March 2026

- Add MacOS support, add in worflow.yml to generate .dmg installer.
- Add window controls space and menu in MAC.
- Add Glass UI in components like command, command-list, contextmenu, dropdown.

### Next Milestones

- All previous milestones.
- Improve UI to match a modern UI that makes the user eyes glow.

## 29th March 2026

I know too late, was working on lens :)

- Added MacOS support by adding workflow.yml and macOS native menu and context menu support. ✅
- Added Glass UI in components: commands, command-list, contextmenu, dropdown, tooltip. ✅
- Added window controls of mac. ✅
- Added AI features using @ridit/dev. ✅
- Added custom runtime tools for meridia. ✅

### Next Milestones

- Add provider setup for lens.
- Improve chat ui.
- Add git support.
- Add search panel.
- Add problems panel.

##  19th April 2026

I haven't been working on Meridia for 20 days or something.

- I am too focused on Milo and other big projects.
- Idk if i am going to even work on this project. But I will try to finish it by this year.
