import {
  ICustomEditor,
  ICustomModel,
  IMonacoEditor,
  IMonacoModel,
} from "../../../../types/editor.types";
import { lucide } from "../../browser/parts/components/icon";

import { h } from "./dom/h";
import { TerminalPanel } from "../terminal/browser/terminal";
import { shortcuts } from "../../common/shortcut/shortcut.service";
import { Explorer } from "../explorer/explorer";
import { editor } from "../../../editor/editor";
import { EditorArea } from "../editor/editor-area";

export const tabs_registry: Record<string, () => HTMLElement> = {
  terminal: () => {
    const el = TerminalPanel();
    return el.el;
  },
  problems: () => h("div", { class: "p-2" }, "Problems view"),
};

export const tabs_options_registery: Record<string, () => HTMLElement> = {
  terminal: () => {
    const add_opt = h(
      "span",
      {
        class:
          "p-1.5 rounded-[7px] cursor-pointer [&_svg]:w-5 [&_svg]:h-5 hover:bg-view-tab-active-background",
        on: {
          click: () => {
            shortcuts.run_shortcut("terminal.new");
          },
        },
        tooltip: {
          text: `Add Terminal (${shortcuts.get_shortcut({ id: "newTerminal" })?.keys})`,
          position: "top",
        },
      },
      lucide("plus"),
    );
    const el = h("div", { class: "flex items-center gap-1" }, add_opt);

    return el;
  },
};

export const panels_registry: Record<string, () => HTMLElement> = {
  explorer: () => Explorer(),
  editor: () => EditorArea(),
};

export const editors_registry: Record<
  string,
  editor<IMonacoEditor | ICustomEditor, ICustomModel | IMonacoModel>
> = {};
