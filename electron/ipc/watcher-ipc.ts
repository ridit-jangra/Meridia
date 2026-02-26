import { ipcMain } from "electron";
import { explorer } from "../main-services/explorer-service";
import { attach_event_listener } from "../shared/watcher.helpers";
import { WATCHER_START, WATCHER_STOP } from "../../shared/ipc/channels";

const watchers = new Map<string, any>();

ipcMain.handle(WATCHER_START, async (_, folder_path: string) => {
  if (watchers.has(folder_path)) return;

  const watcher = explorer.start_watcher(folder_path, attach_event_listener);

  watchers.set(folder_path, watcher);
});

ipcMain.handle(WATCHER_STOP, async (_, folder_path: string) => {
  explorer.stop_watcher(folder_path);
  watchers.delete(folder_path);
});
