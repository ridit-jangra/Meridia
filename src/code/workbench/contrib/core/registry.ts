import {
  ICustomEditor,
  ICustomModel,
  IMonacoEditor,
  IMonacoModel,
} from "../../../../types/editor.types";
import { lucide } from "../../browser/parts/components/icon";

import { h } from "./dom/h";
import { shortcuts } from "../../common/shortcut/shortcut.service";
import { editor } from "../../../editor/editor";
import { EditorGroups } from "../editor/editor-groups";
import { Preview } from "../preview/preview";
import { MovableViewSlot } from "../editor/group/view-host";

export const tabs_registry: Record<string, () => HTMLElement> = {
  terminal: () => MovableViewSlot("terminal"),
  problems: () => MovableViewSlot("problems"),
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
          position: "bottom",
        },
      },
      lucide("plus"),
    );
    const el = h("div", { class: "flex items-center gap-1" }, add_opt);

    return el;
  },
};

export const panels_registry: Record<
  string,
  () => HTMLElement | Promise<HTMLElement>
> = {
  explorer: () => MovableViewSlot("explorer"),
  editor: () => EditorGroups(),
  ai_chat: () => MovableViewSlot("ai_chat"),
  git: () => MovableViewSlot("git"),
  preview: () => Preview(),
  search: () => MovableViewSlot("search"),
};

export const editors_registry: Record<
  string,
  editor<IMonacoEditor | ICustomEditor, ICustomModel | IMonacoModel>
> = {};
