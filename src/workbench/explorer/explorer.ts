import { INode } from "../../../shared/types/explorer.types";
import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { explorer_events } from "../../events/explorer.events";
import { open_editor_tab } from "../../services/editor/editor.helper";
import { get_file_icon } from "../../services/explorer/explorer.helper";
import { store } from "../../services/state/store";
import { Button, VirtualTree } from "../../ui";

export function Explorer() {
  const structure = store.getState().explorer.folder_structure;

  const el = h("div", {
    class: cn("h-full w-full", ""),
  });

  if (structure && structure.path) {
    const tree = VirtualTree({
      rowHeight: 27,
      height: "full",
      get_icon: get_file_icon,
      icon_folder_name: "file-icons",
      folderStructure: structure,
      onSelect: (id) => open_editor_tab(id),
    });

    el.appendChild(tree.el);

    explorer_events.on("add", (node: INode) => {
      tree.add(node);
    });

    explorer_events.on("remove", (path: string) => {
      tree.remove(path);
    });

    explorer_events.on("rename", (from: string, to: string) => {
      tree.rename(from, to);
    });
  } else {
    const not_selected = h(
      "div",
      {
        class:
          "flex flex-col items-center justify-between w-full h-full px-4 flex-1",
      },
      h(
        "span",
        { class: "mt-4 w-full min-w-0 truncate text-center" },
        "No Folder Selected.",
      ),
      h(
        "div",
        { class: "flex flex-col items-center gap-1.5 w-full" },
        Button("Select folder", {
          variant: "default",
          class: "w-full",
          onClick: () => {
            window.workspace.ask_update_workspace();
          },
        }),
        Button("Copy repo", { variant: "secondary", class: "w-full" }),
      ),
      h("div", { class: "bg-transparent" }),
    );

    el.appendChild(not_selected);
  }

  return el;
}
