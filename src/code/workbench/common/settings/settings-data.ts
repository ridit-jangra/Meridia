import { ISetting, ISettingsTree } from "../../workbench.types.js";

export const settingsTree: ISettingsTree[] = [
  {
    name: "Editor",
    icon: "edit",
    key: "editor",
    children: [
      {
        name: "Text",
        content: "",
        key: "editorText",
        icon: "text",
      },
      {
        name: "Tab Size",
        content: "",
        key: "editorTabSize",
        icon: "tabs",
      },
      {
        name: "Word Wrap",
        content: "",
        key: "editorWordWrap",
        icon: "word",
      },
      {
        name: "Auto Save",
        content: "",
        key: "editorAutoSave",
        icon: "save",
      },
      {
        name: "Cursor",
        content: "",
        key: "editorCursor",
        icon: "text",
      },
    ],
  },
  {
    name: "Appearance",
    icon: "colors",
    key: "appearance",
    children: [
      {
        name: "Theme",
        content: "",
        key: "appearanceTheme",
        icon: "theme",
      },
      {
        name: "Font Size",
        content: "",
        key: "appearanceFontSize",
        icon: "text",
      },
      {
        name: "Zoom",
        content: "",
        key: "appearanceZoom",
        icon: "sync",
      },
    ],
  },
  {
    name: "Terminal",
    icon: "terminal",
    key: "terminal",
    children: [
      {
        name: "Shell",
        content: "",
        key: "terminalShell",
        icon: "terminal",
      },
      {
        name: "Font",
        content: "",
        key: "terminalFont",
        icon: "text",
      },
    ],
  },
  {
    name: "Files",
    icon: "file",
    key: "files",
    children: [
      {
        name: "Auto Save",
        content: "",
        key: "filesAutoSave",
        icon: "save",
      },
      {
        name: "Encoding",
        content: "",
        key: "filesEncoding",
        icon: "error",
      },
    ],
  },
];

export const settingsContent: {
  settings: {
    key: string;
    content: ISetting[];
  }[];
} = {
  settings: [
    {
      key: "editorText",
      content: [
        {
          parentKey: "editorText",
          key: "editor.fontFamily",
          label: "Font Family",
          description: "Controls the font family used in the editor.",
          type: "select",
          default: "Jetbrains Mono, monospace",
          options: [
            "Jetbrains Mono, monospace",
            "Fira Code, monospace",
            "Consolas, monospace",
            "Monaco, monospace",
            "Courier New, monospace",
            "Source Code Pro, monospace",
          ],
        },
        {
          parentKey: "editorText",
          key: "editor.fontSize",
          label: "Font Size",
          description: "Controls the font size in pixels.",
          type: "number",
          default: 14,
          min: 8,
          max: 32,
          step: 1,
        },
        {
          parentKey: "editorText",
          key: "editor.lineHeight",
          label: "Line Height",
          description:
            "Controls the line height. Use 0 to compute automatically.",
          type: "number",
          default: 0,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          parentKey: "editorText",
          key: "editor.fontWeight",
          label: "Font Weight",
          description: "Controls the font weight.",
          type: "select",
          default: "normal",
          options: [
            "normal",
            "bold",
            "100",
            "200",
            "300",
            "400",
            "500",
            "600",
            "700",
            "800",
            "900",
          ],
        },
      ],
    },

    // ===== EDITOR TAB SIZE SETTINGS =====
    {
      key: "editorTabSize",
      content: [
        {
          parentKey: "editorTabSize",
          key: "editor.tabSize",
          label: "Tab Size",
          description: "The number of spaces a tab is equal to.",
          type: "number",
          default: 2,
          min: 1,
          max: 8,
          step: 1,
        },
        {
          parentKey: "editorTabSize",
          key: "editor.insertSpaces",
          label: "Insert Spaces",
          description: "Insert spaces when pressing Tab.",
          type: "checkbox",
          default: true,
        },
        {
          parentKey: "editorTabSize",
          key: "editor.detectIndentation",
          label: "Detect Indentation",
          description: "Automatically detect indentation from file content.",
          type: "checkbox",
          default: true,
        },
      ],
    },

    // ===== EDITOR WORD WRAP SETTINGS =====
    {
      key: "editorWordWrap",
      content: [
        {
          parentKey: "editorWordWrap",
          key: "editor.wordWrap",
          label: "Word Wrap",
          description: "Controls how lines should wrap.",
          type: "select",
          default: "off",
          options: ["off", "on", "wordWrapColumn", "bounded"],
        },
        {
          parentKey: "editorWordWrap",
          key: "editor.wordWrapColumn",
          label: "Word Wrap Column",
          description:
            "Controls the wrapping column when wordWrap is 'wordWrapColumn'.",
          type: "number",
          default: 80,
          min: 1,
          max: 200,
          step: 1,
        },
      ],
    },

    // ===== EDITOR AUTO SAVE SETTINGS =====
    {
      key: "editorAutoSave",
      content: [
        {
          parentKey: "editorAutoSave",
          key: "editor.autoSave",
          label: "Auto Save",
          description: "Enable auto save of dirty files.",
          type: "checkbox",
          default: true,
        },
        {
          parentKey: "editorAutoSave",
          key: "editor.autoSaveDelay",
          label: "Auto Save Delay",
          description:
            "Delay in milliseconds after which an editor is saved automatically.",
          type: "range",
          default: 1000,
          min: 100,
          max: 5000,
          step: 100,
        },
      ],
    },

    // ===== EDITOR CURSOR SETTINGS =====
    {
      key: "editorCursor",
      content: [
        {
          parentKey: "editorCursor",
          key: "editor.cursorStyle",
          label: "Cursor Style",
          description: "Controls the cursor style.",
          type: "select",
          default: "line",
          options: [
            "line",
            "block",
            "underline",
            "line-thin",
            "block-outline",
            "underline-thin",
          ],
        },
        {
          parentKey: "editorCursor",
          key: "editor.cursorBlinking",
          label: "Cursor Blinking",
          description: "Controls the cursor animation style.",
          type: "select",
          default: "blink",
          options: ["blink", "smooth", "phase", "expand", "solid"],
        },
        {
          parentKey: "editorCursor",
          key: "editor.smoothCaretAnimation",
          label: "Smooth Caret Animation",
          description: "Enable smooth caret animation.",
          type: "checkbox",
          default: false,
        },
      ],
    },

    {
      key: "appearanceTheme",
      content: [
        {
          parentKey: "appearanceTheme",
          key: "appearance.colorTheme",
          label: "Color Theme",
          description: "Specifies the color theme used in the workbench.",
          type: "select",
          default: "Dark",
          options: ["Dark", "Light", "High Contrast"],
        },
        {
          parentKey: "appearanceTheme",
          key: "appearance.iconTheme",
          label: "Icon Theme",
          description: "Specifies the icon theme used in the workbench.",
          type: "select",
          default: "Default",
          options: ["Default", "Minimal", "None"],
        },
      ],
    },

    // ===== APPEARANCE FONT SIZE SETTINGS =====
    {
      key: "appearanceFontSize",
      content: [
        {
          parentKey: "appearanceFontSize",
          key: "appearance.uiFontSize",
          label: "UI Font Size",
          description: "Controls the font size of the UI in pixels.",
          type: "range",
          default: 13,
          min: 10,
          max: 20,
          step: 1,
        },
        {
          parentKey: "appearanceFontSize",
          key: "appearance.terminalFontSize",
          label: "Terminal Font Size",
          description: "Controls the font size of the terminal in pixels.",
          type: "number",
          default: 14,
          min: 8,
          max: 32,
          step: 1,
        },
      ],
    },

    // ===== APPEARANCE ZOOM SETTINGS =====
    {
      key: "appearanceZoom",
      content: [
        {
          parentKey: "appearanceZoom",
          key: "appearance.zoomLevel",
          label: "Zoom Level",
          description:
            "Adjust the zoom level of the window. The default is 0 and each increment increases the zoom by 20%.",
          type: "range",
          default: 0,
          min: -5,
          max: 5,
          step: 1,
        },
      ],
    },

    // ===== TERMINAL SHELL SETTINGS =====
    {
      key: "terminalShell",
      content: [
        {
          parentKey: "terminalShell",
          key: "terminal.shell.path",
          label: "Shell Path",
          description: "The path of the shell to use in the terminal.",
          type: "input",
          default: "/bin/bash",
          placeholder: "/bin/bash",
        },
        {
          parentKey: "terminalShell",
          key: "terminal.shell.args",
          label: "Shell Arguments",
          description: "Arguments to pass to the shell.",
          type: "input",
          default: "",
          placeholder: "-l",
        },
      ],
    },

    // ===== TERMINAL FONT SETTINGS =====
    {
      key: "terminalFont",
      content: [
        {
          parentKey: "terminalFont",
          key: "terminal.font.family",
          label: "Font Family",
          description: "Controls the font family of the terminal.",
          type: "select",
          default: "Jetbrains Mono, monospace",
          options: [
            "Jetbrains Mono, monospace",
            "Fira Code, monospace",
            "Consolas, monospace",
            "Monaco, monospace",
            "Courier New, monospace",
            "Source Code Pro, monospace",
          ],
        },
        {
          parentKey: "terminalFont",
          key: "terminal.font.size",
          label: "Font Size",
          description: "Controls the font size in pixels of the terminal.",
          type: "number",
          default: 14,
          min: 8,
          max: 32,
          step: 1,
        },
      ],
    },

    // ===== FILES AUTO SAVE SETTINGS =====
    {
      key: "filesAutoSave",
      content: [
        {
          parentKey: "filesAutoSave",
          key: "files.autoSave",
          label: "Auto Save",
          description: "Controls auto save of dirty files.",
          type: "checkbox",
          default: true,
        },
        {
          parentKey: "filesAutoSave",
          key: "files.autoSaveAfterDelay",
          label: "Auto Save After Delay",
          description: "Save files after a configured delay.",
          type: "checkbox",
          default: true,
        },
      ],
    },

    // ===== FILES ENCODING SETTINGS =====
    {
      key: "filesEncoding",
      content: [
        {
          parentKey: "filesEncoding",
          key: "files.encoding",
          label: "Default Encoding",
          description: "The default character set encoding to use.",
          type: "select",
          default: "utf8",
          options: [
            "utf8",
            "utf16le",
            "utf16be",
            "windows1252",
            "iso88591",
            "shiftjis",
          ],
        },
        {
          parentKey: "filesEncoding",
          key: "files.autoGuessEncoding",
          label: "Auto Guess Encoding",
          description:
            "When enabled, will attempt to guess the character set encoding.",
          type: "checkbox",
          default: false,
        },
      ],
    },
  ],
};
