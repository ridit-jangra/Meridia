import { IChildStructure, INode } from "../../../shared/types/explorer.types";
import { history } from "../../services/history/history.service";

export class explorer_actions {
  public async create_file(path: string, content: string) {
    history.push("explorer.create_file", { path });
    return await window.files.write_file_text(path, content);
  }

  public async create_dir(path: string) {
    history.push("explorer.create_dir", { path });
    return await window.files.create_dir(path);
  }

  public async read_file(path: string) {
    history.push("explorer.read_file", { path });
    return await window.files.read_file_text(path);
  }

  public async rename(from: string, to: string) {
    history.push("explorer.rename", { from, to });
    return await window.files.rename(from, to);
  }

  public async read_dir(path: string) {
    history.push("explorer.read_dir", { path });
    return await window.files.readdir(path);
  }

  public async delete_file(path: string) {
    history.push("explorer.delete_file", { path });
    return await window.files.remove(path);
  }

  public async delete_dir(path: string) {
    history.push("explorer.delete_dir", { path });
    return await window.files.remove(path);
  }

  public async stat(path: string) {
    history.push("explorer.stat", { path });
    return await window.files.stat(path);
  }

  public async get_child_structure(
    node: INode,
  ): Promise<IChildStructure | null> {
    history.push("explorer.get_child_structure", {
      node_id: node.id,
      path: (node as any).path,
      kind: (node as any).kind ?? (node as any).type,
    });

    const raw = await window.explorer.get_child_structure(node);
    if (!raw) return null;

    const child_structure: IChildStructure = Array.isArray(raw)
      ? { id: node.id, child_nodes: raw, path: node.path }
      : raw;

    history.push("explorer.get_child_structure.ok", {
      node_id: node.id,
      count: child_structure.child_nodes?.length ?? 0,
    });

    return child_structure;
  }
}
