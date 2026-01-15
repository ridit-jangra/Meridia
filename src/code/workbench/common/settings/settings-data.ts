import { ISettingsTree } from "../../workbench.types.js";
import { getThemeIcon } from "../../browser/media/icons.js";
import { getFileIcon } from "../utils.js";

export const settingsTree: ISettingsTree[] = [
  {
    name: "Editor",
    icon: getThemeIcon("edit"),
    key: "editor",
    children: [
      {
        name: "Font Size",
        content: "",
        key: "editor-font-size",
        icon: getThemeIcon("text"),
      },
      {
        name: "Tab Size",
        content: "",
        key: "editor-tab-size",
        icon: getThemeIcon("tabs"),
      },
      {
        name: "Word Wrap",
        content: "",
        key: "editor-word-wrap",
        icon: getThemeIcon("word"),
      },
      {
        name: "Auto Save",
        content: "",
        key: "editor-auto-save",
        icon: getThemeIcon("save"),
      },
    ],
  },
  {
    name: "Python",
    icon: getFileIcon("file.py"),
    key: "python",
    children: [
      {
        name: "Language Server",
        content: "",
        key: "python-lsp",
        icon: getThemeIcon("server"),
      },
      {
        name: "Linting",
        content: "",
        key: "python-linting",
        icon: getThemeIcon("warning"),
      },
      {
        name: "Formatting",
        content: "",
        key: "python-formatting",
        icon: getThemeIcon("format"),
      },
      {
        name: "Interpreter Path",
        content: "",
        key: "python-interpreter",
        icon: getThemeIcon("class"),
      },
    ],
  },
  {
    name: "TypeScript",
    icon: getFileIcon("file.ts"),
    key: "typescript",
    children: [
      {
        name: "Language Server",
        content: "",
        key: "typescript-lsp",
        icon: getThemeIcon("server"),
      },
      {
        name: "Type Checking",
        content: "",
        key: "typescript-type-checking",
        icon: getThemeIcon("hierarchy"),
      },
      {
        name: "Formatting",
        content: "",
        key: "typescript-formatting",
        icon: getThemeIcon("format"),
      },
      {
        name: "Import Organization",
        content: "",
        key: "typescript-imports",
        icon: getThemeIcon("namespace"),
      },
    ],
  },
  {
    name: "JavaScript",
    icon: getFileIcon("file.js"),
    key: "javascript",
    children: [
      {
        name: "Language Server",
        content: "",
        key: "javascript-lsp",
        icon: getThemeIcon("server"),
      },
      {
        name: "Validation",
        content: "",
        key: "javascript-validation",
        icon: getThemeIcon("warning"),
      },
      {
        name: "Formatting",
        content: "",
        key: "javascript-formatting",
        icon: getThemeIcon("format"),
      },
      {
        name: "Suggestions",
        content: "",
        key: "javascript-suggestions",
        icon: getThemeIcon("lightning"),
      },
    ],
  },
  {
    name: "Terminal",
    icon: getThemeIcon("terminal"),
    key: "terminal",
    children: [
      {
        name: "Shell Path",
        content: "",
        key: "terminal-shell",
        icon: getThemeIcon("shell"),
      },
      {
        name: "Font Family",
        content: "",
        key: "terminal-font",
        icon: getThemeIcon("text"),
      },
      {
        name: "Cursor Style",
        content: "",
        key: "terminal-cursor",
        icon: getThemeIcon("colors"),
      },
    ],
  },
  {
    name: "Extensions",
    icon: getThemeIcon("extension"),
    key: "extensions",
    children: [
      {
        name: "Auto Update",
        content: "",
        key: "extensions-auto-update",
        icon: getThemeIcon("sync"),
      },
      {
        name: "Recommendations",
        content: "",
        key: "extensions-recommendations",
        icon: getThemeIcon("star"),
      },
    ],
  },
];
