import { ipcMain, shell } from "electron";
import { SHELL_OPEN_EXTERNAL } from "../../shared/ipc/channels";

ipcMain.handle(SHELL_OPEN_EXTERNAL, (_, url: string) => {
  shell.openExternal(url);
});
