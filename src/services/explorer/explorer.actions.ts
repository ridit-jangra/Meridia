import { IChildStructure, INode } from "../../../shared/types/explorer.types";
import { history } from "../../services/history/history.service";

export class explorer_actions {
  public create_file(path: string) {
    history.push("explorer.create_file", { path });
    path;
  }

  public create_dir(path: string) {
    history.push("explorer.create_dir", { path });
    path;
  }

  public read_file(path: string) {
    history.push("explorer.read_file", { path });
    path;
  }

  public read_dir(path: string) {
    history.push("explorer.read_dir", { path });
    path;
  }

  public delete_file(path: string) {
    history.push("explorer.delete_file", { path });
    path;
  }

  public delete_dir(path: string) {
    history.push("explorer.delete_dir", { path });
    path;
  }

  public stat(path: string) {
    history.push("explorer.stat", { path });
    path;
  }

  public async get_child_structure(
    node: INode,
  ): Promise<IChildStructure | null> {
    history.push("explorer.get_child_structure", {
      node_id: node.id,
      path: (node as any).path,
      kind: (node as any).kind ?? (node as any).type,
    });

    const child_structure = await window.explorer.get_child_structure(node);
    if (!child_structure) return null;

    history.push("explorer.get_child_structure.ok", {
      node_id: node.id,
      count: child_structure.child_nodes.length ?? 0,
    });

    return child_structure;
  }
}
