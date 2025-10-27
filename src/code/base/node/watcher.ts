import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import { mainWindow } from "../../../main";
import fs from "fs";

let fileWatcher: FSWatcher | null = null;
let watchRootPath = "";
let isWatching = false;
const eventQueue = new Map<string, NodeJS.Timeout>();

const DEBOUNCE_DELAYS: Record<string, number> = {
  change: 500,
  unlink: 300,
  unlinkDir: 300,
  add: 200,
  addDir: 200,
  default: 150,
};
const throttledPaths = new Map<string, number>();

function debounceEvent(key: string, callback: () => void, delay = 150) {
  if (eventQueue.has(key)) clearTimeout(eventQueue.get(key)!);
  const timeoutId = setTimeout(() => {
    callback();
    eventQueue.delete(key);
  }, delay);
  eventQueue.set(key, timeoutId);
}

function safeIpcSend(channel: string, data: any) {
  if (mainWindow?.webContents && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send(channel, data);
    } catch (_) {}
  }
}

function createSafeUri(basePath: string, targetPath: string) {
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

  debounceEvent(
    eventKey,
    async () => {
      const parentDir = path.dirname(normalized);
      const baseName = path.basename(normalized);

      if (eventType === "add" || eventType === "addDir") {
        let parentUri = watchRootPath;
        const relativeParent = path.relative(watchRootPath, parentDir);
        if (relativeParent && relativeParent !== ".") {
          parentUri = path.join(watchRootPath, relativeParent);
        }
        const safeParent = createSafeUri(watchRootPath, parentUri);
        if (!safeParent) return;
        safeIpcSend("files-node-added", {
          parentUri: safeParent,
          nodeName: baseName,
          nodeType: eventType === "add" ? "file" : "folder",
        });
      } else if (eventType === "unlink" || eventType === "unlinkDir") {
        const relativePath = path.relative(watchRootPath, normalized);
        const nodeUri = path.join(watchRootPath, relativePath);
        const safeUri = createSafeUri(watchRootPath, nodeUri);
        if (!safeUri) return;

        safeIpcSend("files-node-removed", { nodeUri: safeUri });
      } else if (eventType === "change") {
        const relativePath = path.relative(watchRootPath, normalized);
        const nodeUri = path.join(watchRootPath, relativePath);
        const safeUri = createSafeUri(watchRootPath, nodeUri);
        if (!safeUri) return;
        safeIpcSend("files-node-changed", { nodeUri: safeUri });
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

    fileWatcher.on("error", (error) => {
      safeIpcSend("files-watcher-error", { error, path: watchRootPath });
    });
    fileWatcher.on("ready", () => {
      isWatching = true;
      safeIpcSend("files-watcher-ready", { path: watchRootPath });
    });

    fileWatcher.on("add", (filePath) => handleEvent("add", filePath));
    fileWatcher.on("addDir", (filePath) => handleEvent("addDir", filePath));
    fileWatcher.on("unlink", (filePath) => handleEvent("unlink", filePath));
    fileWatcher.on("unlinkDir", (filePath) =>
      handleEvent("unlinkDir", filePath)
    );
    fileWatcher.on("change", (filePath) => handleEvent("change", filePath));
  } catch (error) {
    safeIpcSend("files-watcher-error", {
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
  isWatching = false;
  watchRootPath = "";
  safeIpcSend("files-watcher-stopped", {});
}

export function getWatcherStatus() {
  return {
    isWatching,
    watchRootPath,
    hasActiveWatcher: fileWatcher !== null,
    pendingEventCount: eventQueue.size,
  };
}

export function _restart() {
  const current = watchRootPath;
  _stop();
  if (current) setTimeout(() => _watch(current), 100);
}
