import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { explorer } from "../../services/explorer/explorer.service";
import { Button } from "../../ui";

export function Explorer() {
  const el = h("div", {
    class: cn("h-full w-full", ""),
  });

  const structure = explorer.tree.structure;

  if (structure && structure.path) {
    const tree = explorer.tree.tree;
    if (tree) el.appendChild(tree.el);
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
