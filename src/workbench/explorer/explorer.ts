import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { open_editor_tab } from "../../services/editor/editor.helper";
import { get_file_icon } from "../../services/explorer/explorer.helper";
import { store } from "../../services/state/store";
import { VirtualTree } from "../../ui";

export function Explorer() {
  const structure = store.getState().explorer.folder_structure;

  const el = h("div", { class: cn("h-full w-full") });

  const tree = VirtualTree({
    rowHeight: 27,
    height: "full",
    get_icon: get_file_icon,
    icon_folder_name: "file-icons",
    folderStructure: structure,
    initiallyOpenAll: true,
    onSelect: (id) => open_editor_tab(id),
  });

  el.appendChild(tree.el);

  return el;
}
