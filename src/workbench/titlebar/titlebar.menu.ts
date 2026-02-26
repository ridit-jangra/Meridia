import { ITitlebarMenuItem } from "../../core/types/lib.types";

export const titlebar_menu: ITitlebarMenuItem[] = [
  {
    name: "File",
    id: "file",
    submenu: [
      {
        id: "new-text-file",
        name: "New Text File",
        command: "editor.newFile",
      },
      {
        id: "open-file",
        name: "Open File...",
        command: "editor.openFile",
      },
      {
        id: "open-folder",
        name: "Open Folder...",
        command: "app.openFolder",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "save",
        name: "Save",
        command: "editor.save",
      },
      {
        id: "save-as",
        name: "Save As...",
        command: "editor.saveAs",
      },
      {
        id: "save-all",
        name: "Save All",
        command: "editor.saveAll",
      },
      { id: "separator-2", name: "separator" },
      {
        id: "close-editor",
        name: "Close Editor",
        command: "editor.close",
      },
      {
        id: "close-folder",
        name: "Close Folder",
        command: "editor.closeFolder",
      },
      { id: "separator-3", name: "separator" },
      {
        id: "exit",
        name: "Exit",
        command: "app.exit",
      },
    ],
  },
  {
    name: "Edit",
    id: "edit",
    submenu: [
      {
        id: "undo",
        name: "Undo",
        command: "editor.undo",
      },
      {
        id: "redo",
        name: "Redo",
        command: "editor.redo",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "cut",
        name: "Cut",
        command: "editor.cut",
      },
      {
        id: "copy",
        name: "Copy",
        command: "editor.copy",
      },
      {
        id: "paste",
        name: "Paste",
        command: "editor.paste",
      },
      { id: "separator-2", name: "separator" },
      {
        id: "find",
        name: "Find",
        command: "editor.find",
      },
      {
        id: "replace",
        name: "Replace",
        command: "editor.replace",
      },
      {
        id: "find-in-files",
        name: "Find in Files",
        command: "editor.findInFiles",
      },
    ],
  },
  {
    name: "Selection",
    id: "selection",
    submenu: [
      {
        id: "select-all",
        name: "Select All",
        command: "editor.selectAll",
      },
      {
        id: "expand-selection",
        name: "Expand Selection",
        command: "editor.expandSelection",
      },
      {
        id: "shrink-selection",
        name: "Shrink Selection",
        command: "editor.shrinkSelection",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "copy-line-up",
        name: "Copy Line Up",
        command: "editor.copyLineUp",
      },
      {
        id: "copy-line-down",
        name: "Copy Line Down",
        command: "editor.copyLineDown",
      },
      {
        id: "move-line-up",
        name: "Move Line Up",
        command: "editor.moveLineUp",
      },
      {
        id: "move-line-down",
        name: "Move Line Down",
        command: "editor.moveLineDown",
      },
    ],
  },
  {
    name: "View",
    id: "view",
    submenu: [
      {
        id: "command-palette",
        name: "Command Palette...",
        command: "app.commandPalette",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "appearence",
        name: "Appearence",
        submenu: [
          {
            id: "toggle-primary-side-bar",
            name: "Toggle Primary Side Bar",
            command: "layout.togglePrimarySideBar",
          },
          {
            id: "toggle-secondary-side-bar",
            name: "Toggle Secondary Side Bar",
            command: "layout.toggleSecondarySideBar",
          },
          {
            id: "toggle-bottom-panel",
            name: "Toggle Bottom Panel",
            command: "layout.toggleBottomPanel",
          },
        ],
      },
      { id: "separator-5", name: "separator" },
      {
        id: "explorer",
        name: "Explorer",
        command: "layout.toggleExplorer",
      },
      {
        id: "search",
        name: "Search",
        command: "layout.toggleSearch",
      },
      {
        id: "git",
        name: "Source Control",
        command: "layout.toggleGit",
      },
      { id: "separator-2", name: "separator" },
      {
        id: "terminal",
        name: "Terminal",
        command: "layout.toggleTerminal",
      },
      {
        id: "problems",
        name: "Problems",
        command: "layout.toggleProblems",
      },
      { id: "separator-3", name: "separator" },
      {
        id: "zoom-in",
        name: "Zoom In",
        command: "app.zoomIn",
      },
      {
        id: "zoom-out",
        name: "Zoom Out",
        command: "app.zoomOut",
      },
      {
        id: "zoom-reset",
        name: "Reset Zoom",
        command: "app.zoomReset",
      },
      { id: "separator-4", name: "separator" },
      {
        id: "toggle-fullscreen",
        name: "Toggle Full Screen",
        command: "app.toggleFullscreen",
      },
    ],
  },
  {
    name: "Go",
    id: "go",
    submenu: [
      {
        id: "go-to-file",
        name: "Go to File...",
        command: "editor.goToFile",
      },
      {
        id: "go-to-line",
        name: "Go to Line...",
        command: "editor.goToLine",
      },
      {
        id: "go-to-symbol",
        name: "Go to Symbol...",
        command: "editor.goToSymbol",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "go-back",
        name: "Go Back",
        command: "editor.goBack",
      },
      {
        id: "go-forward",
        name: "Go Forward",
        command: "editor.goForward",
      },
    ],
  },
  {
    name: "Terminal",
    id: "terminal",
    submenu: [
      {
        id: "new-terminal",
        name: "New Terminal",
        command: "terminal.new",
      },
      {
        id: "split-terminal",
        name: "Split Terminal",
        command: "terminal.split",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "clear-terminal",
        name: "Clear",
        command: "terminal.clear",
      },
      {
        id: "kill-terminal",
        name: "Kill Active Terminal",
        command: "terminal.kill",
      },
    ],
  },
  {
    name: "Help",
    id: "help",
    submenu: [
      {
        id: "welcome",
        name: "Welcome",
        command: "app.welcome",
      },
      {
        id: "documentation",
        name: "Documentation",
        command: "app.documentation",
      },
      { id: "separator-1", name: "separator" },
      {
        id: "keyboard-shortcuts",
        name: "Keyboard Shortcuts Reference",
        command: "app.keyboardShortcuts",
      },
      { id: "separator-2", name: "separator" },
      {
        id: "check-updates",
        name: "Check for Updates...",
        command: "app.checkUpdates",
      },
      { id: "separator-3", name: "separator" },
      {
        id: "about",
        name: "About",
        command: "app.about",
      },
    ],
  },
];
