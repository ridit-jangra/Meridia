import { VirtualTreeInstance } from "../../../types/explorer.types";
import { explorer_tree } from "../explorer/explorer.tree";
import { git_watcher } from "./git.watcher";
export class git_service {
  public readonly watcher = new git_watcher();
  public readonly tree = new explorer_tree();

  constructor() {}

  async init(tree: VirtualTreeInstance) {
    this.init_watcher(tree);
  }

  private async init_watcher(tree: VirtualTreeInstance) {
    // await this.watcher.start_watcher(path);
    this.watcher.attach_listener();
    this.watcher.attach_tree_listener(tree);
  }
}
