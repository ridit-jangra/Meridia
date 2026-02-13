import { ipcMain } from "electron";
import { storage } from "../services/storage-service";

ipcMain.handle("workbench.storage.get", (_, key: string, fallback?: any) => {
  return storage.get(key, fallback);
});

ipcMain.handle("workbench.storage.set", (_, key: string, value: any) => {
  storage.set(key, value);
  return true;
});
