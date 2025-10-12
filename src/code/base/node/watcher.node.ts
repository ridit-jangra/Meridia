import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import { mainWindow } from "../../../main";
import fs from "fs";

let fileWatcher: FSWatcher | null = null;
let watchRootPath: string = "";
let isWatching: boolean = false;

const eventQueue = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY = 150;

const nodeModulesBatch = new Map<string, Set<string>>();
const NODE_MODULES_BATCH_DELAY = 3000;
const NODE_MODULES_BATCH_SIZE_THRESHOLD = 10;

function getDebounceDelay(filePath: string, eventType: string): number {
  const normalizedPath = path.normalize(filePath).toLowerCase();

  if (normalizedPath.includes("node_modules")) {
    switch (eventType) {
      case "unlink":
      case "unlinkDir":
        return 2000;
      case "add":
      case "addDir":
        return 1500;
      case "change":
        return 1000;
      default:
        return 1000;
    }
  }

  switch (eventType) {
    case "change":
      return 500;
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

function batchNodeModulesEvent(
  eventType: string,
  filePath: string,
  callback: () => void
): boolean {
  const normalizedPath = path.normalize(filePath).toLowerCase();

  if (normalizedPath.includes("node_modules")) {
    if (!nodeModulesBatch.has(eventType)) {
      nodeModulesBatch.set(eventType, new Set());
    }

    nodeModulesBatch.get(eventType)!.add(filePath);

    const batchKey = `batch:${eventType}:node_modules`;

    debounceEvent(
      batchKey,
      () => {
        const paths = nodeModulesBatch.get(eventType);
        if (paths && paths.size > 0) {
          console.log(
            `Processing batch of ${paths.size} ${eventType} events in node_modules`
          );

          if (paths.size > NODE_MODULES_BATCH_SIZE_THRESHOLD) {
            safeIpcSend("files-bulk-operation", {
              eventType,
              count: paths.size,
              location: "node_modules",
              sample: Array.from(paths).slice(0, 3),
              watchRootPath,
            });
          } else {
            let processedCount = 0;
            paths.forEach((batchedPath) => {
              if (processedCount < 5) {
                try {
                  const tempFilePath = batchedPath;
                  callback();
                  processedCount++;
                } catch (error) {
                  console.error(
                    `Error processing batched event for ${batchedPath}:`,
                    error
                  );
                }
              }
            });

            if (paths.size > 5) {
              safeIpcSend("files-bulk-operation", {
                eventType,
                count: paths.size - 5,
                location: "node_modules",
                message: `${paths.size - 5} additional ${eventType} events in node_modules (not shown)`,
                watchRootPath,
              });
            }
          }

          nodeModulesBatch.delete(eventType);
        }
      },
      NODE_MODULES_BATCH_DELAY
    );

    return true;
  }

  return false;
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
      console.warn(
        `Cannot send IPC message to ${channel}: mainWindow is not available`
      );
    }
  } catch (error) {
    console.error(`Error sending IPC message to ${channel}:`, error);
  }
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
      console.warn(
        `Path traversal detected: ${targetPath} is outside of ${basePath}`
      );
      return null;
    }

    return normalizedTarget.replace(/\\/g, "/");
  } catch (error) {
    console.error("Error creating safe URI:", error);
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

    console.log(`Starting file watcher for: ${watchRootPath}`);

    fileWatcher = chokidar.watch(rootPath, {
      ignored: [
        /\/node_modules/,
        /\.DS_Store/,
        /Thumbs\.db/,
        /\/\.wine/,
        /\/proc/,
        /\/\.vscode/,
        /\/\.idea/,
        /\.(tmp|temp|log)$/i,

        "**/node_modules/**/*",
        "**/node_modules",
        (filePath) => {
          const normalizedPath = path.normalize(filePath).toLowerCase();
          return (
            normalizedPath.includes("/proc") ||
            normalizedPath.includes(".wine/dosdevices") ||
            normalizedPath.includes("thumbs.db") ||
            normalizedPath.includes(".ds_store") ||
            normalizedPath.endsWith(".tmp") ||
            normalizedPath.endsWith(".temp") ||
            normalizedPath.endsWith(".log") ||
            (normalizedPath.includes("node_modules") &&
              normalizedPath.split("node_modules").length > 2)
          );
        },
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 99,
      ignorePermissionErrors: true,
      usePolling: false,

      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 200,
      },
    });

    fileWatcher.on("error", (error) => {
      console.error("File watcher error:", error);
      safeIpcSend("files-watcher-error", {
        error: error,
        path: watchRootPath,
      });
    });

    fileWatcher.on("ready", () => {
      isWatching = true;
      console.log(`File watcher ready for: ${watchRootPath}`);
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
            console.warn(`File no longer exists: ${normalizedPath}`);
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
            console.warn(`Invalid parent URI for file: ${filePath}`);
            return;
          }

          safeIpcSend("files-node-added", {
            parentUri: safeParentUri,
            nodeName: fileName,
            nodeType: "file",
          });
        } catch (error) {
          console.error(`Error processing add event for ${filePath}:`, error);
        }
      };

      if (!batchNodeModulesEvent("add", filePath, callback)) {
        debounceEvent(eventKey, callback, getDebounceDelay(filePath, "add"));
      }
    });

    fileWatcher.on("addDir", async (dirPath) => {
      const eventKey = `addDir:${dirPath}`;

      const callback = async () => {
        try {
          const normalizedPath = path.normalize(dirPath);

          if (!(await validatePath(normalizedPath))) {
            console.warn(`Directory no longer exists: ${normalizedPath}`);
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
            console.warn(`Invalid parent URI for directory: ${dirPath}`);
            return;
          }

          safeIpcSend("files-node-added", {
            parentUri: safeParentUri,
            nodeName: dirName,
            nodeType: "folder",
          });
        } catch (error) {
          console.error(`Error processing addDir event for ${dirPath}:`, error);
        }
      };

      if (!batchNodeModulesEvent("addDir", dirPath, callback)) {
        debounceEvent(eventKey, callback, getDebounceDelay(dirPath, "addDir"));
      }
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
            console.warn(`Invalid node URI for unlinked file: ${filePath}`);
            return;
          }

          safeIpcSend("files-node-removed", {
            nodeUri: safeNodeUri,
          });
        } catch (error) {
          console.error(
            `Error processing unlink event for ${filePath}:`,
            error
          );
        }
      };

      if (!batchNodeModulesEvent("unlink", filePath, callback)) {
        debounceEvent(eventKey, callback, getDebounceDelay(filePath, "unlink"));
      }
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
            console.warn(`Invalid node URI for unlinked directory: ${dirPath}`);
            return;
          }

          safeIpcSend("files-node-removed", {
            nodeUri: safeNodeUri,
          });
        } catch (error) {
          console.error(
            `Error processing unlinkDir event for ${dirPath}:`,
            error
          );
        }
      };

      if (!batchNodeModulesEvent("unlinkDir", dirPath, callback)) {
        debounceEvent(
          eventKey,
          callback,
          getDebounceDelay(dirPath, "unlinkDir")
        );
      }
    });

    fileWatcher.on("change", async (filePath) => {
      const eventKey = `change:${filePath}`;

      const callback = async () => {
        try {
          const normalizedPath = path.normalize(filePath);

          if (!(await validatePath(normalizedPath))) {
            console.warn(`Changed file no longer exists: ${normalizedPath}`);
            return;
          }

          const relativePath = path.relative(watchRootPath, normalizedPath);
          const nodeUri = path.join(watchRootPath, relativePath);

          const safeNodeUri = createSafeUri(watchRootPath, nodeUri);
          if (!safeNodeUri) {
            console.warn(`Invalid node URI for changed file: ${filePath}`);
            return;
          }

          safeIpcSend("files-node-changed", {
            nodeUri: safeNodeUri,
          });
        } catch (error) {
          console.error(
            `Error processing change event for ${filePath}:`,
            error
          );
        }
      };

      if (!batchNodeModulesEvent("change", filePath, callback)) {
        debounceEvent(eventKey, callback, getDebounceDelay(filePath, "change"));
      }
    });
  } catch (error) {
    console.error("Error setting up file watcher:", error);
    safeIpcSend("files-watcher-error", {
      error: error instanceof Error ? error.message : String(error),
      path: rootPath,
    });
  }
}

export function _stop() {
  try {
    if (fileWatcher) {
      console.log(`Stopping file watcher for: ${watchRootPath}`);
      fileWatcher.close();
      fileWatcher = null;
    }

    for (const [key, timeoutId] of eventQueue.entries()) {
      clearTimeout(timeoutId);
      eventQueue.delete(key);
    }

    nodeModulesBatch.clear();

    isWatching = false;
    watchRootPath = "";

    safeIpcSend("files-watcher-stopped", {});
  } catch (error) {
    console.error("Error stopping file watcher:", error);
  }
}

export function getWatcherStatus() {
  return {
    isWatching,
    watchRootPath,
    hasActiveWatcher: fileWatcher !== null,
    batchedEventCount: Array.from(nodeModulesBatch.values()).reduce(
      (sum, set) => sum + set.size,
      0
    ),
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

export function clearBatchedEvents() {
  nodeModulesBatch.clear();
  console.log("Cleared all batched node_modules events");
}
