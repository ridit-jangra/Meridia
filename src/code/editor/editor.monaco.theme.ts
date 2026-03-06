import { theme } from "../workbench/contrib/theme/theme.service";
import { monaco } from "./editor.helper";

const kind = theme.get_active()?.base ?? "dark";
const background = theme.get_color("editor.background");
const foreground = theme.get_color("editor.foreground");
const cursor = theme.get_color("editor.cursor.foreground");
const line_highlight = theme.get_color("editor.line.highlight.background");

const border_foreground = theme.get_color("workbench.border");
const input_background = theme.get_color("input.background");
const scrollbar_thumb = theme.get_color("scrollbar.thumb.foreground");
const scrollbar_thumb_hover = theme.get_color(
  "scrollbar.thumb.hover.foreground",
);
const scrollbar_thumb_active = theme.get_color(
  "scrollbar.thumb.active.foreground",
);

const context_menu_background = theme.get_color("context.menu.background");
const context_menu_foreground = theme.get_color("context.menu.foreground");
const context_menu_border = theme.get_color("context.menu.border");
const context_menu_item_hover_background = theme.get_color(
  "context.menu.item.hover.background",
);
const context_menu_item_hover_foreground = theme.get_color(
  "context.menu.item.hover.foreground",
);

const command_background = theme.get_color("command.background");
const command_item_foreground = theme.get_color("command.item.foreground");
const command_item_hover_background = theme.get_color(
  "command.item.hover.background",
);
const command_item_hover_foreground = theme.get_color(
  "command.item.hover.foreground",
);
const command_item_active_background = theme.get_color(
  "command.item.active.background",
);
const command_item_active_foreground = theme.get_color(
  "command.item.active.foreground",
);

monaco.editor.defineTheme("theme", {
  base: kind === "light" ? "vs" : "vs-dark",
  inherit: true,
  colors: {
    "editor.background": background,
    "editor.foreground": foreground,
    "editorCursor.foreground": cursor,
    "editor.lineHighlightBorder": background,
    "editor.lineHighlightBackground": line_highlight,

    "editorSuggestWidget.background": context_menu_background,
    "editorSuggestWidget.foreground": context_menu_foreground,
    "editorSuggestWidget.border": context_menu_border,
    "editorSuggestWidget.selectedBackground":
      context_menu_item_hover_background,
    "editorSuggestWidget.selectedForeground":
      context_menu_item_hover_foreground,
    "editorSuggestWidget.selectedIconForeground":
      context_menu_item_hover_foreground,
    "editorSuggestWidget.highlightForeground":
      context_menu_item_hover_foreground,
    "editorSuggestWidget.focusHighlightForeground":
      context_menu_item_hover_foreground,

    "editorHoverWidget.background": context_menu_background,
    "editorHoverWidget.foreground": context_menu_foreground,
    "editorHoverWidget.border": context_menu_border,

    "editorParameterHint.background": context_menu_background,
    "editorParameterHint.foreground": context_menu_foreground,

    "editorWidget.background": context_menu_background,
    "editorWidget.foreground": context_menu_foreground,
    "editorWidget.border": context_menu_border,
    "editorWidget.resizeBorder": context_menu_border,

    "peekViewEditor.background": context_menu_background,

    "peekViewResult.foreground": foreground,
    "peekViewResult.background": context_menu_background,
    "peekViewResult.lineForeground": foreground,
    "peekViewResult.selectionForeground": foreground,
    "peekViewTitleLabel.foreground": foreground,

    "menu.background": context_menu_background,
    "menu.foreground": context_menu_foreground,
    "menu.border": context_menu_border,
    "menu.selectionBackground": context_menu_item_hover_background,
    "menu.selectionForeground": context_menu_item_hover_foreground,
    "menu.separatorBackground": context_menu_border,

    "input.background": input_background,
    "input.foreground": foreground,
    "input.border": border_foreground,

    "dropdown.foreground": foreground,
    "dropdown.border": border_foreground,

    "quickInput.background": command_background,
    "quickInput.foreground": command_item_foreground,

    "quickInputList.focusBackground": command_item_active_background,
    "quickInputList.focusForeground": command_item_active_foreground,

    "quickInputList.hoverBackground": command_item_hover_background,
    "quickInputList.hoverForeground": command_item_hover_foreground,

    "quickInputList.activeBackground": command_item_active_background,
    "quickInputList.activeForeground": command_item_active_foreground,

    "quickInputTitle.background": command_background,

    "notifications.foreground": foreground,
    "notifications.border": border_foreground,

    "breadcrumb.foreground": foreground,

    "minimap.background": background,

    "scrollbar.shadow": border_foreground,
    "scrollbarSlider.background": scrollbar_thumb,
    "scrollbarSlider.hoverBackground": scrollbar_thumb_hover,
    "scrollbarSlider.activeBackground": scrollbar_thumb_active,

    "editorOverviewRuler.background": background,
    "editorOverviewRuler.border": border_foreground,

    "editorRuler.foreground": border_foreground,

    "editorGroup.background": background,
    "editorGroupHeader.tabsBackground": theme.get_color(
      "editor.tab.background",
    ),
    "editorGroupHeader.tabsBorder": border_foreground,
  },
  rules: [],
} as monaco.editor.IStandaloneThemeData);
