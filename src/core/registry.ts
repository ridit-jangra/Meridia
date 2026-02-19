import { editor } from "../services/editor/editor";
import {
  ICustomEditor,
  ICustomModel,
  IMonacoEditor,
  IMonacoModel,
} from "../services/editor/editor.types";
import { EditorArea } from "../workbench/editor/editor-area";
import { Explorer } from "../workbench/explorer/explorer";
import { h } from "./dom/h";

export const tabs_registry: Record<string, () => HTMLElement> = {
  terminal: () => h("div", { class: "p-2" }, "Terminal view"),
  problems: () => h("div", { class: "p-2" }, "Problems view"),
};

export const panels_registry: Record<string, () => HTMLElement> = {
  explorer: () => Explorer(),
  editor: () => EditorArea(),
};

export const editors_registry: Record<
  string,
  editor<IMonacoEditor | ICustomEditor, ICustomModel | IMonacoModel>
> = {};
