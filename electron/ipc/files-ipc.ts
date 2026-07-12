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
  FS_READ_BASE_64,
  FS_REAL_PATH,
  FS_SEARCH_FILES,
} from "../../shared/ipc/channels";
import path from "node:path";

const SEARCH_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".cache",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  "coverage",
]);

function file_score(name: string, rel: string, q: string): number {
  const n = name.toLowerCase();
  const r = rel.toLowerCase();
  if (n === q) return 120;
  if (n.startsWith(q)) return 100;
  if (n.includes(q)) return 60;
  if (r.includes(q)) return 40;
  // subsequence fuzzy on basename
  let i = 0;
  for (const ch of q) {
    i = n.indexOf(ch, i);
    if (i === -1) return 0;
    i++;
  }
  return 15;
}

interface FileHit {
  path: string;
  name: string;
  dir: string;
}

// The workspace file list is walked once and cached, so each keystroke just
// filters in memory instead of re-walking the tree (which caused UI stutter).
let file_list_cache: { root: string; files: FileHit[]; ts: number } | null =
  null;
const FILE_CACHE_TTL = 15000;

async function build_file_list(root: string): Promise<FileHit[]> {
  const files: FileHit[] = [];
  const stack: string[] = [root];
  let scanned = 0;
  const MAX_FILES = 60000;
  const MAX_SCAN = 200000;

  while (stack.length && files.length < MAX_FILES && scanned < MAX_SCAN) {
    const dir = stack.pop()!;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      scanned++;
      if (e.isDirectory()) {
        if (SEARCH_IGNORE_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        stack.push(path.join(dir, e.name));
      } else if (e.isFile()) {
        const full = path.join(dir, e.name);
        files.push({
          path: full,
          name: e.name,
          dir: path.relative(root, dir),
        });
      }
    }
  }
  return files;
}

ipcMain.handle(
  FS_SEARCH_FILES,
  async (_, root: string, query: string, limit = 50): Promise<FileHit[]> => {
    const q = query.trim().toLowerCase();
    if (!root || !q) return [];

    if (
      !file_list_cache ||
      file_list_cache.root !== root ||
      Date.now() - file_list_cache.ts > FILE_CACHE_TTL
    ) {
      file_list_cache = {
        root,
        files: await build_file_list(root),
        ts: Date.now(),
      };
    }

    const scored: { f: FileHit; score: number }[] = [];
    for (const f of file_list_cache.files) {
      const rel = f.dir ? `${f.dir}/${f.name}` : f.name;
      const score = file_score(f.name, rel, q);
      if (score > 0) scored.push({ f, score });
    }
    scored.sort(
      (a, b) => b.score - a.score || a.f.path.length - b.f.path.length,
    );
    return scored.slice(0, limit).map((x) => x.f);
  },
);

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

ipcMain.handle(FS_REAL_PATH, async (_, p: string) => {
  try {
    return await fs.realpath(p);
  } catch {
    return p;
  }
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

ipcMain.handle(FS_READ_BASE_64, async (_, p: string) => {
  const buf = await fs.readFile(p);
  return buf.toString("base64");
});
