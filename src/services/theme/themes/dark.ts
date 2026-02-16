import { ITheme } from "../theme.types";

export const dark: ITheme = {
  id: "dark",
  name: "Dark",
  base: "dark",
  colors: {
    "workbench.background": "#141414",
    "workbench.foreground": "#CFCFCFEB",
    "workbench.border": "#E4E4E413",

    "panel.background": "#141414",
    "panel.foreground": "#E4E4E4EB",
    "panel.border": "#E4E4E413",

    "editor.background": "#181818",
    "editor.foreground": "#E4E4E4EB",
    "editor.cursor.foreground": "#E4E4E4EB",
    "editor.selection.background": "#40404099",
    "editor.line.highlight.background": "#262626",

    "editor.tab.background": "#141414",
    "editor.tab.active.background": "#1f1f1f",
    "editor.tab.hover.background": "#E4E4E400",
    "editor.tab.foreground": "#E4E4E442",
    "editor.tab.active.foreground": "#E4E4E4EB",
    "editor.tab.hover.foreground": "#E4E4E4EB",
    "editor.tab.border": "#E4E4E413",
    "editor.tab.close.foreground": "#E4E4E442",
    "editor.tab.close.hover.background": "#E4E4E41E",

    "view.tab.background": "#141414",
    "view.tab.active.background": "#1f1f1f",
    "view.tab.hover.background": "#E4E4E400",
    "view.tab.foreground": "#E4E4E442",
    "view.tab.active.foreground": "#E4E4E4EB",
    "view.tab.hover.foreground": "#E4E4E4EB",
    "view.tab.close.foreground": "#E4E4E442",
    "view.tab.close.hover.background": "#E4E4E41E",

    "explorer.background": "#141414",
    "explorer.foreground": "#E4E4E48D",
    "explorer.icon.foreground": "#E4E4E48D",
    "explorer.item.hover.background": "#E4E4E411",
    "explorer.item.hover.foreground": "#E4E4E4EB",
    "explorer.item.active.background": "#E4E4E41E",
    "explorer.item.active.foreground": "#E4E4E4EB",

    "git.background": "#141414",
    "git.foreground": "#E4E4E48D",
    "git.modified.foreground": "#F1B467",
    "git.untracked.foreground": "#88C0D0",
    "git.ignored.foreground": "#E4E4E45E",

    "problems.background": "#141414",
    "problems.foreground": "#E4E4E4EB",
    "problems.error.foreground": "#FC6B83",
    "problems.warning.foreground": "#F1B467",
    "problems.info.foreground": "#88C0D0",

    "chat.background": "#141414",
    "chat.foreground": "#E4E4E4EB",
    "chat.user.background": "#E4E4E41E",
    "chat.assistant.background": "#181818",
    "chat.input.background": "#E4E4E40A",
    "chat.input.foreground": "#E4E4E4EB",

    "terminal.background": "#141414",
    "terminal.foreground": "#E4E4E4EB",
    "terminal.cursor.foreground": "#E4E4E4EB",

    "command.background": "#121212",
    "command.item.foreground": "#E4E4E4EB",
    "command.item.hover.background": "#1E1E1E",
    "command.item.hover.foreground": "#E4E4E4EB",
    "command.item.active.background": "#2A2A2A",
    "command.item.active.foreground": "#E4E4E4EB",

    "input.background": "#121212",
    "input.foreground": "#E4E4E4EB",
    "input.border": "#E4E4E41A",
    "input.placeholder.foreground": "#E4E4E45E",
    "input.focus.border": "#E4E4E430",

    "select.background": "#121212",
    "select.foreground": "#E4E4E4EB",
    "select.border": "#E4E4E41A",
    "select.hover.background": "#1E1E1E",
    "select.menu.background": "#121212",
    "select.option.foreground": "#E4E4E4EB",
    "select.option.hover.background": "#1E1E1E",
    "select.option.active.background": "#2A2A2A",

    "tooltip.background": "#121212",
    "tooltip.foreground": "#E4E4E4EB",
    "tooltip.border": "#E4E4E430",

    "button.primary.background": "#81A1C1",
    "button.primary.foreground": "#191c22",
    "button.primary.hover.background": "#87A6C4",
    "button.primary.active.background": "#87A6C4",

    "button.secondary.background": "#626262",
    "button.secondary.foreground": "#E4E4E4EB",
    "button.secondary.hover.background": "#818181",
    "button.secondary.active.background": "#818181",

    "button.danger.background": "#E34671",
    "button.danger.foreground": "#E4E4E4EB",
    "button.danger.hover.background": "#FC6B83",

    "statusbar.background": "#141414",
    "statusbar.foreground": "#E4E4E45E",
    "statusbar.item.hover.background": "#E4E4E411",

    "titlebar.background": "#141414",
    "titlebar.foreground": "#E4E4E4A8",

    "titlebar.icon.foreground": "#E4E4E4A8",
    "titlebar.icon.hover.background": "#E4E4E411",

    "titlebar.menu.item.hover.background": "#E4E4E426",
    "titlebar.menu.item.hover.foreground": "#E4E4E4EB",

    "titlebar.menu.item.active.background": "#E4E4E426",
    "titlebar.menu.item.active.foreground": "#FFFFFF",

    "split.handle.foreground": "#E4E4E413",
    "split.handle.hover.foreground": "#E4E4E426",
    "split.handle.active.foreground": "#E4E4E430",

    "scrollbar.thumb.foreground": "#E4E4E411",
    "scrollbar.thumb.hover.foreground": "#E4E4E41E",
    "scrollbar.thumb.active.foreground": "#E4E4E41E",

    "selection.background": "#E4E4E430",
    "selection.foreground": "#E4E4E4EB",
    "focus.border": "#E4E4E426",

    "context.menu.background": "#0A0A0A",
    "context.menu.foreground": "#E4E4E4EB",
    "context.menu.border": "#E4E4E41A",
    "context.menu.item.foreground": "#E4E4E4EB",
    "context.menu.item.hover.background": "#151515",
    "context.menu.item.hover.foreground": "#E4E4E4EB",

    "popover.background": "#0A0A0A",
    "popover.border": "#E4E4E41A",

    "popover.content.background": "#0A0A0A",
    "popover.content.foreground": "#E4E4E4EB",

    "popover.shadow": "0 12px 30px rgba(0, 0, 0, 0.5)",
  },
};
