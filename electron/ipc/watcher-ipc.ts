import { ipcMain } from "electron";
import { explorer } from "../main-services/explorer-service";
import {
  attach_event_emitter,
  reset_watcher_state,
  set_repo_path,
} from "../shared/watcher.helpers";
import { WATCHER_START, WATCHER_STOP } from "../../shared/ipc/channels";
import { git } from "../main-services/git-service";
import chokidar from "chokidar";
import path from "path";

const git_internal_watchers = new Map<
  string,
  ReturnType<typeof chokidar.watch>
>();

const watchers = new Map<string, any>();

ipcMain.handle(WATCHER_START, async (_, folder_path: string) => {
  if (watchers.has(folder_path)) return;
  reset_watcher_state();

  const watcher = explorer.start_watcher(folder_path, attach_event_emitter);
  watchers.set(folder_path, watcher);

  set_repo_path(folder_path);
  // await git.push_status(folder_path);

  const git_watcher = chokidar.watch(path.join(folder_path, ".git"), {
    ignoreInitial: true,
    ignored: [/\.git[\\/]objects/, /\.git[\\/]logs/],
    awaitWriteFinish: { stabilityThreshold: 300 },
  });

  git_watcher.on("all", () => git.push_status(folder_path));
  git_internal_watchers.set(folder_path, git_watcher);
});

ipcMain.handle(WATCHER_STOP, async (_, folder_path: string) => {
  explorer.stop_watcher(folder_path);
  watchers.delete(folder_path);
  reset_watcher_state();
  set_repo_path(null);

  git_internal_watchers.get(folder_path)?.close();
  git_internal_watchers.delete(folder_path);
});
