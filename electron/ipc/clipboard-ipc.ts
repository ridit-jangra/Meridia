import { ipcMain, clipboard } from "electron";

ipcMain.on("clipboard:read", (e) => {
  e.returnValue = clipboard.readText();
});

ipcMain.on("clipboard:write", (e, text: string) => {
  clipboard.writeText(text);
  e.returnValue = true;
});
