import { IFolderStructure } from "../../../shared/types/explorer.types";
import { VirtualTree } from "../../ui";
import { open_editor_tab } from "../editor/editor.helper";
import { get_file_icon } from "./explorer.helper";
import { VirtualTreeInstance } from "./explorer.types";

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
