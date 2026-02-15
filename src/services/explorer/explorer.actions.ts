import { IChildStructure, INode } from "../../../shared/types/explorer.types";

export class explorer_actions {
  public create_file(path: string) {}
  public create_dir(path: string) {}

  public read_file(path: string) {}
  public read_dir(path: string) {}

  public delete_file(path: string) {}
  public delete_dir(path: string) {}

  public stat(path: string) {}

  public async get_child_structure(
    node: INode,
  ): Promise<IChildStructure | null> {
    const child_structure = await window.explorer.get_child_structure(node);
    if (!child_structure) return null;

    return child_structure;
  }
}
