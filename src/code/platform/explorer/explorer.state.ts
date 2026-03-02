import { IFolderStructure } from "../../../../shared/types/explorer.types";
import { set_folder_structure } from "../../workbench/common/state/slices/explorer.slice";
import { store } from "../../workbench/common/state/store";

export class explorer_state {
  public async get_stored_structure(): Promise<IFolderStructure | null> {
    const current_workspace_path =
      await window.workspace.get_current_workspace_path();
    if (!current_workspace_path) return null;

    const structure = await window.explorer.get_root_structure(
      current_workspace_path,
    );

    return structure;
  }

  public update_folder_structure(new_folder_structure: IFolderStructure) {
    store.dispatch(set_folder_structure(new_folder_structure));
  }
}
