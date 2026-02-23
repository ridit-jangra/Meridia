import { IFolderStructure } from "../../../shared/types/explorer.types";
import { set_folder_structure } from "../state/slices/explorer.slice";
import { store } from "../state/store";
import { explorer_actions } from "./explorer.actions";
import { explorer_state } from "./explorer.state";

class explorer_service {
  public readonly actions = new explorer_actions();
  public readonly state = new explorer_state();

  constructor() {
    this.init_structure();
  }

  private async init_structure() {
    const structure = await this.state.get_stored_structure();

    if (!structure) return;

    store.dispatch(set_folder_structure(structure));
  }
}

export const explorer = new explorer_service();
