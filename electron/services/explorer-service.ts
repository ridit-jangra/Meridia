import { IFolderStructure, INode } from "../../shared/types/explorer.types";
import path from "path";
import fs from "fs/promises";

class explorer_services {
  public async get_root_structure(
    folder_path: string,
  ): Promise<IFolderStructure> {
    try {
      const entries = await fs.readdir(folder_path, { withFileTypes: true });

      const structure: INode[] = [];

      for (const entry of entries) {
        const full_path = path.join(folder_path, entry.name);

        structure.push({
          id: full_path,
          type: entry.isDirectory() ? "folder" : "file",
          name: entry.name,
          path: full_path,
          child_nodes: [],
        });
      }

      return {
        root: {
          name: path.basename(folder_path),
        },
        path: folder_path,
        structure: structure,
      };
    } catch (error) {
      console.error("Error reading directory:", error);
      return {
        root: { name: path.basename(folder_path) },
        path: folder_path,
        structure: [],
      };
    }
  }

  public async get_child_structure(node: INode): Promise<INode[]> {
    // Only folders can have children
    if (node.type !== "folder") {
      return [];
    }

    try {
      const entries = await fs.readdir(node.path, { withFileTypes: true });

      const child_nodes: INode[] = [];

      for (const entry of entries) {
        const full_path = path.join(node.path, entry.name);

        child_nodes.push({
          id: full_path,
          type: entry.isDirectory() ? "folder" : "file",
          name: entry.name,
          path: full_path,
          child_nodes: [],
        });
      }

      return child_nodes;
    } catch (error) {
      console.error("Error reading directory:", error);
      return [];
    }
  }
}

export const explorer = new explorer_services();
