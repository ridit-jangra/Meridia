import { theme } from "../theme/theme.service";
import { monaco } from "./editor.helper";

const kind = theme.get_active().base;
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

monaco.editor.defineTheme("theme", {
  base: kind === "light" ? "vs" : "vs-dark",
  inherit: true,
  colors: {
    "editor.background": background,
    "editor.foreground": foreground,
    "editorCursor.foreground": cursor,
    "editor.lineHighlightBorder": background,
    "editor.lineHighlightBackground": line_highlight,

    "editorWidget.foreground": foreground,
    "editorWidget.border": border_foreground,
    "editorWidget.resizeBorder": border_foreground,

    "editorSuggestWidget.foreground": foreground,
    "editorSuggestWidget.border": border_foreground,

    "editorSuggestWidget.selectedForeground": foreground,
    "editorSuggestWidget.selectedIconForeground": foreground,

    "editorHoverWidget.foreground": foreground,
    "editorHoverWidget.border": border_foreground,

    "editorParameterHint.foreground": foreground,
    "editorFindWidget.foreground": foreground,
    "editorFindWidget.border": border_foreground,
    "editorFindWidget.resizeBorder": border_foreground,

    "peekViewResult.foreground": foreground,
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

    "quickInput.foreground": foreground,

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
