import monaco from "monaco-editor";
import { getStandalone } from "../../workbench/common/standalone";
import { Theme } from "../../workbench/common/theme";

const _theme = getStandalone("theme") as Theme;
const _kind = _theme.getActiveTheme().kind;
const _background = _theme.getColor("workbench.editor.background");
const _foreground = _theme.getColor("workbench.editor.foreground");
const _cursor = _theme.getColor("workbench.editor.cursor.foreground");
const _lineHighlight = _theme.getColor(
  "workbench.editor.line.highlight.background"
);
const _tokens = _theme.getActiveTheme().tokenColors!;

const _widgetBackground = _theme.getColor("workbench.editor.widget.background");
const _hoverBackground = _theme.getColor("workbench.item.hover.background");
const _borderForeground = _theme.getColor("workbench.border.foreground");
const _inputBackground = _theme.getColor("workbench.input.background");
const _scrollbarThumb = _theme.getColor("workbench.scrollbar.thumb.foreground");
const _scrollbarThumbHover = _theme.getColor(
  "workbench.scrollbar.thumb.hover.foreground"
);
const _scrollbarThumbActive = _theme.getColor(
  "workbench.scrollbar.thumb.active.foreground"
);

export function registerTheme(_monaco: any) {
  _monaco.editor.defineTheme("meridia-theme", {
    base: _kind === "light" ? "vs" : "vs-dark",
    inherit: true,
    rules: [
      { token: "default", foreground: _tokens.default },
      { token: "keyword", foreground: _tokens.keyword },
      { token: "keyword.json", foreground: _tokens["keyword.json"] },
      {
        token: "keyword.typeModifier",
        foreground: _tokens["keyword.typeModifier"],
      },
      { token: "metadata", foreground: _tokens.metadata },
      { token: "number", foreground: _tokens.number },
      { token: "boolean", foreground: _tokens.boolean || "d19a66" },
      { token: "string", foreground: _tokens.string },
      { token: "string.binary", foreground: _tokens["string.binary"] },
      { token: "string.escape", foreground: _tokens["string.escape"] },
      {
        token: "string.escape.alternative",
        foreground: _tokens["string.escape.alternative"],
      },
      {
        token: "string.formatItem",
        foreground: _tokens["string.format.item"],
      },
      { token: "string.regexp", foreground: _tokens["string.regexp"] },
      { token: "identifier", foreground: _tokens.identifier },
      { token: "identifier.this", foreground: _tokens["identifier.this"] },
      {
        token: "identifier.constant",
        foreground: _tokens["identifier.constant"],
      },
      {
        token: "identifier.variable.local",
        foreground: _tokens["identifier.variable.local"],
      },
      {
        token: "identifier.parameter",
        foreground: _tokens["identifier.parameter"],
      },
      {
        token: "identifier.function.declaration",
        foreground: _tokens["identifier.function.declaration"],
      },
      {
        token: "identifier.method.static",
        foreground: _tokens["identifier.method.static"],
      },
      {
        token: "identifier.builtin",
        foreground: _tokens["identifier.builtin"],
      },
      { token: "identifier.type", foreground: _tokens["identifier.type"] },
      { token: "identifier.field", foreground: _tokens["identifier.field"] },
      {
        token: "identifier.field.static",
        foreground: _tokens["identifier.field.static"],
      },
      {
        token: "identifier.interface",
        foreground: _tokens["identifier.interface"],
      },
      {
        token: "identifier.type.class",
        foreground: _tokens["identifier.type.class"],
      },
      { token: "comment", foreground: _tokens.comment },
      {
        token: "comment.parameter",
        foreground: _tokens["comment.parameter"],
      },
      { token: "punctuation", foreground: _tokens.punctuation },
    ],
    colors: {
      "editor.background": _background,
      "editor.foreground": _foreground,
      "editorCursor.foreground": _cursor,
      "editor.lineHighlightBorder": _background,
      "editor.lineHighlightBackground": _lineHighlight,

      "editorWidget.background": _widgetBackground,
      "editorWidget.foreground": _foreground,
      "editorWidget.border": _borderForeground,
      "editorWidget.resizeBorder": _borderForeground,

      "editorSuggestWidget.background": _widgetBackground,
      "editorSuggestWidget.foreground": _foreground,
      "editorSuggestWidget.border": _borderForeground,
      "editorSuggestWidget.highlightForeground": _theme.getColor(
        "workbench.tabs.active.foreground"
      ),
      "editorSuggestWidget.selectedBackground": _hoverBackground,
      "editorSuggestWidget.selectedForeground": _foreground,
      "editorSuggestWidget.selectedIconForeground": _foreground,
      "editorSuggestWidget.focusHighlightForeground": _theme.getColor(
        "workbench.tabs.active.foreground"
      ),

      "editorHoverWidget.background": _widgetBackground,
      "editorHoverWidget.foreground": _foreground,
      "editorHoverWidget.border": _borderForeground,
      "editorHoverWidget.statusBarBackground": _widgetBackground,

      "editorParameterHint.background": _widgetBackground,
      "editorParameterHint.foreground": _foreground,

      "editorFindWidget.background": _widgetBackground,
      "editorFindWidget.foreground": _foreground,
      "editorFindWidget.border": _borderForeground,
      "editorFindWidget.resizeBorder": _borderForeground,

      "peekViewEditor.background": _widgetBackground,
      "peekViewEditor.matchHighlightBackground": _hoverBackground,
      "peekViewResult.background": _widgetBackground,
      "peekViewResult.foreground": _foreground,
      "peekViewResult.lineForeground": _foreground,
      "peekViewResult.selectionBackground": _hoverBackground,
      "peekViewResult.selectionForeground": _foreground,
      "peekViewTitle.background": _widgetBackground,
      "peekViewTitleLabel.foreground": _foreground,
      "peekViewTitleDescription.foreground": _theme.getColor(
        "workbench.tabs.foreground"
      ),

      "menu.background": _widgetBackground,
      "menu.foreground": _foreground,
      "menu.border": _borderForeground,
      "menu.selectionBackground": _hoverBackground,
      "menu.selectionForeground": _foreground,
      "menu.separatorBackground": _borderForeground,

      "input.background": _inputBackground,
      "input.foreground": _foreground,
      "input.border": _borderForeground,
      "input.activeBorder": _theme.getColor("workbench.input.active.outline"),
      "input.placeholderForeground": _theme.getColor(
        "workbench.tabs.foreground"
      ),

      "dropdown.background": _widgetBackground,
      "dropdown.foreground": _foreground,
      "dropdown.border": _borderForeground,
      "dropdown.listBackground": _widgetBackground,

      "quickInput.background": _widgetBackground,
      "quickInput.foreground": _foreground,
      "quickInputList.focusBackground": _hoverBackground,

      "notificationCenter.background": _widgetBackground,
      "notificationCenterHeader.background": _widgetBackground,
      "notifications.background": _widgetBackground,
      "notifications.foreground": _foreground,
      "notifications.border": _borderForeground,

      "editorCodeLens.foreground": _theme.getColor("workbench.tabs.foreground"),

      "breadcrumb.foreground": _foreground,
      "breadcrumb.background": _widgetBackground,
      "breadcrumb.focusForeground": _theme.getColor(
        "workbench.tabs.active.foreground"
      ),
      "breadcrumb.activeSelectionForeground": _theme.getColor(
        "workbench.tabs.active.foreground"
      ),
      "breadcrumb.pickerBackground": _widgetBackground,

      "minimap.background": _background,

      "scrollbar.shadow": "transparent",
      "scrollbarSlider.background": _scrollbarThumb,
      "scrollbarSlider.hoverBackground": _scrollbarThumbHover,
      "scrollbarSlider.activeBackground": _scrollbarThumbActive,

      "editorOverviewRuler.background": _background,
      "editorOverviewRuler.border": _borderForeground,
      "editorOverviewRuler.findMatchForeground":
        _theme.getColor("workbench.terminal.yellow") || "#ffcc00",
      "editorOverviewRuler.rangeHighlightForeground":
        _theme.getColor("workbench.terminal.cyan") || "#00ffff",
      "editorOverviewRuler.selectionHighlightForeground": _hoverBackground,
      "editorOverviewRuler.wordHighlightForeground":
        _theme.getColor("workbench.terminal.blue") || "#0000ff",
      "editorOverviewRuler.wordHighlightStrongForeground":
        _theme.getColor("workbench.terminal.blue") || "#0000ff",
      "editorOverviewRuler.modifiedForeground":
        _theme.getColor("workbench.terminal.yellow") || "#ffcc00",
      "editorOverviewRuler.addedForeground":
        _theme.getColor("workbench.terminal.green") || "#00ff00",
      "editorOverviewRuler.deletedForeground":
        _theme.getColor("workbench.terminal.red") || "#ff0000",
      "editorOverviewRuler.errorForeground":
        _theme.getColor("workbench.terminal.red") || "#ff0000",
      "editorOverviewRuler.warningForeground":
        _theme.getColor("workbench.terminal.yellow") || "#ffcc00",
      "editorOverviewRuler.infoForeground":
        _theme.getColor("workbench.terminal.blue") || "#0000ff",
      "editorOverviewRuler.bracketMatchForeground":
        _theme.getColor("workbench.terminal.cyan") || "#00ffff",

      "editorGroup.background": _background,
      "editorGroupHeader.tabsBackground":
        _theme.getColor("workbench.tabs.background") || _widgetBackground,
      "editorGroupHeader.tabsBorder": _borderForeground,

      "statusBar.background": _widgetBackground,
      "statusBar.foreground":
        _theme.getColor("workbench.statusbar.foreground") || _foreground,
      "statusBar.border": _borderForeground,

      "panel.background": _widgetBackground,
      "panel.border": _borderForeground,
      "panelTitle.activeBorder":
        _theme.getColor("workbench.tabs.active.border.foreground") || "#0078d4",
      "panelTitle.activeForeground":
        _theme.getColor("workbench.tabs.active.foreground") || _foreground,
      "panelTitle.inactiveForeground":
        _theme.getColor("workbench.tabs.foreground") || "#cccccc",

      "editor.selectionBackground": _hoverBackground,
      "editor.selectionHighlightBackground":
        _theme.getColor("workbench.panel.options.hover.background") ||
        _hoverBackground,
      "editor.inactiveSelectionBackground":
        _theme.getColor("workbench.panel.options.hover.background") ||
        _hoverBackground,

      "editorError.foreground": _theme.getColor("workbench.terminal.red"),
      "editorWarning.foreground": _theme.getColor("workbench.terminal.yellow"),
      "editorInfo.foreground": _theme.getColor("workbench.terminal.blue"),
      "editorHint.foreground": _theme.getColor("workbench.terminal.cyan"),
    },
  } as monaco.editor.IStandaloneThemeData);
}
