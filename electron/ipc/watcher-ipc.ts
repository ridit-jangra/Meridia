import { ipcMain } from "electron";
import { explorer } from "../services/explorer-service";
import { attach_event_listener } from "../shared/watcher.helpers";

const watchers = new Map<string, any>();

ipcMain.handle("workbench.watcher.start", async (_, folder_path: string) => {
  if (watchers.has(folder_path)) return;

  const watcher = explorer.start_watcher(folder_path, attach_event_listener);

  watchers.set(folder_path, watcher);
});

ipcMain.handle("workbench.watcher.stop", async (_, folder_path: string) => {
  explorer.stop_watcher(folder_path);

  watchers.delete(folder_path);
});
