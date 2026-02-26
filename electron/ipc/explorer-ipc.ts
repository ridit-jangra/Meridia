import { ipcMain } from "electron";
import { explorer } from "../main-services/explorer-service";
import { INode } from "../../shared/types/explorer.types";
import {
  EXPLORER_GET_CHILD_STRUCTURE,
  EXPLORER_GET_ROOT_STRUCTURE,
} from "../../shared/ipc/channels";

ipcMain.handle(EXPLORER_GET_ROOT_STRUCTURE, async (_, folder_path: string) => {
  return await explorer.get_root_structure(folder_path);
});

ipcMain.handle(EXPLORER_GET_CHILD_STRUCTURE, async (_, node: INode) => {
  return await explorer.get_child_structure(node);
});
