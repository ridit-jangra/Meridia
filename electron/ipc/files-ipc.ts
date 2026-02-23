import { ipcMain } from "electron";
import fs from "node:fs/promises";
import type { Stats } from "node:fs";

ipcMain.handle("workbench.fs.exists", async (_, p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("workbench.fs.readdir", async (_, p: string) => {
  const items = await fs.readdir(p, { withFileTypes: true });
  return items.map((d) => ({
    name: d.name,
    isFile: d.isFile(),
    isDirectory: d.isDirectory(),
    isSymbolicLink: d.isSymbolicLink(),
  }));
});

ipcMain.handle("workbench.fs.stat", async (_, p: string) => {
  const s: Stats = await fs.stat(p);
  return {
    isFile: s.isFile(),
    isDirectory: s.isDirectory(),
    size: s.size,
    mtimeMs: s.mtimeMs,
    ctimeMs: s.ctimeMs,
  };
});

ipcMain.handle("workbench.fs.readFileText", async (_, p: string) => {
  return fs.readFile(p, "utf8");
});

ipcMain.handle(
  "workbench.fs.writeFileText",
  async (_, p: string, content: string) => {
    await fs.writeFile(p, content, "utf8");
    return true;
  },
);
