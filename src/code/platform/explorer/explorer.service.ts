import { VirtualTreeInstance } from "../../../types/explorer.types";
import { set_folder_structure } from "../../workbench/common/state/slices/explorer.slice";
import { store } from "../../workbench/common/state/store";
import { explorer_actions } from "./explorer.actions";
import { explorer_state } from "./explorer.state";
import { explorer_tree } from "./explorer.tree";
import { explorer_watcher } from "./explorer.watcher";

class explorer_service {
  public readonly actions = new explorer_actions();
  public readonly state = new explorer_state();
  public readonly watcher = new explorer_watcher();
  public readonly tree = new explorer_tree();

  constructor() {
    this.init();
  }

  private async init() {
    const structure = await this.init_structure();
    if (!structure) return;

    const tree = this.tree.register_tree(structure);
    this.init_watcher(structure.path, tree);
  }

  private async init_watcher(path: string, tree: VirtualTreeInstance) {
    await this.watcher.start_watcher(path);
    this.watcher.attach_listener();
    this.watcher.attach_tree_listener(tree);
  }

  private async init_structure() {
    const structure = await this.state.get_stored_structure();

    if (!structure) return;

    store.dispatch(set_folder_structure(structure));

    return structure;
  }
}

export const explorer = new explorer_service();
