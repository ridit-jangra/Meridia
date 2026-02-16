import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { open_editor_tab } from "../../services/editor/editor.helper";
import { get_file_icon } from "../../services/explorer/explorer.helper";
import { VirtualTree } from "../../ui";

export function Explorer() {
  const tree = VirtualTree({
    rowHeight: 26,
    height: "full",
    get_icon: get_file_icon,
    icon_folder_name: "file-icons",
    roots: [
      {
        id: "src",
        label: "src",
        defaultOpen: true,
        children: [
          { id: "src/main.ts", label: "main.ts" },
          {
            id: "src/ui",
            label: "ui",
            defaultOpen: true,
            children: [
              { id: "src/ui/button.png", label: "button.ts" },
              { id: "src/ui/select", label: "select.ts" },
            ],
          },
        ],
      },
      { id: "package.json", label: "package.json" },
    ],
    onSelect: (id) => open_editor_tab(id),
  });

  const el = h(
    "div",
    {
      class: cn("h-full w-full", "bg-explorer-background"),
    },
    tree.el,
  );

  return el;
}
