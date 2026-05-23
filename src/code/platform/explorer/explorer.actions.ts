import {
  IChildStructure,
  INode,
} from "../../../../shared/types/explorer.types";

export class explorer_actions {
  public async create_file(path: string, content: string) {
    return await window.files.write_file_text(path, content);
  }

  public async create_dir(path: string) {
    return await window.files.create_dir(path);
  }

  public async read_file(path: string) {
    return await window.files.read_file_text(path);
  }

  public async rename(from: string, to: string) {
    return await window.files.rename(from, to);
  }

  public async read_dir(path: string) {
    return await window.files.readdir(path);
  }

  public async delete_file(path: string) {
    return await window.files.remove(path);
  }

  public async delete_dir(path: string) {
    return await window.files.remove(path);
  }

  public async stat(path: string) {
    return await window.files.stat(path);
  }

  public async get_child_structure(
    node: INode,
  ): Promise<IChildStructure | null> {
    const raw = await window.explorer.get_child_structure(node);
    if (!raw) return null;

    const child_structure: IChildStructure = Array.isArray(raw)
      ? { id: node.id, child_nodes: raw, path: node.path }
      : raw;

    return child_structure;
  }
}
