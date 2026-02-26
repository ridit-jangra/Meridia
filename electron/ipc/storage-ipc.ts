import { ipcMain } from "electron";
import { storage } from "../main-services/storage-service";
import { STORAGE_GET, STORAGE_SET } from "../../shared/ipc/channels";

ipcMain.handle(STORAGE_GET, (_, key: string, fallback?: any) => {
  return storage.get(key, fallback);
});

ipcMain.handle(STORAGE_SET, (_, key: string, value: any) => {
  storage.set(key, value);
  return true;
});
