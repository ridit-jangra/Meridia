import {
  IFolderStructure,
  INode,
  TWatchEvent,
} from "../../shared/types/explorer.types";
import path from "path";
import fs from "fs/promises";
import chokidar, { FSWatcher } from "chokidar";

class explorer_services {
  private watchers: Map<string, FSWatcher> = new Map();
  private recentUnlinks: Map<
    string,
    { p: string; ts: number; isDir: boolean }
  > = new Map();

  public async get_root_structure(
    folder_path: string,
  ): Promise<IFolderStructure> {
    try {
      const entries = await fs.readdir(folder_path, {
        withFileTypes: true,
        recursive: false,
      });

      const structure: INode[] = [];

      for (const entry of entries) {
        const full_path = path.join(folder_path, entry.name);

        structure.push({
          id: full_path,
          type: entry.isDirectory() ? "folder" : "file",
          name: entry.name,
          path: full_path,
          child_nodes: [],
        });
      }

      return {
        root: { name: path.basename(folder_path) },
        path: folder_path,
        structure,
      };
    } catch {
      return {
        root: { name: path.basename(folder_path) },
        path: folder_path,
        structure: [],
      };
    }
  }

  public async get_child_structure(node: INode): Promise<INode[]> {
    if (node.type !== "folder") return [];

    try {
      const entries = await fs.readdir(node.path, {
        withFileTypes: true,
        recursive: false,
      });

      const child_nodes: INode[] = [];

      for (const entry of entries) {
        const full_path = path.join(node.path, entry.name);

        child_nodes.push({
          id: full_path,
          type: entry.isDirectory() ? "folder" : "file",
          name: entry.name,
          path: full_path,
          child_nodes: [],
        });
      }

      return child_nodes;
    } catch {
      return [];
    }
  }

  public start_watcher(
    watch_path: string,
    onChange: (e: TWatchEvent) => void,
    opts?: {
      recursive?: boolean;
      ignored?: (string | RegExp)[];
      rename_window_ms?: number;
    },
  ) {
    if (this.watchers.has(watch_path)) return;

    const recursive = opts?.recursive ?? true;
    const renameWindow = opts?.rename_window_ms ?? 250;

    const ignored = opts?.ignored ?? [];

    const watcher = chokidar.watch(watch_path, {
      ignoreInitial: true,
      persistent: true,
      ignored,
      depth: recursive ? undefined : 0,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 25,
      },
    });

    const now = () => Date.now();

    const trackUnlink = (p: string, isDir: boolean) => {
      const parent = path.dirname(p);
      this.recentUnlinks.set(p, { p: parent, ts: now(), isDir });
      onChange({ type: "remove", path: p, isDir });
    };

    const maybeRename = (to: string, isDir: boolean) => {
      const parent = path.dirname(to);
      const t = now();

      let best: { from: string; ts: number } | null = null;

      for (const [from, v] of this.recentUnlinks) {
        if (v.isDir !== isDir) continue;
        if (v.p !== parent) continue;
        const dt = t - v.ts;
        if (dt < 0 || dt > renameWindow) continue;
        if (!best || v.ts > best.ts) best = { from, ts: v.ts };
      }

      if (!best) {
        onChange({ type: "add", path: to, isDir });
        return;
      }

      this.recentUnlinks.delete(best.from);
      onChange({ type: "rename", from: best.from, to, isDir });
    };

    const gc = () => {
      const t = now();
      for (const [k, v] of this.recentUnlinks) {
        if (t - v.ts > renameWindow) this.recentUnlinks.delete(k);
      }
    };

    watcher
      .on("add", (p) => {
        gc();
        maybeRename(p, false);
      })
      .on("addDir", (p) => {
        gc();
        maybeRename(p, true);
      })
      .on("unlink", (p) => {
        gc();
        trackUnlink(p, false);
      })
      .on("unlinkDir", (p) => {
        gc();
        trackUnlink(p, true);
      })
      .on("change", (p) => {
        onChange({ type: "change", path: p, isDir: false });
      });

    this.watchers.set(watch_path, watcher);

    return watch_path;
  }

  public stop_watcher(watch_path: string) {
    const w = this.watchers.get(watch_path);
    if (!w) return;
    w.close();
    this.watchers.delete(watch_path);
  }

  public stop_all_watchers() {
    for (const [k, w] of this.watchers) {
      w.close();
      this.watchers.delete(k);
    }
  }
}

export const explorer = new explorer_services();
