import { ipcMain, dialog } from "electron";
import fs from "node:fs/promises";
import type { Stats } from "node:fs";
import {
  FS_EXISTS,
  FS_SAVE_AS,
  FS_READDIR,
  FS_STAT,
  FS_READ_FILE_TEXT,
  FS_CREATE_DIR,
  FS_REMOVE,
  FS_WRITE_FILE_TEXT,
  FS_RENAME,
  FS_RELATIVE,
  FS_OPEN,
} from "../../shared/ipc/channels";
import path from "node:path";

ipcMain.handle(FS_EXISTS, async (_, p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle(FS_RELATIVE, async (_, f: string, t: string) => {
  return path.relative(f, t);
});

ipcMain.handle(FS_SAVE_AS, async (_, content: string, path: string) => {
  try {
    const result = await dialog.showSaveDialog({
      buttonLabel: "Save",
      defaultPath: path,
    });

    if (result.canceled || !result.filePath) {
      return { cancel: true, path: result.filePath };
    }

    await fs.rename(path, result.filePath);
    await fs.writeFile(result.filePath, content, "utf8");

    return { cancel: false, path: result.filePath };
  } catch {
    return { cancel: true, path: "" };
  }
});

ipcMain.handle(FS_OPEN, async () => {
  const result = await dialog.showOpenDialog({
    buttonLabel: "Open",
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { cancel: true, path: null };
  }

  return { cancel: false, path: result.filePaths[0] };
});

ipcMain.handle(FS_READDIR, async (_, p: string) => {
  const items = await fs.readdir(p, { withFileTypes: true });
  return items.map((d) => ({
    name: d.name,
    isFile: d.isFile(),
    isDirectory: d.isDirectory(),
    isSymbolicLink: d.isSymbolicLink(),
  }));
});

ipcMain.handle(FS_STAT, async (_, p: string) => {
  const s: Stats = await fs.stat(p);
  return {
    isFile: s.isFile(),
    isDirectory: s.isDirectory(),
    size: s.size,
    mtimeMs: s.mtimeMs,
    ctimeMs: s.ctimeMs,
  };
});

ipcMain.handle(FS_READ_FILE_TEXT, async (_, p: string) => {
  return fs.readFile(p, "utf8");
});

ipcMain.handle(FS_CREATE_DIR, async (_, p: string) => {
  return fs.mkdir(p, { recursive: true });
});

ipcMain.handle(FS_REMOVE, async (_, p: string) => {
  return fs.rm(p, { recursive: true });
});

ipcMain.handle(FS_WRITE_FILE_TEXT, async (_, p: string, content: string) => {
  await fs.writeFile(p, content, "utf8");
  return true;
});

ipcMain.handle(FS_RENAME, async (_, f: string, t: string) => {
  await fs.rename(f, t);
  return true;
});
