import { ipcMain } from "electron";
import { workspace } from "../services/workspace-service";

ipcMain.handle("workbench.workspace.get", async (_, folder_path: string) => {
  return await workspace.get_workspace(folder_path);
});

ipcMain.handle("workbench.workspace.store", async (_, folder_path: string) => {
  await workspace.store_workspace(folder_path);
});

ipcMain.handle("workbench.workspace.get.current.path", async (_) => {
  return await workspace.get_current_workspace_path();
});

ipcMain.handle(
  "workbench.workspace.set.current.path",
  async (_, folder_path: string) => {
    workspace.set_current_workspace_path(folder_path);
  },
);

ipcMain.handle("workbench.workspace.ask.update", async (_) => {
  return await workspace.ask_update_workspace();
});
