import chokidar, { FSWatcher } from "chokidar";
import { workbench } from "../electron-browser/window";
import path from "path";
import fs from "fs";

let fileWatcher: FSWatcher | null = null;
let watchRootPath = "";
let isWatching = false;
const eventQueue = new Map<string, NodeJS.Timeout>();

const recentlyUnlinked = new Map<
  string,
  { name: string; timeout: NodeJS.Timeout }
>();
const RENAME_DETECTION_WINDOW = 500;

const DEBOUNCE_DELAYS: Record<string, number> = {
  change: 500,
  unlink: 300,
  unlinkDir: 300,
  add: 200,
  addDir: 200,
  default: 150,
};
const throttledPaths = new Map<string, number>();

function _debounce(key: string, callback: () => void, delay = 150) {
  if (eventQueue.has(key)) clearTimeout(eventQueue.get(key)!);
  const timeoutId = setTimeout(() => {
    callback();
    eventQueue.delete(key);
  }, delay);
  eventQueue.set(key, timeoutId);
}

function _uri(basePath: string, targetPath: string) {
  try {
    if (!basePath || !targetPath) return null;
    const normalizedBase = path.normalize(basePath);
    const normalizedTarget = path.normalize(targetPath);
    const relative = path.relative(normalizedBase, normalizedTarget);
    if (relative.startsWith("..")) return null;
    return normalizedTarget.replace(/\\/g, "/");
  } catch {
    return null;
  }
}

function checkForRename(filePath: string, isAdd: boolean): boolean {
  const baseName = path.basename(filePath);
  const parentDir = path.dirname(filePath);

  if (isAdd) {
    for (const [oldPath, data] of recentlyUnlinked.entries()) {
      const oldParent = path.dirname(oldPath);
      const oldName = data.name;

      if (oldParent === parentDir || oldName === baseName) {
        clearTimeout(data.timeout);
        recentlyUnlinked.delete(oldPath);

        const safeOldUri = _uri(watchRootPath, oldPath);
        const safeNewUri = _uri(watchRootPath, filePath);

        if (safeOldUri && safeNewUri) {
          workbench.webContents.send("files-node-renamed", {
            oldUri: safeOldUri,
            newUri: safeNewUri,
            newName: baseName,
          });
        }
        return true;
      }
    }
  }

  if (!isAdd) {
    const timeout = setTimeout(() => {
      recentlyUnlinked.delete(filePath);
    }, RENAME_DETECTION_WINDOW);

    recentlyUnlinked.set(filePath, { name: baseName, timeout });
  }

  return false;
}

function handleEvent(eventType: string, filePath: string) {
  const normalized = path.normalize(filePath);

  if (normalized.includes(`${path.sep}node_modules${path.sep}`)) {
    const now = Date.now();
    const lastEventTime = throttledPaths.get(normalized) || 0;
    if (now - lastEventTime < 2000) {
      return;
    }
    throttledPaths.set(normalized, now);
  }

  const eventKey = `${eventType}:${filePath}`;
  const delay = DEBOUNCE_DELAYS[eventType] ?? DEBOUNCE_DELAYS.default;

  _debounce(
    eventKey,
    async () => {
      const parentDir = path.dirname(normalized);
      const baseName = path.basename(normalized);

      if (eventType === "add" || eventType === "addDir") {
        const isRename = checkForRename(normalized, true);
        if (isRename) return;

        let parentUri = watchRootPath;
        const relativeParent = path.relative(watchRootPath, parentDir);
        if (relativeParent && relativeParent !== ".") {
          parentUri = path.join(watchRootPath, relativeParent);
        }
        const safeParent = _uri(watchRootPath, parentUri);
        if (!safeParent) return;
        workbench.webContents.send("files-node-added", {
          parentUri: safeParent,
          nodeName: baseName,
          nodeType: eventType === "add" ? "file" : "folder",
        });
      } else if (eventType === "unlink" || eventType === "unlinkDir") {
        checkForRename(normalized, false);

        setTimeout(() => {
          if (!recentlyUnlinked.has(normalized)) {
            const relativePath = path.relative(watchRootPath, normalized);
            const nodeUri = path.join(watchRootPath, relativePath);
            const safeUri = _uri(watchRootPath, nodeUri);
            if (!safeUri) return;

            workbench.webContents.send("files-node-removed", {
              nodeUri: safeUri,
            });
          }
        }, RENAME_DETECTION_WINDOW);
      } else if (eventType === "change") {
        const relativePath = path.relative(watchRootPath, normalized);
        const nodeUri = path.join(watchRootPath, relativePath);
        const safeUri = _uri(watchRootPath, nodeUri);
        if (!safeUri) return;
        workbench.webContents.send("files-node-changed", { nodeUri: safeUri });
      }
    },
    delay
  );
}

export function _watch(rootPath: string) {
  _stop();

  try {
    if (!rootPath || typeof rootPath !== "string") {
      throw new Error("Invalid root path provided");
    }
    watchRootPath = path.normalize(rootPath);
    if (!fs.existsSync(watchRootPath)) {
      throw new Error(`Watch path does not exist: ${watchRootPath}`);
    }

    fileWatcher = chokidar.watch(rootPath, {
      ignored: [
        /\.DS_Store/,
        /Thumbs\.db/,
        /\/\.vscode\//,
        /\/\.idea\//,
        /\.(tmp|temp|log)$/i,
        /\/proc\//,
        /\/\.wine\//,
        (filePath: string) => {
          const lowerPath = path.normalize(filePath).toLowerCase();
          return (
            lowerPath.includes("/proc/") ||
            lowerPath.includes("/.wine/dosdevices/") ||
            lowerPath.includes("thumbs.db") ||
            lowerPath.includes(".ds_store") ||
            lowerPath.endsWith(".tmp") ||
            lowerPath.endsWith(".temp") ||
            lowerPath.endsWith(".log") ||
            lowerPath.endsWith(".swp") ||
            lowerPath.endsWith("~")
          );
        },
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 99,
      ignorePermissionErrors: true,
      usePolling: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    fileWatcher.on("all", (event, filePath) => {});

    fileWatcher.on("error", (error) => {});
    fileWatcher.on("ready", () => {
      isWatching = true;
    });

    fileWatcher.on("add", (filePath) => handleEvent("add", filePath));
    fileWatcher.on("addDir", (filePath) => handleEvent("addDir", filePath));
    fileWatcher.on("unlink", (filePath) => handleEvent("unlink", filePath));
    fileWatcher.on("unlinkDir", (filePath) =>
      handleEvent("unlinkDir", filePath)
    );
    fileWatcher.on("change", (filePath) => handleEvent("change", filePath));
  } catch (error) {
    workbench.webContents.send("files-watcher-error", {
      error: error instanceof Error ? error.message : String(error),
      path: rootPath,
    });
  }
}

export function _stop() {
  if (fileWatcher) fileWatcher.close().catch(() => {});
  eventQueue.forEach((id) => clearTimeout(id));
  eventQueue.clear();
  throttledPaths.clear();

  recentlyUnlinked.forEach((data) => clearTimeout(data.timeout));
  recentlyUnlinked.clear();

  isWatching = false;
  watchRootPath = "";
}

export function getWatcherStatus() {
  return {
    isWatching,
    watchRootPath,
    hasActiveWatcher: fileWatcher !== null,
    pendingEventCount: eventQueue.size,
    pendingRenames: recentlyUnlinked.size,
  };
}

export function _restart() {
  const current = watchRootPath;
  _stop();
  if (current) setTimeout(() => _watch(current), 100);
}
