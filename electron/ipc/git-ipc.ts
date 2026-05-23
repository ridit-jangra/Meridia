import { ipcMain } from "electron";
import { git } from "../main-services/git-service";
import { GIT_GET_STATUS } from "../../shared/ipc/channels";

ipcMain.handle(GIT_GET_STATUS, async (_, folder_path: string) => {
  await git.push_status(folder_path);
});
