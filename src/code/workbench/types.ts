import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export interface ITheme {
  name: string;
  kind: "light" | "dark";
  colors: Partial<Record<IThemeColors, string>>;
  tokenColors?: Partial<Record<ITokenColors, string>>;
}

export const TokenColors = [
  "default",
  "keyword",
  "keyword.json",
  "keyword.typeModifier",
  "metadata",
  "number",
  "boolean",
  "string",
  "string.binary",
  "string.escape",
  "string.escape.alternative",
  "string.format.item",
  "string.regexp",
  "identifier",
  "identifier.this",
  "identifier.constant",
  "identifier.variable.local",
  "identifier.parameter",
  "identifier.function.declaration",
  "identifier.method.static",
  "identifier.builtin",
  "identifier.type",
  "identifier.field",
  "identifier.field.static",
  "identifier.interface",
  "identifier.type.class",
  "comment",
  "comment.parameter",
  "punctuation",
];

export const ThemeColors = [
  "workbench.background",
  "workbench.foreground",
  "workbench.border.foreground",
  "workbench.icon.foreground",
  "workbench.item.hover.background",
  "workbench.primary.button.background",
  "workbench.primary.button.foreground",
  "workbench.secondary.button.background",
  "workbench.secondary.button.foreground",
  "workbench.button.border",
  "workbench.button.separator",
  "workbench.secondary.button.border",
  "workbench.input.background",
  "workbench.input.foreground",
  "workbench.input.outline",
  "workbench.input.active.outline",
  "workbench.input.icon.foreground",
  "workbench.tabs.background",
  "workbench.tabs.foreground",
  "workbench.tabs.icon.foreground",
  "workbench.tabs.hover.background",
  "workbench.tabs.hover.foreground",
  "workbench.tabs.active.background",
  "workbench.tabs.active.foreground",
  "workbench.tabs.active.border.foreground",
  "workbench.scrollbar.background",
  "workbench.scrollbar.thumb.foreground",
  "workbench.scrollbar.thumb.hover.foreground",
  "workbench.scrollbar.thumb.active.foreground",
  "workbench.dialog.background",
  "workbench.dialog.foreground",
  "workbench.dialog.hover.background",
  "workbench.dialog.hover.foreground",
  "workbench.panel.background",
  "workbench.panel.options.hover.background",
  "workbench.panel.options.active.background",
  "workbench.panel.options.active.border.foreground",
  "workbench.titlebar.background",
  "workbench.titlebar.foreground",
  "workbench.titlebar.item.hover.background",
  "workbench.titlebar.window.controls.circle.foreground",
  "workbench.titlebar.search.background",
  "workbench.titlebar.search.foreground",
  "workbench.titlebar.search.hover.outline",
  "workbench.titlebar.menu.background",
  "workbench.titlebar.menu.foreground",
  "workbench.titlebar.menu.item.hover.background",
  "workbench.editor.background",
  "workbench.editor.foreground",
  "workbench.editor.cursor.foreground",
  "workbench.editor.line.highlight.background",
  "workbench.editor.suggestion.active.background",
  "workbench.editor.widget.background",
  "workbench.mira.message.user.background",
  "workbench.mira.message.user.foreground",
  "workbench.mira.message.user.border.foreground",
  "workbench.mira.message.ai.background",
  "workbench.mira.message.ai.foreground",
  "workbench.mira.message.ai.border.foreground",
  "workbench.mira.chatbox.background",
  "workbench.mira.chatbox.foreground",
  "workbench.mira.chatbox.border.foreground",
  "workbench.mira.chatbox.active.border.foreground",
  "workbench.mira.voice.color.violet",
  "workbench.mira.voice.color.orange",
  "workbench.mira.voice.color.white",
  "workbench.mira.voice.color.black",
  "workbench.mira.voice.caption.active.background",
  "workbench.terminal.background",
  "workbench.terminal.foreground",
  "workbench.terminal.cursor.foreground",
  "workbench.terminal.selection.background",
  "workbench.terminal.black",
  "workbench.terminal.red",
  "workbench.terminal.green",
  "workbench.terminal.yellow",
  "workbench.terminal.blue",
  "workbench.terminal.magenta",
  "workbench.terminal.cyan",
  "workbench.terminal.white",
  "workbench.terminal.bright.black",
  "workbench.terminal.bright.red",
  "workbench.terminal.bright.green",
  "workbench.terminal.bright.yellow",
  "workbench.terminal.bright.blue",
  "workbench.terminal.bright.magenta",
  "workbench.terminal.bright.cyan",
  "workbench.terminal.bright.white",
  "workbench.statusbar.foreground",
  "workbench.statusbar.item.hover.background",
  "workbench.drawboard.background",
  "workbench.drawboard.canvas.background",
  "workbench.drawboard.canvas.background",
  "workbench.drawboard.tools.background",
  "workbench.drawboard.tools.tool.active.background",
  "workbench.drawboard.tools.tool.hover.background",
  "workbench.drawboard.tools.tool.active.border.foreground",
  "workbench.drawboard.canvas.grid.background",
  "workbench.drawboard.canvas.stroke.foreground",
] as const;

export type IThemeColors = (typeof ThemeColors)[number];
export type ITokenColors = (typeof TokenColors)[number];

export type TSplitterDirection = "horizontal" | "vertical";

export type TDragState = {
  startPos: number;
  prevPanelIndex: number;
  nextPanelIndex: number;
  prevPanelSize: number;
  nextPanelSize: number;
  direction: TSplitterDirection;
};

export interface Menuitems {
  label: string;
  action?: string;
  separator?: boolean;
  submenu?: Menuitems[];
  disabled?: boolean;
  shortcut?: string[];
}

export interface IEditorTab {
  name: string;
  icon?: string;
  uri: string;
  is_touched: boolean;
  active: boolean;
}

export interface IDevTab {
  id: string;
  name: string;
  active: boolean;
  icon?: string;
}

export interface IDevPanelTab {
  id: string;
  name: string;
  active: boolean;
  uri: string;
}

export interface IXTermInstance {
  term: XTerm;
  _container: HTMLElement;
  _fitAddon: FitAddon;
  _ptyDataListener: Function;
}

export interface IMainState {
  editor_tabs: IEditorTab[];
  panel_state: IPanelState;
  folder_structure: IFolderStructure;
}

export interface IPanelState {
  left: boolean;
  bottom: boolean;
  right: boolean;
}

export interface IFolderStructure {
  name: string;
  uri: string;
  type: "folder" | "file";
  isRoot: boolean;
  children: IFolderStructure[];
}

export interface IChatMessage {
  id: string;
  content: string;
  isUser: boolean;
}

export interface IMiraResponse {
  response: string;
  error?: string;
}

export interface IScrollbarState {
  id?: string | undefined;
  className: string;
  scrollTop: number;
  scrollLeft: number;
  config: {
    suppressScrollX: boolean;
    suppressScrollY: boolean;
  };
  innerHTML: string;
  attributes: Record<string, string>;
}

export interface IStatusBarAction {
  _name: string;
  _action: Function;
  _condition: "workbench.editor.open" | "workbench.editor.open.file" | "none";
}

export interface IExtensionModule {
  activate?(api: any): void;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface IBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TShapeType = "freehand" | "rectangle" | "circle" | "line" | "arrow";

export interface IShape {
  type: TShapeType;
  path: IPoint[];
  selected: boolean;
  boundingBox: IBoundingBox;
  startPoint?: IPoint;
  endPoint?: IPoint;
  thickness: number;
}

export type TResizeHandle = "nw" | "ne" | "sw" | "se" | null;
export type TDrawingTool =
  | "mouse"
  | "pen"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow";
