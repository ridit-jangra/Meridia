import { ipcMain } from "electron";
import { git } from "../main-services/git-service";
import {
  GIT_GET_STATUS,
  GIT_INIT_REPO,
  GIT_IS_REPO,
} from "../../shared/ipc/channels";

ipcMain.handle(GIT_GET_STATUS, async (_, folder_path: string) => {
  await git.push_status(folder_path);
});

ipcMain.handle(GIT_IS_REPO, async (_, folder_path: string) => {
  try {
    const isRepo = await git.is_git_repo(folder_path);
    return isRepo;
  } catch (err) {
    console.error("[git] is_git_repo error:", err);
    return false;
  }
});

ipcMain.handle(GIT_INIT_REPO, async (_, folder_path: string) => {
  try {
    await git.init_repo(folder_path);
    return true;
  } catch (err) {
    console.error("[git] init_repo error:", err);
    return false;
  }
});
