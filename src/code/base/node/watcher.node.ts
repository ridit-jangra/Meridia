import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import { mainWindow } from "../../../main";
import fs from "fs";

let fileWatcher: FSWatcher | null = null;
let watchRootPath: string = "";
let isWatching: boolean = false;

const eventQueue = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY = 150;

function getDebounceDelay(filePath: string, eventType: string): number {
  switch (eventType) {
    case "change":
      return 500;
    case "unlink":
    case "unlinkDir":
      return 300;
    case "add":
    case "addDir":
      return 200;
    default:
      return DEBOUNCE_DELAY;
  }
}

function debounceEvent(
  key: string,
  callback: () => void,
  delay: number = DEBOUNCE_DELAY
) {
  if (eventQueue.has(key)) {
    clearTimeout(eventQueue.get(key)!);
  }

  const timeoutId = setTimeout(() => {
    callback();
    eventQueue.delete(key);
  }, delay);

  eventQueue.set(key, timeoutId);
}

async function validatePath(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeIpcSend(channel: string, data: any) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send(channel, data);
    } else {
    }
  } catch (error) {}
}

function createSafeUri(basePath: string, targetPath: string): string | null {
  try {
    if (!basePath || !targetPath) {
      return null;
    }

    const normalizedBase = path.normalize(basePath);
    const normalizedTarget = path.normalize(targetPath);

    const relativePath = path.relative(normalizedBase, normalizedTarget);
    if (relativePath.startsWith("..")) {
      return null;
    }

    return normalizedTarget.replace(/\\/g, "/");
  } catch (error) {
    return null;
  }
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

        (filePath) => {
          const normalizedPath = path.normalize(filePath).toLowerCase();
          return (
            normalizedPath.includes("/proc/") ||
            normalizedPath.includes("/.wine/dosdevices/") ||
            normalizedPath.includes("thumbs.db") ||
            normalizedPath.includes(".ds_store") ||
            normalizedPath.endsWith(".tmp") ||
            normalizedPath.endsWith(".temp") ||
            normalizedPath.endsWith(".log") ||
            normalizedPath.endsWith(".swp") ||
            normalizedPath.endsWith("~")
          );
        },
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 99,
      ignorePermissionErrors: true,
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    fileWatcher.on("error", (error) => {
      safeIpcSend("files-watcher-error", {
        error: error,
        path: watchRootPath,
      });
    });

    fileWatcher.on("ready", () => {
      isWatching = true;

      safeIpcSend("files-watcher-ready", {
        path: watchRootPath,
      });
    });

    fileWatcher.on("add", async (filePath) => {
      const eventKey = `add:${filePath}`;

      const callback = async () => {
        try {
          const normalizedPath = path.normalize(filePath);

          if (!(await validatePath(normalizedPath))) {
            return;
          }

          const parentDir = path.dirname(normalizedPath);
          const fileName = path.basename(normalizedPath);

          const relativeParentPath = path.relative(watchRootPath, parentDir);
          let parentUri: string;

          if (relativeParentPath === "" || relativeParentPath === ".") {
            parentUri = watchRootPath;
          } else {
            parentUri = path.join(watchRootPath, relativeParentPath);
          }

          const safeParentUri = createSafeUri(watchRootPath, parentUri);
          if (!safeParentUri) {
            return;
          }

          safeIpcSend("files-node-added", {
            parentUri: safeParentUri,
            nodeName: fileName,
            nodeType: "file",
          });
        } catch (error) {}
      };

      debounceEvent(eventKey, callback, getDebounceDelay(filePath, "add"));
    });

    fileWatcher.on("addDir", async (dirPath) => {
      const eventKey = `addDir:${dirPath}`;

      const callback = async () => {
        try {
          const normalizedPath = path.normalize(dirPath);

          if (!(await validatePath(normalizedPath))) {
            return;
          }

          const parentDir = path.dirname(normalizedPath);
          const dirName = path.basename(normalizedPath);

          const relativeParentPath = path.relative(watchRootPath, parentDir);
          let parentUri: string;

          if (relativeParentPath === "" || relativeParentPath === ".") {
            parentUri = watchRootPath;
          } else {
            parentUri = path.join(watchRootPath, relativeParentPath);
          }

          const safeParentUri = createSafeUri(watchRootPath, parentUri);
          if (!safeParentUri) {
            return;
          }

          safeIpcSend("files-node-added", {
            parentUri: safeParentUri,
            nodeName: dirName,
            nodeType: "folder",
          });
        } catch (error) {}
      };

      debounceEvent(eventKey, callback, getDebounceDelay(dirPath, "addDir"));
    });

    fileWatcher.on("unlink", async (filePath) => {
      const eventKey = `unlink:${filePath}`;

      const callback = () => {
        try {
          const normalizedPath = path.normalize(filePath);
          const relativePath = path.relative(watchRootPath, normalizedPath);
          const nodeUri = path.join(watchRootPath, relativePath);

          const safeNodeUri = createSafeUri(watchRootPath, nodeUri);
          if (!safeNodeUri) {
            return;
          }

          safeIpcSend("files-node-removed", {
            nodeUri: safeNodeUri,
          });
        } catch (error) {}
      };

      debounceEvent(eventKey, callback, getDebounceDelay(filePath, "unlink"));
    });

    fileWatcher.on("unlinkDir", async (dirPath) => {
      const eventKey = `unlinkDir:${dirPath}`;

      const callback = () => {
        try {
          const normalizedPath = path.normalize(dirPath);
          const relativePath = path.relative(watchRootPath, normalizedPath);
          const nodeUri = path.join(watchRootPath, relativePath);

          const safeNodeUri = createSafeUri(watchRootPath, nodeUri);
          if (!safeNodeUri) {
            return;
          }

          safeIpcSend("files-node-removed", {
            nodeUri: safeNodeUri,
          });
        } catch (error) {}
      };

      debounceEvent(eventKey, callback, getDebounceDelay(dirPath, "unlinkDir"));
    });

    fileWatcher.on("change", async (filePath) => {
      const eventKey = `change:${filePath}`;

      const callback = async () => {
        try {
          const normalizedPath = path.normalize(filePath);

          if (!(await validatePath(normalizedPath))) {
            return;
          }

          const relativePath = path.relative(watchRootPath, normalizedPath);
          const nodeUri = path.join(watchRootPath, relativePath);

          const safeNodeUri = createSafeUri(watchRootPath, nodeUri);
          if (!safeNodeUri) {
            return;
          }

          safeIpcSend("files-node-changed", {
            nodeUri: safeNodeUri,
          });
        } catch (error) {}
      };

      debounceEvent(eventKey, callback, getDebounceDelay(filePath, "change"));
    });
  } catch (error) {
    safeIpcSend("files-watcher-error", {
      error: error instanceof Error ? error.message : String(error),
      path: rootPath,
    });
  }
}

export function _stop() {
  try {
    if (fileWatcher) {
      fileWatcher.close();
      fileWatcher = null;
    }

    for (const [key, timeoutId] of eventQueue.entries()) {
      clearTimeout(timeoutId);
      eventQueue.delete(key);
    }

    isWatching = false;
    watchRootPath = "";

    safeIpcSend("files-watcher-stopped", {});
  } catch (error) {}
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
  const currentPath = watchRootPath;
  _stop();
  if (currentPath) {
    setTimeout(() => {
      _watch(currentPath);
    }, 100);
  }
}
