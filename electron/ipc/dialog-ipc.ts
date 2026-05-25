import { ipcMain, dialog, BrowserWindow } from "electron";

ipcMain.handle("dialog:confirm", async (e, message: string) => {
  const win = BrowserWindow.fromWebContents(e.sender)!;
  win.blur();
  const { response } = await dialog.showMessageBox(win, {
    type: "question",
    buttons: ["Cancel", "OK"],
    defaultId: 1,
    cancelId: 0,
    message,
  });
  win.focus();
  return response === 1;
});
