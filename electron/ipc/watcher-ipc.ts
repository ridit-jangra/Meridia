import { ipcMain } from "electron";
import { explorer } from "../main-services/explorer-service";
import {
  attach_event_emitter,
  reset_watcher_state,
  set_repo_path,
} from "../shared/watcher.helpers";
import {
  GIT_DELETED_REPO,
  GIT_REFRESH_STATUS,
  WATCHER_START,
  WATCHER_STOP,
} from "../../shared/ipc/channels";
import { git } from "../main-services/git-service";
import chokidar from "chokidar";
import path from "path";
import { event_emitter } from "../shared/emitter";

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

  const git_dot_path = path.join(folder_path, ".git");

  const git_watcher = chokidar.watch(folder_path, {
    ignoreInitial: true,
    depth: 0,
    ignored: (p: string) => {
      if (p === folder_path) return false;
      if (p === git_dot_path) return false;
      if (p.startsWith(git_dot_path + path.sep)) {
        const rel = path.relative(git_dot_path, p);
        return /^(objects|logs)/.test(rel);
      }
      return true;
    },
    awaitWriteFinish: { stabilityThreshold: 300 },
  });

  git_watcher.on("all", (event, changed_path) => {
    if (changed_path === git_dot_path) {
      if (event === "unlinkDir") {
        event_emitter.emit("window.webContents.send", GIT_DELETED_REPO, {});
        return;
      }
      if (event === "addDir") {
        git.push_status(folder_path);
        return;
      }
    }

    git.push_status(folder_path);
  });

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
