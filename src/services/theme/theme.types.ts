export interface ITheme {
  id: string;
  name: string;
  base: "dark" | "light" | "high-contrast";
  colors?: Partial<Record<TColors, string>>;
  tokens?: Record<string, string>;
}

export const colors = [
  "workbench.background",
  "workbench.foreground",
  "workbench.border",

  "panel.background",
  "panel.foreground",
  "panel.border",

  "editor.background",
  "editor.foreground",
  "editor.cursor.foreground",
  "editor.selection.background",
  "editor.line.highlight.background",

  "editor.tab.background",
  "editor.tab.active.background",
  "editor.tab.active.border",
  "editor.tab.hover.background",
  "editor.tab.foreground",
  "editor.tab.active.foreground",
  "editor.tab.hover.foreground",
  "editor.tab.border",
  "editor.tab.close.foreground",
  "editor.tab.icon.foreground",
  "editor.tab.close.hover.background",

  "view.tab.background",
  "view.tab.active.background",
  "view.tab.hover.background",
  "view.tab.foreground",
  "view.tab.active.foreground",
  "view.tab.hover.foreground",
  "view.tab.close.foreground",
  "view.tab.close.hover.background",

  "explorer.background",
  "explorer.foreground",
  "explorer.icon.foreground",
  "explorer.item.hover.background",
  "explorer.item.hover.foreground",
  "explorer.item.active.background",
  "explorer.item.active.foreground",

  "git.background",
  "git.foreground",
  "git.modified.foreground",
  "git.untracked.foreground",
  "git.ignored.foreground",

  "problems.background",
  "problems.foreground",
  "problems.error.foreground",
  "problems.warning.foreground",
  "problems.info.foreground",

  "chat.background",
  "chat.foreground",
  "chat.user.background",
  "chat.assistant.background",
  "chat.input.background",
  "chat.input.foreground",

  "terminal.background",
  "terminal.foreground",
  "terminal.cursor.foreground",
  "terminal.selection.background",

  "terminal.black",
  "terminal.red",
  "terminal.green",
  "terminal.yellow",
  "terminal.blue",
  "terminal.magenta",
  "terminal.cyan",
  "terminal.white",

  "terminal.bright.black",
  "terminal.bright.red",
  "terminal.bright.green",
  "terminal.bright.yellow",
  "terminal.bright.blue",
  "terminal.bright.magenta",
  "terminal.bright.cyan",
  "terminal.bright.white",

  "input.background",
  "input.foreground",
  "input.border",
  "input.placeholder.foreground",
  "input.focus.border",

  "select.background",
  "select.foreground",
  "select.border",
  "select.hover.background",
  "select.menu.background",
  "select.option.foreground",
  "select.option.hover.background",
  "select.option.active.background",

  "tooltip.background",
  "tooltip.foreground",
  "tooltip.border",

  "button.primary.background",
  "button.primary.foreground",
  "button.primary.hover.background",
  "button.primary.active.background",

  "button.secondary.background",
  "button.secondary.foreground",
  "button.secondary.hover.background",
  "button.secondary.active.background",

  "button.danger.background",
  "button.danger.foreground",
  "button.danger.hover.background",

  "statusbar.background",
  "statusbar.foreground",
  "statusbar.item.hover.background",

  "titlebar.background",
  "titlebar.foreground",
  "titlebar.icon.foreground",
  "titlebar.icon.hover.background",
  "titlebar.popover.background",
  "titlebar.menu.item.hover.background",
  "titlebar.menu.item.hover.foreground",
  "titlebar.menu.item.active.background",
  "titlebar.menu.item.active.foreground",

  "split.handle.foreground",
  "split.handle.hover.foreground",
  "split.handle.active.foreground",

  "scrollbar.thumb.foreground",
  "scrollbar.thumb.hover.foreground",
  "scrollbar.thumb.active.foreground",

  "selection.background",
  "selection.foreground",
  "focus.border",

  "command.background",
  "command.item.foreground",
  "command.item.hover.background",
  "command.item.hover.foreground",
  "command.item.active.background",
  "command.item.active.foreground",

  "context.menu.background",
  "context.menu.foreground",
  "context.menu.border",
  "context.menu.item.foreground",
  "context.menu.item.hover.background",
  "context.menu.item.hover.foreground",

  "popover.background",
  "popover.border",

  "popover.content.background",
  "popover.content.foreground",

  "popover.shadow",

  "insights.background",
  "insights.foreground",

  "link.foreground",
  "link.hover.foreground",
] as const;

export type TColors = (typeof colors)[number];
