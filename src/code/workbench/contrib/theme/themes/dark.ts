import { ITheme } from "../../../../../types/theme.types";

export const dark: ITheme = {
  id: "dark",
  name: "Dark",
  base: "dark",
  colors: {
    "workbench.background": "#0D0D0D",
    "workbench.foreground": "#E6E6E6EB",
    "workbench.border": "#FFFFFF14",

    "panel.background": "#131313",
    "panel.foreground": "#E6E6E6EB",
    "panel.border": "#FFFFFF14",

    "editor.background": "#161616",
    "editor.foreground": "#D8DEE9",
    "editor.cursor.foreground": "#e6e6e6",
    "editor.selection.background": "#4A4A4A99",
    "editor.line.highlight.background": "#232323",

    "editor.tab.background": "#131313",
    "editor.tab.active.background": "#161616",
    "editor.tab.active.border": "#131313",
    "editor.tab.hover.background": "#1A1A1A",
    "editor.tab.foreground": "#E6E6E666",
    "editor.tab.active.foreground": "#E6E6E6EB",
    "editor.tab.hover.foreground": "#E6E6E6D6",
    "editor.tab.border": "#FFFFFF14",
    "editor.tab.icon.foreground": "#E6E6E6EB",
    "editor.tab.close.foreground": "#E6E6E666",
    "editor.tab.close.active.background": "#E6E6E6EB",
    "editor.tab.close.hover.background": "#E6E6E6EB",

    "view.tab.background": "#131313",
    "view.tab.active.background": "#28292B",
    "view.tab.hover.background": "#1A1A1A",
    "view.tab.foreground": "#E6E6E666",
    "view.tab.active.foreground": "#E6E6E6EB",
    "view.tab.hover.foreground": "#E6E6E6D6",
    "view.tab.close.foreground": "#E6E6E666",
    "view.tab.close.hover.background": "#FFFFFF1A",

    "explorer.background": "#131313",
    "explorer.foreground": "#E6E6E6A6",
    "explorer.icon.foreground": "#E6E6E68F",
    "explorer.item.hover.background": "#FFFFFF10",
    "explorer.item.hover.foreground": "#E6E6E6EB",
    "explorer.item.active.background": "#FFFFFF18",
    "explorer.item.active.foreground": "#FFFFFF",

    "git.background": "#131313",
    "git.foreground": "#E6E6E6A6",
    "git.modified.foreground": "#F1B467",
    "git.untracked.foreground": "#88C0D0",
    "git.ignored.foreground": "#E6E6E66B",

    "problems.background": "#131313",
    "problems.foreground": "#E6E6E6EB",
    "problems.error.foreground": "#FC6B83",
    "problems.warning.foreground": "#F1B467",
    "problems.info.foreground": "#88C0D0",

    "chat.background": "#131313",
    "chat.foreground": "#E6E6E6EB",
    "chat.user.background": "#FFFFFF12",
    "chat.assistant.background": "#131313",
    "chat.input.background": "#FFFFFF0D",
    "chat.input.foreground": "#E6E6E6EB",

    "terminal.background": "#131313",
    "terminal.foreground": "#E6E6E6EB",
    "terminal.cursor.foreground": "#E6E6E6EB",
    "terminal.selection.background": "#FFFFFF22",

    "terminal.black": "#555555",
    "terminal.red": "#FC6B83",
    "terminal.green": "#A3D977",
    "terminal.yellow": "#F1B467",
    "terminal.blue": "#81A1C1",
    "terminal.magenta": "#C792EA",
    "terminal.cyan": "#88C0D0",
    "terminal.white": "#E6E6E6EB",

    "terminal.bright.black": "#3A3A3A",
    "terminal.bright.red": "#FF7D92",
    "terminal.bright.green": "#B6F28A",
    "terminal.bright.yellow": "#FFD08A",
    "terminal.bright.blue": "#9AB6E3",
    "terminal.bright.magenta": "#E0B3FF",
    "terminal.bright.cyan": "#9FE7FF",
    "terminal.bright.white": "#FFFFFF",

    "loader.foreground": "#81A1C1",

    "command.background": "#0D0D0D",
    "command.item.foreground": "#E6E6E6EB",
    "command.item.hover.background": "#1A1A1A",
    "command.item.hover.foreground": "#FFFFFF",
    "command.item.active.background": "#2A2A2A",
    "command.item.active.foreground": "#FFFFFF",

    "input.background": "#262624",
    "input.foreground": "#B3B3B3",
    "input.border": "#FFFFFF1A",
    "input.placeholder.foreground": "#E6E6E660",
    "input.focus.border": "#FFFFFF33",

    "select.background": "#0D0D0D",
    "select.foreground": "#E6E6E6EB",
    "select.border": "#FFFFFF1A",
    "select.hover.background": "#1A1A1A",
    "select.menu.background": "#0D0D0D",
    "select.option.foreground": "#E6E6E6EB",
    "select.option.hover.background": "#1A1A1A",
    "select.option.active.background": "#2A2A2A",

    "tooltip.background": "#0D0D0D",
    "tooltip.foreground": "#E6E6E6EB",
    "tooltip.border": "#FFFFFF26",

    "button.primary.background": "#81A1C1",
    "button.primary.foreground": "#191c22",
    "button.primary.hover.background": "#8AB0D3",
    "button.primary.active.background": "#8AB0D3",

    "button.secondary.background": "#5F5F5F",
    "button.secondary.foreground": "#E6E6E6EB",
    "button.secondary.hover.background": "#7A7A7A",
    "button.secondary.active.background": "#7A7A7A",

    "button.danger.background": "#E34671",
    "button.danger.foreground": "#FFFFFF",
    "button.danger.hover.background": "#FC6B83",

    "statusbar.background": "#0D0D0D",
    "statusbar.foreground": "#E6E6E6B0",
    "statusbar.item.hover.background": "#FFFFFF10",

    "titlebar.background": "#0D0D0D",
    "titlebar.foreground": "#E6E6E6B0",

    "titlebar.icon.foreground": "#E6E6E6B0",
    "titlebar.icon.hover.background": "#FFFFFF10",

    "titlebar.popover.background": "#0D0D0D",

    "titlebar.menu.item.hover.background": "#FFFFFF1A",
    "titlebar.menu.item.hover.foreground": "#FFFFFF",

    "titlebar.menu.item.active.background": "#FFFFFF1A",
    "titlebar.menu.item.active.foreground": "#FFFFFF",

    "split.handle.foreground": "#FFFFFF14",
    "split.handle.hover.foreground": "#FFFFFF26",
    "split.handle.active.foreground": "#FFFFFF33",

    "scrollbar.thumb.foreground": "#FFFFFF12",
    "scrollbar.thumb.hover.foreground": "#FFFFFF1F",
    "scrollbar.thumb.active.foreground": "#FFFFFF26",

    "selection.background": "#FFFFFF22",
    "selection.foreground": "#FFFFFF",
    "focus.border": "#81A1C199",

    "context.menu.background": "#0D0D0D",
    "context.menu.foreground": "#E6E6E6EB",
    "context.menu.border": "#FFFFFF1A",
    "context.menu.item.foreground": "#E6E6E6EB",
    "context.menu.item.hover.background": "#1A1A1A",
    "context.menu.item.hover.foreground": "#FFFFFF",

    "popover.background": "#0D0D0D",
    "popover.border": "#FFFFFF1A",

    "popover.content.background": "#0D0D0D",
    "popover.content.foreground": "#E6E6E6EB",

    "popover.shadow": "0 16px 40px rgba(0, 0, 0, 0.6)",

    "insights.background": "#131313",
    "insights.foreground": "#E6E6E6B0",

    "link.foreground": "#81A1C1",
    "link.hover.foreground": "#9AB6E3",
  },
};
