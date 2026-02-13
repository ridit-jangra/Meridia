import { ipcMain } from "electron";
import { explorer } from "../services/explorer-service";
import { INode } from "../../shared/explorer.types";

ipcMain.handle(
  "workbench.explorer.get.root.structure",
  async (_, folder_path: string) => {
    return await explorer.get_root_structure(folder_path);
  },
);

ipcMain.handle(
  "workbench.explorer.get.child.structure",
  async (_, node: INode) => {
    return await explorer.get_child_structure(node);
  },
);
