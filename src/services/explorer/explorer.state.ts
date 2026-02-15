import { CURRENT_WORKSPACE } from "../../../shared/storage-keys";
import { IFolderStructure } from "../../../shared/types/explorer.types";
import { set_folder_structure } from "../state/slices/explorer.slice";
import { store } from "../state/store";

export class explorer_state {
  public async get_current_folder_structure(): Promise<IFolderStructure | null> {
    const stored_folder_structure = store.getState().explorer.folder_structure;
    if (stored_folder_structure) return stored_folder_structure;

    const workspace_path = (await window.storage.get(
      CURRENT_WORKSPACE,
    )) as string;
    if (!workspace_path) return null;

    const folder_structure = (await window.explorer.get_root_structure(
      workspace_path,
    )) as IFolderStructure;
    if (!folder_structure) return null;

    store.dispatch(set_folder_structure(folder_structure));

    return folder_structure;
  }

  public update_folder_structure(new_folder_structure: IFolderStructure) {
    store.dispatch(set_folder_structure(new_folder_structure));
  }
}
