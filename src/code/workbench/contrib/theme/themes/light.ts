import { ITheme } from "../../../../../types/theme.types";

export const light: ITheme = {
  id: "light",
  name: "Meridia Light",
  base: "light",
  colors: {
    "workbench.background": "#F4F6FA",
    "workbench.foreground": "#1F2937",
    "workbench.border": "#E5E7EB",

    "panel.background": "#FFFFFF",
    "panel.foreground": "#1F2937",
    "panel.border": "#E5E7EB",

    "editor.background": "#FFFFFF",
    "editor.foreground": "#1F2937",
    "editor.cursor.foreground": "#2563EB",
    "editor.selection.background": "#DBEAFE",
    "editor.line.highlight.background": "#F3F4F6",

    "editor.tab.background": "#F4F6FA",
    "editor.tab.active.background": "#FFFFFF",
    "editor.tab.hover.background": "#E5E7EB",
    "editor.tab.foreground": "#6B7280",
    "editor.tab.active.foreground": "#111827",
    "editor.tab.hover.foreground": "#1F2937",
    "editor.tab.border": "#E5E7EB",
    "editor.tab.close.foreground": "#9CA3AF",
    "editor.tab.close.hover.background": "#E5E7EB",

    "view.tab.background": "#F4F6FA",
    "view.tab.active.background": "#FFFFFF",
    "view.tab.hover.background": "#E5E7EB",
    "view.tab.foreground": "#6B7280",
    "view.tab.active.foreground": "#111827",
    "view.tab.hover.foreground": "#1F2937",
    "view.tab.close.foreground": "#9CA3AF",
    "view.tab.close.hover.background": "#E5E7EB",

    "explorer.background": "#FFFFFF",
    "explorer.foreground": "#374151",
    "explorer.icon.foreground": "#6B7280",
    "explorer.item.hover.background": "#F3F4F6",
    "explorer.item.hover.foreground": "#111827",
    "explorer.item.active.background": "#E0E7FF",
    "explorer.item.active.foreground": "#1E3A8A",

    "git.background": "#FFFFFF",
    "git.foreground": "#374151",
    "git.modified.foreground": "#D97706",
    "git.untracked.foreground": "#0284C7",
    "git.ignored.foreground": "#9CA3AF",

    "problems.background": "#FFFFFF",
    "problems.foreground": "#1F2937",
    "problems.error.foreground": "#DC2626",
    "problems.warning.foreground": "#D97706",
    "problems.info.foreground": "#0284C7",

    "chat.background": "#FFFFFF",
    "chat.foreground": "#1F2937",
    "chat.user.background": "#F3F4F6",
    "chat.assistant.background": "#FFFFFF",
    "chat.input.background": "#F9FAFB",
    "chat.input.foreground": "#1F2937",

    "terminal.background": "#FFFFFF",
    "terminal.foreground": "#1F2937",
    "terminal.cursor.foreground": "#2563EB",

    "command.background": "#FFFFFF",
    "command.item.foreground": "#1F2937",
    "command.item.hover.background": "#F3F4F6",
    "command.item.hover.foreground": "#111827",
    "command.item.active.background": "#E0E7FF",
    "command.item.active.foreground": "#1E3A8A",

    "input.background": "#FFFFFF",
    "input.foreground": "#1F2937",
    "input.border": "#D1D5DB",
    "input.placeholder.foreground": "#9CA3AF",
    "input.focus.border": "#2563EB",

    "select.background": "#FFFFFF",
    "select.foreground": "#1F2937",
    "select.border": "#D1D5DB",
    "select.hover.background": "#F3F4F6",
    "select.menu.background": "#FFFFFF",
    "select.option.foreground": "#1F2937",
    "select.option.hover.background": "#F3F4F6",
    "select.option.active.background": "#E0E7FF",

    "tooltip.background": "#111827",
    "tooltip.foreground": "#FFFFFF",
    "tooltip.border": "#1F2937",

    "button.primary.background": "#2563EB",
    "button.primary.foreground": "#FFFFFF",
    "button.primary.hover.background": "#1D4ED8",
    "button.primary.active.background": "#1E40AF",

    "button.secondary.background": "#E5E7EB",
    "button.secondary.foreground": "#1F2937",
    "button.secondary.hover.background": "#D1D5DB",
    "button.secondary.active.background": "#D1D5DB",

    "button.danger.background": "#DC2626",
    "button.danger.foreground": "#FFFFFF",
    "button.danger.hover.background": "#B91C1C",

    "statusbar.background": "#F4F6FA",
    "statusbar.foreground": "#6B7280",
    "statusbar.item.hover.background": "#E5E7EB",

    "titlebar.background": "#F4F6FA",
    "titlebar.foreground": "#6B7280",
    "titlebar.icon.foreground": "#6B7280",
    "titlebar.icon.hover.background": "#E5E7EB",

    "titlebar.menu.item.hover.background": "#E5E7EB",
    "titlebar.menu.item.hover.foreground": "#111827",
    "titlebar.menu.item.active.background": "#E0E7FF",
    "titlebar.menu.item.active.foreground": "#1E3A8A",

    "split.handle.foreground": "#E5E7EB",
    "split.handle.hover.foreground": "#D1D5DB",
    "split.handle.active.foreground": "#2563EB",

    "scrollbar.thumb.foreground": "#D1D5DB",
    "scrollbar.thumb.hover.foreground": "#9CA3AF",
    "scrollbar.thumb.active.foreground": "#6B7280",

    "selection.background": "#DBEAFE",
    "selection.foreground": "#111827",
    "focus.border": "#2563EB",

    "context.menu.background": "#FFFFFF",
    "context.menu.foreground": "#1F2937",
    "context.menu.border": "#E5E7EB",
    "context.menu.item.foreground": "#1F2937",
    "context.menu.item.hover.background": "#F3F4F6",
    "context.menu.item.hover.foreground": "#111827",

    "popover.background": "#FFFFFF",
    "popover.border": "#E5E7EB",
    "popover.content.background": "#FFFFFF",
    "popover.content.foreground": "#1F2937",

    "popover.shadow": "0 10px 40px rgba(0, 0, 0, 0.08)",

    "terminal.selection.background": "#BFDBFE",

    "terminal.black": "#1F2937",
    "terminal.red": "#DC2626",
    "terminal.green": "#16A34A",
    "terminal.yellow": "#D97706",
    "terminal.blue": "#2563EB",
    "terminal.magenta": "#7C3AED",
    "terminal.cyan": "#0284C7",
    "terminal.white": "#F9FAFB",

    "terminal.bright.black": "#6B7280",
    "terminal.bright.red": "#EF4444",
    "terminal.bright.green": "#22C55E",
    "terminal.bright.yellow": "#F59E0B",
    "terminal.bright.blue": "#3B82F6",
    "terminal.bright.magenta": "#8B5CF6",
    "terminal.bright.cyan": "#0EA5E9",
    "terminal.bright.white": "#FFFFFF",

    "editor.tab.active.border": "#FFFFFF",
    "editor.tab.icon.foreground": "#1F2937",

    "titlebar.popover.background": "#FFFFFF",

    "insights.background": "#F4F6FA",
    "insights.foreground": "#6B7280",

    "link.foreground": "#2563EB",
    "link.hover.foreground": "#1D4ED8",
  },
};
