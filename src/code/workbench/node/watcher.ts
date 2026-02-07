import chokidar, { FSWatcher } from "chokidar";
import { workbench } from "../electron-browser/window";
import path from "path";
import fs from "fs";
import ignore, { Ignore } from "ignore";

let fileWatcher: FSWatcher | null = null;
let gitWatcher: FSWatcher | null = null;
let venvWatcher: FSWatcher | null = null;
let activeVenvName: string | null = null;
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

let gitUpdateTimeout: NodeJS.Timeout | null = null;
let venvUpdateTimeout: NodeJS.Timeout | null = null;
let gitignoreInstance: Ignore | null = null;

function _debounce(key: string, callback: () => void, delay = 150) {
  if (eventQueue.has(key)) {
    console.log(`[Debounce] Clearing existing timeout for: ${key}`);
    clearTimeout(eventQueue.get(key)!);
  }
  console.log(`[Debounce] Setting timeout (${delay}ms) for: ${key}`);
  const timeoutId = setTimeout(() => {
    console.log(`[Debounce] Executing callback for: ${key}`);
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

function loadGitignore(rootPath: string) {
  const gitignorePath = path.join(rootPath, ".gitignore");

  try {
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
      gitignoreInstance = ignore().add(gitignoreContent);
      const lineCount = gitignoreContent
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#")).length;
      console.log(
        `[GitIgnore] Loaded .gitignore with ${lineCount} patterns from: ${gitignorePath}`,
      );
    } else {
      gitignoreInstance = ignore();
      console.log(`[GitIgnore] No .gitignore found at: ${gitignorePath}`);
    }
  } catch (error) {
    console.error("[GitIgnore] Failed to load .gitignore:", error);
    gitignoreInstance = ignore();
  }
}

function isIgnoredByGitignore(filePath: string): boolean {
  if (!gitignoreInstance || !watchRootPath) return false;

  try {
    const relativePath = path.relative(watchRootPath, filePath);
    if (!relativePath || relativePath.startsWith("..")) return false;

    const normalizedPath = relativePath.replace(/\\/g, "/");

    const isIgnored = gitignoreInstance.ignores(normalizedPath);
    if (isIgnored) {
      console.log(`[GitIgnore] File ignored by .gitignore: ${normalizedPath}`);
    }
    return isIgnored;
  } catch (error) {
    console.error("[GitIgnore] Error checking gitignore:", error);
    return false;
  }
}

function handleGitUpdate() {
  if (gitUpdateTimeout) {
    console.log("[Git] Clearing existing git update timeout");
    clearTimeout(gitUpdateTimeout);
  }

  console.log("[Git] Scheduling git-folder-update event (1000ms debounce)");
  gitUpdateTimeout = setTimeout(() => {
    console.log("[Git] Sending git-folder-update event");
    workbench.webContents.send("git-folder-update");
    gitUpdateTimeout = null;
  }, 1000);
}

function handleVenvUpdate(venvFolderName: string) {
  if (venvUpdateTimeout) {
    console.log("[Venv] Clearing existing venv update timeout");
    clearTimeout(venvUpdateTimeout);
  }

  console.log("[Venv] Scheduling virtual-env-update event (1000ms debounce)");
  venvUpdateTimeout = setTimeout(() => {
    console.log(
      `[Venv] Sending virtual-env-update event for: ${venvFolderName}`,
    );
    workbench.webContents.send("virtual-env-update", venvFolderName);
    venvUpdateTimeout = null;
  }, 1000);
}

function detectVenvFolder(rootPath: string): string | null {
  const commonVenvNames = [
    ".venv",
    "venv",
    "env",
    ".env",
    "virtualenv",
    ".virtualenv",
  ];

  for (const venvName of commonVenvNames) {
    const venvPath = path.join(rootPath, venvName);
    if (fs.existsSync(venvPath)) {
      // Check if it's a valid venv by looking for characteristic files
      const isWindows = process.platform === "win32";
      const pythonPath = isWindows
        ? path.join(venvPath, "Scripts", "python.exe")
        : path.join(venvPath, "bin", "python");

      if (fs.existsSync(pythonPath)) {
        console.log(`[Venv] Detected virtual environment: ${venvName}`);
        return venvName;
      }
    }
  }

  console.log("[Venv] No virtual environment folder found");
  return null;
}

function checkForRename(filePath: string, isAdd: boolean): boolean {
  const baseName = path.basename(filePath);
  const parentDir = path.dirname(filePath);

  if (isAdd) {
    console.log(`[Rename] Checking if add is a rename: ${filePath}`);
    for (const [oldPath, data] of recentlyUnlinked.entries()) {
      const oldParent = path.dirname(oldPath);
      const oldName = data.name;

      if (oldParent === parentDir || oldName === baseName) {
        console.log(
          `[Rename] Detected rename from: ${oldPath} to: ${filePath}`,
        );
        clearTimeout(data.timeout);
        recentlyUnlinked.delete(oldPath);

        const safeOldUri = _uri(watchRootPath, oldPath);
        const safeNewUri = _uri(watchRootPath, filePath);

        if (safeOldUri && safeNewUri) {
          console.log(`[Event] Sending files-node-renamed event`);
          workbench.webContents.send("files-node-renamed", {
            oldUri: safeOldUri,
            newUri: safeNewUri,
            newName: baseName,
          });
        }
        return true;
      }
    }
    console.log(`[Rename] No matching unlink found, treating as new file`);
  }

  if (!isAdd) {
    console.log(
      `[Rename] Registering unlink for potential rename: ${filePath}`,
    );
    const timeout = setTimeout(() => {
      console.log(`[Rename] Timeout expired for: ${filePath} (not a rename)`);
      recentlyUnlinked.delete(filePath);
    }, RENAME_DETECTION_WINDOW);

    recentlyUnlinked.set(filePath, { name: baseName, timeout });
  }

  return false;
}

function handleEvent(eventType: string, filePath: string) {
  const normalized = path.normalize(filePath);
  console.log(`[FileWatcher] Event: ${eventType} | Path: ${normalized}`);

  if (normalized.includes(`${path.sep}node_modules${path.sep}`)) {
    const now = Date.now();
    const lastEventTime = throttledPaths.get(normalized) || 0;
    if (now - lastEventTime < 2000) {
      console.log(
        `[Throttle] Ignoring node_modules event (too frequent): ${normalized}`,
      );
      return;
    }
    console.log(`[Throttle] Allowing node_modules event: ${normalized}`);
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
        if (isIgnoredByGitignore(normalized)) {
          console.log(
            `[Handler] File/folder ignored, triggering git update: ${normalized}`,
          );
          handleGitUpdate();
          return;
        }

        const isRename = checkForRename(normalized, true);
        if (isRename) {
          console.log(`[Handler] Handled as rename, skipping add event`);
          return;
        }

        let parentUri = watchRootPath;
        const relativeParent = path.relative(watchRootPath, parentDir);
        if (relativeParent && relativeParent !== ".") {
          parentUri = path.join(watchRootPath, relativeParent);
        }
        const safeParent = _uri(watchRootPath, parentUri);
        if (!safeParent) {
          console.log(`[Handler] Invalid parent URI, skipping: ${parentUri}`);
          return;
        }
        console.log(
          `[Event] Sending files-node-added event | Type: ${eventType === "add" ? "file" : "folder"} | Name: ${baseName}`,
        );
        workbench.webContents.send("files-node-added", {
          parentUri: safeParent,
          nodeName: baseName,
          nodeType: eventType === "add" ? "file" : "folder",
        });

        console.log(
          `[Handler] File added, triggering git update: ${normalized}`,
        );
        handleGitUpdate();
      } else if (eventType === "unlink" || eventType === "unlinkDir") {
        if (isIgnoredByGitignore(normalized)) {
          console.log(
            `[Handler] File/folder ignored, triggering git update: ${normalized}`,
          );
          handleGitUpdate();
          return;
        }

        checkForRename(normalized, false);

        setTimeout(() => {
          if (!recentlyUnlinked.has(normalized)) {
            const relativePath = path.relative(watchRootPath, normalized);
            const nodeUri = path.join(watchRootPath, relativePath);
            const safeUri = _uri(watchRootPath, nodeUri);
            if (!safeUri) {
              console.log(
                `[Handler] Invalid URI for removal, skipping: ${nodeUri}`,
              );
              return;
            }

            console.log(
              `[Event] Sending files-node-removed event | Path: ${safeUri}`,
            );
            workbench.webContents.send("files-node-removed", {
              nodeUri: safeUri,
            });

            console.log(
              `[Handler] File removed, triggering git update: ${normalized}`,
            );
            handleGitUpdate();
          } else {
            console.log(
              `[Handler] Skipping removal (pending rename): ${normalized}`,
            );
          }
        }, RENAME_DETECTION_WINDOW);
      } else if (eventType === "change") {
        const relativePath = path.relative(watchRootPath, normalized);
        const nodeUri = path.join(watchRootPath, relativePath);
        const safeUri = _uri(watchRootPath, nodeUri);
        if (!safeUri) {
          console.log(`[Handler] Invalid URI for change, skipping: ${nodeUri}`);
          return;
        }
        console.log(
          `[Event] Sending files-node-changed event | Path: ${safeUri}`,
        );
        workbench.webContents.send("files-node-changed", { nodeUri: safeUri });

        console.log(
          `[Handler] File changed, triggering git update: ${normalized}`,
        );
        handleGitUpdate();
      }
    },
    delay,
  );
}

function _watchGitFolder(rootPath: string) {
  const gitPath = path.join(rootPath, ".git");

  if (!fs.existsSync(gitPath)) {
    console.log(`[Git] No .git folder found at: ${gitPath}`);
    return;
  }

  try {
    console.log(`[Git] Starting to watch .git folder: ${gitPath}`);
    gitWatcher = chokidar.watch(gitPath, {
      ignored: [/\.lock$/],
      ignoreInitial: true,
      persistent: true,
      depth: 99,
      ignorePermissionErrors: true,
      usePolling: false,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    });

    gitWatcher.on("all", (event, filePath) => {
      console.log(`[Git] .git folder event: ${event} | Path: ${filePath}`);
      handleGitUpdate();
    });

    gitWatcher.on("error", (error) => {
      console.error("[Git] Git watcher error:", error);
    });

    gitWatcher.on("ready", () => {
      console.log("[Git] Git watcher ready");
    });
  } catch (error) {
    console.error("[Git] Failed to watch .git folder:", error);
  }
}

function _watchVenvFolder(rootPath: string) {
  const venvFolderName = detectVenvFolder(rootPath);

  if (!venvFolderName) {
    console.log("[Venv] No virtual environment folder to watch");
    return;
  }

  const venvPath = path.join(rootPath, venvFolderName);
  activeVenvName = venvFolderName;

  // Only watch specific critical paths, not the entire deep structure
  const pathsToWatch = [
    path.join(venvPath, "pyvenv.cfg"), // Configuration file
    path.join(venvPath, "Scripts"), // Windows activation scripts
    path.join(venvPath, "bin"), // Unix activation scripts
  ];

  // Filter to only existing paths
  const existingPaths = pathsToWatch.filter((p) => fs.existsSync(p));

  if (existingPaths.length === 0) {
    console.log("[Venv] No critical venv paths found to watch");
    return;
  }

  try {
    console.log(
      `[Venv] Starting to watch venv critical paths: ${existingPaths.join(", ")}`,
    );
    venvWatcher = chokidar.watch(existingPaths, {
      ignored: [
        /(^|[\/\\])__pycache__($|[\/\\])/, // Match __pycache__ folder anywhere
        /\.pyc$/, // Match .pyc files
        /\.py$/, // Match .py files
        /\.pyo$/, // Match .pyo files
        /\.egg-info($|[\/\\])/, // Match .egg-info folders
        /\.dist-info($|[\/\\])/, // Match .dist-info folders
        (filePath: string) => {
          // Additional check for any paths we want to skip
          const lower = filePath.toLowerCase();
          return (
            lower.includes("__pycache__") ||
            lower.endsWith(".pyc") ||
            lower.endsWith(".py") ||
            lower.endsWith(".pyo") ||
            lower.includes(".egg-info") ||
            lower.includes(".dist-info")
          );
        },
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 2, // Only 2 levels deep to avoid going into site-packages
      ignorePermissionErrors: true,
      usePolling: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    venvWatcher.on("all", (event, filePath) => {
      console.log(
        `[Venv] Virtual environment event: ${event} | Path: ${filePath}`,
      );
      handleVenvUpdate(venvFolderName);
    });

    venvWatcher.on("error", (error) => {
      console.error("[Venv] Venv watcher error:", error);
    });

    venvWatcher.on("ready", () => {
      console.log("[Venv] Venv watcher ready");
      // Trigger initial event when venv is detected
      console.log(
        `[Venv] Sending initial virtual-env-update event for: ${venvFolderName}`,
      );
      workbench.webContents.send("virtual-env-update", venvFolderName);
    });
  } catch (error) {
    console.error("[Venv] Failed to watch venv folder:", error);
  }
}

function _watchGitignoreFile(rootPath: string) {
  const gitignorePath = path.join(rootPath, ".gitignore");

  if (fs.existsSync(gitignorePath)) {
    console.log(
      `[GitIgnore] Starting to watch .gitignore file: ${gitignorePath}`,
    );
    const gitignoreWatcher = chokidar.watch(gitignorePath, {
      ignoreInitial: true,
      persistent: true,
    });

    gitignoreWatcher.on("change", () => {
      console.log("[GitIgnore] .gitignore file changed, reloading patterns");
      loadGitignore(rootPath);
      handleGitUpdate();
    });

    gitignoreWatcher.on("unlink", () => {
      console.log("[GitIgnore] .gitignore file deleted");
      gitignoreInstance = ignore();
      handleGitUpdate();
    });

    gitignoreWatcher.on("ready", () => {
      console.log("[GitIgnore] .gitignore watcher ready");
    });
  } else {
    console.log(`[GitIgnore] No .gitignore file to watch at: ${gitignorePath}`);
  }
}

export function _watch(rootPath: string) {
  console.log(`[Watcher] Starting watch for: ${rootPath}`);
  _stop();

  try {
    if (!rootPath || typeof rootPath !== "string") {
      throw new Error("Invalid root path provided");
    }
    watchRootPath = path.normalize(rootPath);
    if (!fs.existsSync(watchRootPath)) {
      throw new Error(`Watch path does not exist: ${watchRootPath}`);
    }

    console.log(`[Watcher] Normalized watch path: ${watchRootPath}`);

    loadGitignore(watchRootPath);

    console.log("[Watcher] Initializing file watcher");
    fileWatcher = chokidar.watch(rootPath, {
      ignored: [
        /\.DS_Store/,
        /Thumbs\.db/,
        /\/\.vscode\//,
        /\/\.idea\//,
        /\/\.git\//,
        /\.(tmp|temp|log)$/i,
        /\/proc\//,
        /\/\.wine\//,
        (filePath: string) => {
          const lowerPath = path.normalize(filePath).toLowerCase();
          return (
            lowerPath.includes("/proc/") ||
            lowerPath.includes("/.wine/dosdevices/") ||
            lowerPath.includes("/.git/") ||
            lowerPath.includes("\\.git\\") ||
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
      console.error("[Watcher] File watcher error:", error);
    });

    fileWatcher.on("ready", () => {
      isWatching = true;
      console.log("[Watcher] File watcher ready and active");
    });

    fileWatcher.on("add", (filePath) => handleEvent("add", filePath));
    fileWatcher.on("addDir", (filePath) => handleEvent("addDir", filePath));
    fileWatcher.on("unlink", (filePath) => handleEvent("unlink", filePath));
    fileWatcher.on("unlinkDir", (filePath) =>
      handleEvent("unlinkDir", filePath),
    );
    fileWatcher.on("change", (filePath) => handleEvent("change", filePath));

    _watchGitFolder(rootPath);

    _watchVenvFolder(rootPath);

    _watchGitignoreFile(rootPath);

    console.log("[Watcher] All watchers initialized successfully");
  } catch (error) {
    console.error("[Watcher] Failed to initialize watchers:", error);
    workbench.webContents.send("files-watcher-error", {
      error: error instanceof Error ? error.message : String(error),
      path: rootPath,
    });
  }
}

export function _stop() {
  console.log("[Watcher] Stopping all watchers");

  if (fileWatcher) {
    console.log("[Watcher] Closing file watcher");
    fileWatcher.close().catch(() => {});
  }
  if (gitWatcher) {
    console.log("[Git] Closing git watcher");
    gitWatcher.close().catch(() => {});
  }
  if (venvWatcher) {
    console.log("[Venv] Closing venv watcher");
    venvWatcher.close().catch(() => {});
  }

  if (gitUpdateTimeout) {
    console.log("[Git] Clearing pending git update timeout");
    clearTimeout(gitUpdateTimeout);
    gitUpdateTimeout = null;
  }

  if (venvUpdateTimeout) {
    console.log("[Venv] Clearing pending venv update timeout");
    clearTimeout(venvUpdateTimeout);
    venvUpdateTimeout = null;
  }

  console.log(`[Watcher] Clearing ${eventQueue.size} pending events`);
  eventQueue.forEach((id) => clearTimeout(id));
  eventQueue.clear();

  console.log(`[Watcher] Clearing ${throttledPaths.size} throttled paths`);
  throttledPaths.clear();

  console.log(
    `[Rename] Clearing ${recentlyUnlinked.size} pending rename detections`,
  );
  recentlyUnlinked.forEach((data) => clearTimeout(data.timeout));
  recentlyUnlinked.clear();

  gitignoreInstance = null;
  activeVenvName = null;
  isWatching = false;
  watchRootPath = "";

  console.log("[Watcher] All watchers stopped and cleaned up");
}

export function getWatcherStatus() {
  const status = {
    isWatching,
    watchRootPath,
    hasActiveWatcher: fileWatcher !== null,
    hasGitWatcher: gitWatcher !== null,
    hasVenvWatcher: venvWatcher !== null,
    activeVenvName,
    pendingEventCount: eventQueue.size,
    pendingRenames: recentlyUnlinked.size,
    hasGitignore: gitignoreInstance !== null,
  };

  console.log("[Watcher] Status:", status);
  return status;
}

export function _restart() {
  const current = watchRootPath;
  console.log(`[Watcher] Restarting watcher for: ${current}`);
  _stop();
  if (current) setTimeout(() => _watch(current), 100);
}
