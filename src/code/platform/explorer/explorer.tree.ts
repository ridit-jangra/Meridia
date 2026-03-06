import { IFolderStructure } from "../../../../shared/types/explorer.types";
import { VirtualTreeInstance } from "../../../types/explorer.types";
import { open_editor_tab } from "../../editor/editor.helper";
import { VirtualTree } from "../../workbench/browser/parts/components/virtual/virtual-tree";
import { get_file_icon } from "./explorer.helper";

export class explorer_tree {
  public tree: VirtualTreeInstance | null = null;
  public structure: IFolderStructure | null = null;

  public async register_tree(structure: IFolderStructure) {
    const viewport_el = document.querySelector(
      ".activity-scroll-viewport",
    ) as HTMLElement;

    const workspace_path = await window.workspace.get_current_workspace_path();

    const initial_open_folders = await (async () => {
      if (!workspace_path) return [];
      const ws = await window.workspace.get_workspace(workspace_path);
      return ws?.open_folders ?? [];
    })();

    const save_open_folders = async (open_folders: string[]) => {
      if (!workspace_path) return;
      await window.workspace.update_workspace(workspace_path, { open_folders });
    };

    this.tree = VirtualTree({
      rowHeight: 28.5,
      height: "full",
      get_icon: get_file_icon,
      icon_folder_name: "file-icons",
      folderStructure: structure,
      initialOpenFolders: initial_open_folders,
      onSelect: (id) => open_editor_tab(id),
      onOpenFoldersChange: save_open_folders,
      scrollViewport: viewport_el,
    });

    this.structure = structure;

    return this.tree;
  }
}
