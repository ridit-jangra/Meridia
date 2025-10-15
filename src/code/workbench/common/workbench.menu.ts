import { Menuitems } from "../workbench.types.js";

export const menuItems: Menuitems[] = [
  {
    label: "File",
    submenu: [
      {
        label: "Open File",
        action: "workbench.editor.open",
        shortcut: ["ctrl", "o"],
      },
      {
        label: "Open Folder",
        action: "workbench.files.open",
        shortcut: ["ctrl", "shift", "o"],
      },
      {
        label: "",
        separator: true,
      },
      {
        label: "Save",
        action: "workbench.editor.save",
        shortcut: ["ctrl", "s"],
      },
      {
        label: "Save as",
        action: "workbench.editor.save.as",
        shortcut: ["ctrl", "shift", "s"],
      },
      {
        label: "",
        separator: true,
      },
      {
        label: "Close Editor",
        action: "workbench.editor.close",
        shortcut: ["ctrl", "w"],
      },
      {
        label: "Close Folder",
        action: "workbench.files.close",
        shortcut: ["ctrl", "shift", "w"],
      },
      {
        label: "Exit",
        action: "workbench.exit",
        shortcut: ["ctrl", "q"],
      },
    ],
  },
  {
    label: "Edit",
    submenu: [
      {
        label: "Undo",
        action: "workbench.undo",
        shortcut: ["ctrl", "u"],
      },
      {
        label: "Redo",
        action: "workbench.redo",
        shortcut: ["ctrl", "r"],
      },
      {
        label: "",
        separator: true,
      },
      {
        label: "Copy",
        action: "workbench.copy",
        shortcut: ["ctrl", "c"],
      },
      {
        label: "Paste",
        action: "workbench.paste",
        shortcut: ["ctrl", "v"],
      },
      {
        label: "",
        separator: true,
      },
      {
        label: "Find",
        action: "workbench.find",
        shortcut: ["ctrl", "f"],
      },
      {
        label: "Replace",
        action: "workbench.replace",
        shortcut: ["ctrl", "h"],
      },
    ],
  },
  {
    label: "View",
    submenu: [
      {
        label: "Command Palette",
        action: "workbench.command.palette",
        shortcut: ["ctrl", "shift", "p"],
      },
      {
        label: "Toggle Left Panel",
        action: "workbench.panel.toggle.left",
        shortcut: ["ctrl", "b"],
      },
      {
        label: "Toggle Right Panel",
        action: "workbench.panel.toggle.right",
        shortcut: ["ctrl", "alt", "b"],
      },
      {
        label: "Toggle Bottom Panel",
        action: "workbench.panel.toggle.bottom",
        shortcut: ["ctrl", "j"],
      },
    ],
  },
];
