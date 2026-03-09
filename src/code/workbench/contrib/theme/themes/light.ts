import { ITheme } from "../../../../../types/theme.types";

export const light: ITheme = {
  id: "light",
  name: "Meridia Light",
  base: "light",
  colors: {
    "workbench.background": "#E8E8E5",
    "workbench.foreground": "#1A1A1A",
    "workbench.border": "#DDDDD8",

    "panel.background": "#F7F7F5",
    "panel.foreground": "#1A1A1A",
    "panel.border": "#DDDDD8",

    "editor.background": "#F4F4F1",
    "editor.foreground": "#1A1A1A",
    "editor.cursor.foreground": "#6A6A62",
    "editor.selection.background": "#D8D8D4",
    "editor.line.highlight.background": "#F5F5F3",

    "editor.tab.background": "#F7F7F5",
    "editor.tab.active.background": "#F4F4F1",
    "editor.tab.active.border": "#F7F7F7",
    "editor.tab.hover.background": "#E8E8E5",
    "editor.tab.foreground": "#7A7A72",
    "editor.tab.active.foreground": "#1A1A1A",
    "editor.tab.hover.foreground": "#1A1A1A",
    "editor.tab.border": "#DDDDD8",
    "editor.tab.icon.foreground": "#1A1A1A",
    "editor.tab.close.foreground": "#9A9A92",
    "editor.tab.close.active.background": "#D0D0CB",
    "editor.tab.close.hover.background": "#D0D0CB",

    "view.tab.background": "#F7F7F7",
    "view.tab.active.background": "#ECECE9",
    "view.tab.hover.background": "#E8E8E5",
    "view.tab.foreground": "#7A7A72",
    "view.tab.active.foreground": "#1A1A1A",
    "view.tab.hover.foreground": "#1A1A1A",
    "view.tab.close.foreground": "#9A9A92",
    "view.tab.close.hover.background": "#D0D0CB",

    "explorer.background": "#F7F7F5",
    "explorer.foreground": "#3A3A36",
    "explorer.icon.foreground": "#6A6A62",
    "explorer.item.hover.background": "#E8E8E4",
    "explorer.item.hover.foreground": "#1A1A1A",
    "explorer.item.active.background": "#E0E0DC",
    "explorer.item.active.foreground": "#1A1A1A",

    "git.background": "#F7F7F5",
    "git.foreground": "#3A3A36",
    "git.modified.foreground": "#B45309",
    "git.untracked.foreground": "#047857",
    "git.ignored.foreground": "#A8A8A0",

    "problems.background": "#F7F7F5",
    "problems.foreground": "#1A1A1A",
    "problems.error.foreground": "#C0142A",
    "problems.warning.foreground": "#B45309",
    "problems.info.foreground": "#5A5A54",

    "chat.background": "#F7F7F5",
    "chat.foreground": "#1A1A1A",
    "chat.user.background": "#EEEEED",
    "chat.assistant.background": "#F7F7F7",
    "chat.input.background": "#F7F7F7",
    "chat.input.foreground": "#1A1A1A",

    "terminal.background": "#F7F7F5",
    "terminal.foreground": "#1A1A1A",
    "terminal.cursor.foreground": "#1A1A1A",
    "terminal.selection.background": "#D8D8D4",

    "terminal.black": "#3A3A36",
    "terminal.red": "#C0142A",
    "terminal.green": "#166534",
    "terminal.yellow": "#B45309",
    "terminal.blue": "#5A5A54",
    "terminal.magenta": "#6D28D9",
    "terminal.cyan": "#4A7A6A",
    "terminal.white": "#F7F7F5",

    "terminal.bright.black": "#6A6A62",
    "terminal.bright.red": "#DC2626",
    "terminal.bright.green": "#16A34A",
    "terminal.bright.yellow": "#D97706",
    "terminal.bright.blue": "#8A8A82",
    "terminal.bright.magenta": "#7C3AED",
    "terminal.bright.cyan": "#6A9A8A",
    "terminal.bright.white": "#F7F7F7",

    "loader.foreground": "#6A6A62",

    "command.background": "#F7F7F5",
    "command.item.foreground": "#1A1A1A",
    "command.item.hover.background": "#E8E8E4",
    "command.item.hover.foreground": "#1A1A1A",
    "command.item.active.background": "#E0E0DC",
    "command.item.active.foreground": "#1A1A1A",

    "input.background": "#F7F7F7",
    "input.foreground": "#1A1A1A",
    "input.border": "#CECECA",
    "input.placeholder.foreground": "#AAAAA0",
    "input.focus.border": "#9A9A92",

    "select.background": "#F7F7F7",
    "select.foreground": "#1A1A1A",
    "select.border": "#CECECA",
    "select.hover.background": "#F0F0ED",
    "select.menu.background": "#F7F7F7",
    "select.option.foreground": "#1A1A1A",
    "select.option.hover.background": "#F0F0ED",
    "select.option.active.background": "#E0E0DC",

    "tooltip.background": "#2A2A28",
    "tooltip.foreground": "#F0F0ED",
    "tooltip.border": "#3A3A36",

    "button.primary.background": "#5A5A54",
    "button.primary.foreground": "#F7F7F7",
    "button.primary.hover.background": "#3A3A36",
    "button.primary.active.background": "#2A2A28",

    "button.secondary.background": "#E8E8E5",
    "button.secondary.foreground": "#1A1A1A",
    "button.secondary.hover.background": "#D8D8D4",
    "button.secondary.active.background": "#D0D0CB",

    "button.danger.background": "#C0142A",
    "button.danger.foreground": "#F7F7F7",
    "button.danger.hover.background": "#991B1B",

    "statusbar.background": "#E8E8E5",
    "statusbar.foreground": "#5A5A54",
    "statusbar.item.hover.background": "#D8D8D4",

    "titlebar.background": "#E8E8E5",
    "titlebar.foreground": "#5A5A54",
    "titlebar.icon.foreground": "#5A5A54",
    "titlebar.icon.hover.background": "#D0D0CB",

    "titlebar.popover.background": "#F7F7F7",

    "titlebar.menu.item.hover.background": "#D8D8D4",
    "titlebar.menu.item.hover.foreground": "#1A1A1A",
    "titlebar.menu.item.active.background": "#E0E0DC",
    "titlebar.menu.item.active.foreground": "#1A1A1A",

    "split.handle.foreground": "#DDDDD8",
    "split.handle.hover.foreground": "#CECECA",
    "split.handle.active.foreground": "#9A9A92",

    "scrollbar.thumb.foreground": "#CECECA",
    "scrollbar.thumb.hover.foreground": "#AAAAA0",
    "scrollbar.thumb.active.foreground": "#8A8A82",

    "selection.background": "#D8D8D4",
    "selection.foreground": "#1A1A1A",
    "focus.border": "#9A9A92",

    "context.menu.background": "#F7F7F7",
    "context.menu.foreground": "#1A1A1A",
    "context.menu.border": "#DDDDD8",
    "context.menu.item.foreground": "#1A1A1A",
    "context.menu.item.hover.background": "#F0F0ED",
    "context.menu.item.hover.foreground": "#1A1A1A",

    "popover.background": "#F7F7F7",
    "popover.border": "#DDDDD8",
    "popover.content.background": "#F7F7F7",
    "popover.content.foreground": "#1A1A1A",
    "popover.shadow": "0 8px 32px rgba(0, 0, 0, 0.10)",

    "insights.background": "#F0F0ED",
    "insights.foreground": "#5A5A54",

    "link.foreground": "#5A5A54",
    "link.hover.foreground": "#3A3A36",
  },
  tokens: {
    default: "#2A2A28",

    keyword: "#4A7A6A",
    "keyword.json": "#C26A72",
    "keyword.typeModifier": "#3A7A72",

    source: "#7A5A2A",
    metadata: "#8A6A30",

    number: "#6A5A30",
    boolean: "#3A7A72",

    string: "#7A4A7A",
    "string.binary": "#4A7A3A",
    "string.escape": "#2A2A28",
    "string.escape.alternative": "#5A4A8A",
    "string.format.item": "#8A6A30",
    "string.regexp": "#5A5A62",

    identifier: "#2A2A28",
    "identifier.this": "#7A5A2A",
    "identifier.constant": "#4A7A6A",
    "identifier.variable.local": "#3A3A36",
    "identifier.parameter": "#8A6A30",

    "identifier.function.declaration": "#7A5A2A",
    "identifier.method.static": "#7A5A2A",
    "identifier.builtin": "#3A7A72",

    "identifier.type": "#7A5A2A",
    "identifier.field": "#5A4A8A",
    "identifier.field.static": "#5A4A8A",

    "identifier.interface": "#4A6A8A",
    "identifier.type.class": "#4A6A8A",

    comment: "#9A9A92",
    "comment.parameter": "#AAAAA066",

    punctuation: "#2A2A28",
  },
};
