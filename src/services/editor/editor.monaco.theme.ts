import { theme } from "../theme/theme.service";
import { monaco } from "./editor.helper";

const _kind = theme.get_active().base;
const _background = theme.get_color("editor.background");
const _foreground = theme.get_color("editor.foreground");
const _cursor = theme.get_color("editor.cursor.foreground");
const _lineHighlight = theme.get_color("editor.line.highlight.background");

const _borderForeground = theme.get_color("workbench.border");
const _inputBackground = theme.get_color("input.background");
const _scrollbarThumb = theme.get_color("scrollbar.thumb.foreground");
const _scrollbarThumbHover = theme.get_color(
  "scrollbar.thumb.hover.foreground",
);
const _scrollbarThumbActive = theme.get_color(
  "scrollbar.thumb.active.foreground",
);

monaco.editor.defineTheme("theme", {
  base: _kind === "light" ? "vs" : "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": _background,
    "editor.foreground": _foreground,
    "editorCursor.foreground": _cursor,
    "editor.lineHighlightBorder": _background,
    "editor.lineHighlightBackground": _lineHighlight,

    "editorWidget.foreground": _foreground,
    "editorWidget.border": _borderForeground,
    "editorWidget.resizeBorder": _borderForeground,

    "editorSuggestWidget.foreground": _foreground,
    "editorSuggestWidget.border": _borderForeground,

    "editorSuggestWidget.selectedForeground": _foreground,
    "editorSuggestWidget.selectedIconForeground": _foreground,

    "editorHoverWidget.foreground": _foreground,
    "editorHoverWidget.border": _borderForeground,

    "editorParameterHint.foreground": _foreground,
    "editorFindWidget.foreground": _foreground,
    "editorFindWidget.border": _borderForeground,
    "editorFindWidget.resizeBorder": _borderForeground,

    "peekViewResult.foreground": _foreground,
    "peekViewResult.lineForeground": _foreground,
    "peekViewResult.selectionForeground": _foreground,
    "peekViewTitleLabel.foreground": _foreground,

    "menu.foreground": _foreground,
    "menu.border": _borderForeground,
    "menu.selectionForeground": _foreground,
    "menu.separatorBackground": _borderForeground,

    "input.background": _inputBackground,
    "input.foreground": _foreground,
    "input.border": _borderForeground,

    "dropdown.foreground": _foreground,
    "dropdown.border": _borderForeground,

    "quickInput.foreground": _foreground,

    "notifications.foreground": _foreground,
    "notifications.border": _borderForeground,

    "breadcrumb.foreground": _foreground,

    "minimap.background": _background,

    "scrollbar.shadow": "transparent",
    "scrollbarSlider.background": _scrollbarThumb,
    "scrollbarSlider.hoverBackground": _scrollbarThumbHover,
    "scrollbarSlider.activeBackground": _scrollbarThumbActive,

    "editorOverviewRuler.background": _background,
    "editorOverviewRuler.border": _borderForeground,

    "editorGroup.background": _background,
    "editorGroupHeader.tabsBackground": theme.get_color(
      "editor.tab.background",
    ),
    "editorGroupHeader.tabsBorder": _borderForeground,
  },
} as monaco.editor.IStandaloneThemeData);
