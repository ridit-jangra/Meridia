import { ipcMain } from "electron";
import { terminal } from "../main-services/terminal-service";
import {
  NODE_PTY_CREATE,
  NODE_PTY_WRITE,
  NODE_PTY_RESIZE,
  NODE_PTY_KILL,
} from "../../shared/ipc/channels";

ipcMain.handle(NODE_PTY_CREATE, async (event, id: string, cwd?: string) => {
  await terminal.create(id, event.sender, cwd);
  return true;
});

ipcMain.on(NODE_PTY_WRITE, (_, id: string, data: string) => {
  terminal.write(id, data);
});

ipcMain.handle(NODE_PTY_RESIZE, (_, id: string, cols: number, rows: number) => {
  terminal.resize(id, cols, rows);
  return true;
});

ipcMain.handle(NODE_PTY_KILL, (_, id: string) => {
  terminal.kill(id);
  return true;
});
