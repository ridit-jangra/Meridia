import { ipcMain } from "electron";
import { workspace } from "../main-services/workspace-service";
import { IWorkspace } from "../../shared/types/workspace.types";
import {
  WORKSPACE_ASK_UPDATE,
  WORKSPACE_CLEAR_CURRENT,
  WORKSPACE_GET,
  WORKSPACE_GET_CURRENT_PATH,
  WORKSPACE_SET_CURRENT_PATH,
  WORKSPACE_STORE,
  WORKSPACE_UPDATE,
} from "../../shared/ipc/channels";
import { lsp_server } from "../main";

ipcMain.handle(WORKSPACE_GET, async (_, folder_path: string) => {
  return await workspace.get_workspace(folder_path);
});

ipcMain.handle(WORKSPACE_STORE, async (_, folder_path: string) => {
  await workspace.store_workspace(folder_path, {});
});

ipcMain.handle(WORKSPACE_GET_CURRENT_PATH, async (_) => {
  return await workspace.get_current_workspace_path();
});

ipcMain.handle(WORKSPACE_SET_CURRENT_PATH, async (_, folder_path: string) => {
  workspace.set_current_workspace_path(folder_path);
  lsp_server.setWorkspacePath(folder_path);
});

ipcMain.handle(WORKSPACE_ASK_UPDATE, async (_) => {
  return await workspace.ask_update_workspace();
});

ipcMain.handle(WORKSPACE_CLEAR_CURRENT, async (_) => {
  return await workspace.clear_current_workspace();
});

ipcMain.handle(
  WORKSPACE_UPDATE,
  async (_, folder_path: string, updates: Partial<IWorkspace>) => {
    return await workspace.update_workspace(folder_path, updates);
  },
);
