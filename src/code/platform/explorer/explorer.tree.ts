import { IFolderStructure } from "../../../../shared/types/explorer.types";
import { VirtualTreeInstance } from "../../../types/explorer.types";
import { open_editor_tab } from "../../editor/editor.helper";
import { VirtualTree } from "../../workbench/browser/parts/components/virtual/virtual-tree";
import { get_file_icon } from "./explorer.helper";

export class explorer_tree {
  public tree: VirtualTreeInstance | null = null;
  public structure: IFolderStructure | null = null;

  public register_tree(structure: IFolderStructure) {
    const viewport_el = document.querySelector(
      ".activity-scroll-viewport",
    ) as HTMLElement;

    this.tree = VirtualTree({
      rowHeight: 27,
      height: "full",
      get_icon: get_file_icon,
      icon_folder_name: "file-icons",
      folderStructure: structure,
      onSelect: (id) => open_editor_tab(id),
      scrollViewport: viewport_el,
    });

    this.structure = structure;

    return this.tree;
  }
}
