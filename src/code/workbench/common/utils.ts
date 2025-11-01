import { IEditorTab, IThemeColors, ThemeColors } from "../workbench.types.js";
import { dispatch } from "./store/store.js";
import { select } from "./store/selector.js";
import { update_editor_tabs } from "./store/slice.js";

export const tokensToCssVariables: Record<IThemeColors, string> = {
  "workbench.background": "--workbench-background",
  "workbench.foreground": "--workbench-foreground",
  "workbench.border.foreground": "--workbench-border-foreground",
  "workbench.icon.foreground": "--workbench-icon-foreground",
  "workbench.primary.button.background":
    "--workbench-primary-button-background",
  "workbench.primary.button.foreground":
    "--workbench-primary-button-foreground",
  "workbench.secondary.button.background":
    "--workbench-secondary-button-background",
  "workbench.secondary.button.foreground":
    "--workbench-secondary-button-foreground",
  "workbench.button.border": "--workbench-button-border",
  "workbench.button.separator": "--workbench-button-separator",
  "workbench.secondary.button.border": "--workbench-secondary-button-border",
  "workbench.input.background": "--workbench-input-background",
  "workbench.input.foreground": "--workbench-input-foreground",
  "workbench.input.outline": "--workbench-input-border-foreground",
  "workbench.input.active.outline": "--workbench-input-active-outline",
  "workbench.input.icon.foreground": "--workbench-input-icon-foreground",
  "workbench.editor.background": "--workbench-editor-background",
  "workbench.editor.foreground": "--workbench-editor-foreground",
  "workbench.editor.cursor.foreground": "--workbench-editor-cursor-foreground",
  "workbench.editor.line.highlight.background":
    "--workbench-editor-line-highlight-background",
  "workbench.editor.suggestion.active.background":
    "--workbench-editor-suggestion-active-background",
  "workbench.editor.widget.background": "--workbench-editor-widget-background",
  "workbench.mira.chatbox.active.border.foreground":
    "--workbench-mira-chatbox-active-border-foreground",
  "workbench.mira.chatbox.background": "--workbench-mira-chatbox-background",
  "workbench.mira.chatbox.border.foreground":
    "--workbench-mira-chatbox-border-foreground",
  "workbench.mira.chatbox.foreground": "--workbench-mira-chatbox-foreground",
  "workbench.mira.message.ai.background":
    "--workbench-mira-message-ai-background",
  "workbench.mira.message.ai.border.foreground":
    "--workbench-mira-message-ai-border-foreground",
  "workbench.mira.message.ai.foreground":
    "--workbench-mira-message-ai-foreground",
  "workbench.mira.message.user.background":
    "--workbench-mira-message-user-background",
  "workbench.mira.message.user.border.foreground":
    "--workbench-mira-message-user-border-foreground",
  "workbench.mira.message.user.foreground":
    "--workbench-mira-message-user-foreground",
  "workbench.mira.voice.color.orange": "--workbench-mira-voice-color-orange",
  "workbench.mira.voice.color.violet": "--workbench-mira-voice-color-violet",
  "workbench.mira.voice.color.white": "--workbench-mira-voice-color-white",
  "workbench.mira.voice.color.black": "--workbench-mira-voice-color-black",
  "workbench.mira.voice.caption.active.background":
    "--workbench-mira-voice-caption-active-background",
  "workbench.tabs.background": "--workbench-tabs-background",
  "workbench.tabs.foreground": "--workbench-tabs-foreground",
  "workbench.tabs.icon.foreground": "--workbench-tabs-icon-foreground",
  "workbench.tabs.hover.background": "--workbench-tabs-hover-background",
  "workbench.tabs.hover.foreground": "--workbench-tabs-hover-foreground",
  "workbench.tabs.active.background": "--workbench-tabs-active-background",
  "workbench.tabs.active.foreground": "--workbench-tabs-active-foreground",
  "workbench.tabs.active.border.foreground":
    "--workbench-tabs-active-border-foreground",
  "workbench.scrollbar.background": "--workbench-scrollbar-background",
  "workbench.scrollbar.thumb.foreground":
    "--workbench-scrollbar-thumb-foreground",
  "workbench.scrollbar.thumb.hover.foreground":
    "--workbench-scrollbar-thumb-hover-foreground",
  "workbench.scrollbar.thumb.active.foreground":
    "--workbench-scrollbar-thumb-active-foreground",
  "workbench.terminal.background": "--workbench-terminal-background",
  "workbench.terminal.foreground": "--workbench-terminal-foreground",
  "workbench.terminal.cursor.foreground":
    "--workbench-terminal-cursor-foreground",
  "workbench.terminal.selection.background":
    "--workbench-terminal-selection-background",
  "workbench.terminal.black": "--workbench-terminal-color0",
  "workbench.terminal.red": "--workbench-terminal-color1",
  "workbench.terminal.green": "--workbench-terminal-color2",
  "workbench.terminal.yellow": "--workbench-terminal-color3",
  "workbench.terminal.blue": "--workbench-terminal-color4",
  "workbench.terminal.magenta": "--workbench-terminal-color5",
  "workbench.terminal.cyan": "--workbench-terminal-color6",
  "workbench.terminal.white": "--workbench-terminal-color7",
  "workbench.terminal.bright.black": "--workbench-terminal-color8",
  "workbench.terminal.bright.red": "--workbench-terminal-color9",
  "workbench.terminal.bright.green": "--workbench-terminal-color10",
  "workbench.terminal.bright.yellow": "--workbench-terminal-color11",
  "workbench.terminal.bright.blue": "--workbench-terminal-color12",
  "workbench.terminal.bright.magenta": "--workbench-terminal-color13",
  "workbench.terminal.bright.cyan": "--workbench-terminal-color14",
  "workbench.terminal.bright.white": "--workbench-terminal-color15",
  "workbench.panel.background": "--workbench-panel-background",
  "workbench.panel.options.hover.background":
    "--workbench-panel-options-hover-background",
  "workbench.panel.options.active.background":
    "--workbench-panel-options-active-background",
  "workbench.panel.options.active.border.foreground":
    "--workbench-panel-options-active-border-foreground",
  "workbench.dialog.background": "--workbench-dialog-background",
  "workbench.dialog.foreground": "--workbench-dialog-foreground",
  "workbench.dialog.hover.background": "--workbench-dialog-hover-background",
  "workbench.dialog.hover.foreground": "--workbench-dialog-hover-foreground",
  "workbench.item.hover.background": "--workbench-hover-background",
  "workbench.titlebar.background": "--workbench-titlebar-background",
  "workbench.titlebar.foreground": "--workbench-titlebar-foreground",
  "workbench.titlebar.item.hover.background":
    "--workbench-titlebar-item-hover-background",
  "workbench.titlebar.window.controls.circle.foreground":
    "--workbench-titlebar-window-controls-circle-foreground",
  "workbench.titlebar.search.background":
    "--workbench-titlebar-search-background",
  "workbench.titlebar.search.foreground":
    "--workbench-titlebar-search-foreground",
  "workbench.titlebar.search.hover.outline":
    "--workbench-titlebar-search-hover-outline",
  "workbench.titlebar.menu.background": "--workbench-titlebar-menu-background",
  "workbench.titlebar.menu.foreground": "--workbench-titlebar-menu-foreground",
  "workbench.titlebar.menu.item.hover.background":
    "--workbench-titlebar-menu-item-hover-background",
  "workbench.statusbar.foreground": "--workbench-statusbar-foreground",
  "workbench.statusbar.item.hover.background":
    "--workbench-statusbar-item-hover-background",
  "workbench.drawboard.background": "--workbench-drawboard-background",
  "workbench.drawboard.canvas.grid.background":
    "--workbench-drawboard-canvas-grid-background",
  "workbench.drawboard.canvas.stroke.foreground":
    "--workbench-drawboard-canvas-stroke-foreground",
  "workbench.drawboard.canvas.background":
    "--workbench-drawboard-canvas-background",
  "workbench.drawboard.tools.background":
    "--workbench-drawboard-tools-background",
  "workbench.drawboard.tools.tool.active.background":
    "--workbench-drawboard-tools-tool-active-background",
  "workbench.drawboard.tools.tool.hover.background":
    "--workbench-drawboard-tools-tool-hover-background",
  "workbench.drawboard.tools.tool.active.border.foreground":
    "--workbench-drawboard-tools-tool-active-border-foreground",
};

export function parseTokensToCssVariables(
  _colors: Partial<Record<IThemeColors, string>>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ThemeColors) {
    const cssVar = tokensToCssVariables[key];
    const value = _colors[key];
    if (cssVar && value) result[cssVar] = value;
  }
  return result;
}

export function getFileIcon(_name: string) {
  let _ext: string;

  const dotCount = (_name.match(/\./g) || []).length;

  const specificPatterns = [".d.ts"];
  const hasSpecificPattern = specificPatterns.some((pattern) =>
    _name.endsWith(pattern)
  );

  if (dotCount >= 2 && hasSpecificPattern) {
    const firstDotIndex = _name.indexOf(".");
    _ext = _name.substring(firstDotIndex + 1).toLowerCase();
  } else {
    _ext = (_name.split(".").pop() || "").toLowerCase();
  }

  const _supported = [
    "ts",
    "js",
    "py",
    "html",
    "json",
    "mjs",
    "mts",
    "cjs",
    "cts",
    "md",
    "gitignore",
    "gitattributes",
    "otf",
    "ttf",
    "svg",
    "xls",
    "xlsx",
    "toml",
    "d",
    "rs",
    "iss",
    "license",
    "prettierrc",
    "prettierignore",
    "env",
    "png",
    "jpg",
    "jpeg",
    "ico",
    "css",
    "sh",
    "d.ts",
    "docx",
    "doc",
    "pdf",
    "pyc",
    "jsx",
    "tsx",
    "csv",
    "wav",
    "mp3",
    "pyi",
    "map",
  ];

  const iconName = _supported.includes(_ext) ? _ext : "default";

  const _iconPath = window.path.join([
    window.path.__dirname,
    "..",
    "browser",
    "media",
    "icons",
    `file.type.${iconName}.svg`,
  ]);

  const _content = window.fs.readFile(_iconPath);

  return _content;
}

export function getIcon(_relativePath: string) {
  let _iconPath = window.path.join([
    window.path.__dirname,
    "..",
    "browser",
    "media",
    "icons",
    _relativePath,
  ]);

  const _content = window.fs.readFile(_iconPath);

  return _content;
}

export function getLanguage(_path: string) {
  const extension = _path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "py":
    case "pyi":
      return "python";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "jsx":
      return "javascript";
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "xml":
      return "xml";
    case "rs":
      return "rust";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export function getRelativePath(basePath: string, targetPath: string): string {
  const normalizedBase = basePath.replace(/[/\\]+$/, "");
  const normalizedTarget = targetPath.replace(/[/\\]+$/, "");

  if (normalizedTarget.startsWith(normalizedBase)) {
    const relativePath = normalizedTarget.substring(normalizedBase.length);

    return relativePath.replace(/^[/\\]+/, "") || "./";
  }

  return targetPath;
}

export function openTab(_tab: IEditorTab) {
  const stateValue = select((s) => s.main.editor_tabs);
  const _uri = _tab.uri;

  let currentTabs: IEditorTab[] = [];

  if (Array.isArray(stateValue)) {
    currentTabs = stateValue;
  } else if (stateValue && typeof stateValue === "object") {
    currentTabs = Object.values(stateValue);
  }

  const existingTabIndex = currentTabs.findIndex((tab) => tab.uri === _uri);

  if (existingTabIndex !== -1) {
    const updatedTabs = currentTabs.map((tab, index) => ({
      ...tab,
      active: index === existingTabIndex,
    }));

    dispatch(update_editor_tabs(updatedTabs));
  } else {
    const newTab = _tab;

    const updatedTabs = [
      ...currentTabs.map((tab) => ({
        ...tab,
        active: false,
      })),
      newTab,
    ];

    dispatch(update_editor_tabs(updatedTabs));
  }
}

export function getRunCommand(_path: string) {
  if (_path.endsWith(".py")) {
    return "python";
  } else if (
    _path.endsWith(".js") ||
    _path.endsWith(".cjs") ||
    _path.endsWith("mjs")
  ) {
    return "node";
  } else if (_path.endsWith(".rs")) {
    return "cargo run";
  } else {
    return `echo -e "\\033[35m[SupprtError]\\033[0m" "\\033[90mExtension not supported\\033[0m"`;
  }
}
