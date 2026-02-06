import fs from "fs";
import path from "path";
import { readDirRecursive } from "../utils/fs-helpers.js";

const activeWatchers = new Map<string, fs.FSWatcher>();

export const fsBridge = {
  readFile: (_path: string, encoding?: fs.EncodingOption) => {
    return fs.readFileSync(_path, { encoding: encoding as any }).toString();
  },
  readFileBuffer: (_path: string, encoding?: fs.EncodingOption) => {
    return fs.readFileSync(_path, { encoding: encoding as any });
  },
  deleteFile: (_path: string) => {
    if (!fs.existsSync(_path)) {
      return "";
    }
    fs.rmSync(_path);
  },
  createFile: (_path: string, _content?: string) => {
    fs.writeFileSync(_path, _content || "");
  },
  createFolder: (_path: string) => {
    fs.mkdirSync(_path, { recursive: true });
  },
  deleteFolder: (_path: string) => {
    if (!fs.existsSync(_path)) {
      return "";
    }
    fs.rmSync(_path, { recursive: true, force: true });
  },
  rename: (_path: string, _new: string) => {
    if (!fs.existsSync(_path)) {
      return "";
    }
    fs.renameSync(_path, _new);
  },
  watchFile: (
    _path: string,
    options: any,
    callback: (curr: fs.Stats, prev: fs.Stats) => void,
  ) => {
    try {
      if (activeWatchers.has(_path)) {
        activeWatchers.get(_path)?.close();
        activeWatchers.delete(_path);
      }

      fs.watchFile(_path, options, callback);

      const watcher = fs.watch(_path, (eventType, filename) => {
        if (eventType === "change") {
          fs.stat(_path, (err, curr) => {
            if (!err) {
              const prev = curr;
              callback(curr, prev);
            }
          });
        }
      });

      activeWatchers.set(_path, watcher);

      return watcher;
    } catch (error) {
      throw error;
    }
  },

  unwatchFile: (_path: string) => {
    try {
      fs.unwatchFile(_path);

      if (activeWatchers.has(_path)) {
        activeWatchers.get(_path)?.close();
        activeWatchers.delete(_path);
      }
    } catch (error) {}
  },

  watch: (_path: string, options?: any) => {
    try {
      const watcher = fs.watch(_path, options, (eventType, filename) => {});

      activeWatchers.set(_path, watcher);
      return watcher;
    } catch (error) {
      throw error;
    }
  },

  unwatch: (_path: string) => {
    try {
      if (activeWatchers.has(_path)) {
        activeWatchers.get(_path)?.close();
        activeWatchers.delete(_path);
      }
    } catch (error) {}
  },

  exists: (_path: string): boolean => {
    try {
      return fs.existsSync(_path);
    } catch {
      return false;
    }
  },

  stat: (_path: string): fs.Stats | null => {
    try {
      return fs.statSync(_path);
    } catch {
      return null;
    }
  },

  readDir: (_path: string) => {
    return readDirRecursive(_path);
  },

  getExtension: (_path: string): string => {
    return _path.split(".").pop()?.toLowerCase() || "";
  },

  joinPath: (...paths: string[]): string => {
    return path.join(...paths);
  },

  dirname: (_path: string): string => {
    return path.dirname(_path);
  },

  basename: (_path: string): string => {
    return path.basename(_path);
  },

  isFolder: (_path: string) => {
    const _stat = fs.statSync(_path);
    if (_stat.isFile()) {
      return false;
    } else if (_stat.isDirectory()) {
      return true;
    }
  },
};

export { activeWatchers };
