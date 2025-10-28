import fs from "fs";
import path from "path";
import os from "os";
import url from "url";
import { spawn, SpawnOptions, SpawnOptionsWithoutStdio } from "child_process";
import { PythonShell } from "python-shell";
import { contextBridge, ipcRenderer, shell } from "electron";
import {
  createServerProcess,
  forward,
  IConnection,
} from "vscode-ws-jsonrpc/server";
import { createWebSocketConnection } from "vscode-ws-jsonrpc/server";
import { WebSocketServer, ServerOptions } from "ws";
import { Storage } from "./services/storage.js";
import { FetchCompletionItemParams } from "../platform/mira/suggestions/types/internal.js";
import { _xtermManager } from "../workbench/common/devPanel/spawnXterm.js";
import { IWebSocket } from "@codingame/monaco-jsonrpc";

const storage = Storage;

function readDirRecursive(dirPath: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const list = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(readDirRecursive(fullPath));
    } else if (dirent.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

export const storageBridge = {
  store: (_name: string, _value: any) => {
    storage.store(_name, _value);
  },
  update: (_name: string, _value: any) => {
    storage.update(_name, _value);
  },
  get: (_name: string) => {
    const _val = storage.get(_name);
    return _val;
  },
  remove: (_name: string) => {
    storage.remove(_name);
  },
};

const activeWatchers = new Map<string, fs.FSWatcher>();

export const fsBridge = {
  readFile: (_path: string, encoding?: fs.EncodingOption) => {
    if (!fs.existsSync(_path)) {
      return "";
    }
    return fs.readFileSync(_path, { encoding: encoding as any }).toString();
  },
  readFileBuffer: (_path: string, encoding?: fs.EncodingOption) => {
    if (!fs.existsSync(_path)) {
      return "";
    }
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
    callback: (curr: fs.Stats, prev: fs.Stats) => void
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

export const pathBridge = {
  __dirname: __dirname,
  dirname: (_path: string) => {
    return path.dirname(_path);
  },
  basename: (_path: string) => {
    return path.basename(_path);
  },
  resolve: (_path: string[]) => {
    return path.resolve(..._path);
  },
  join: (_paths: string[]) => {
    return path.join(..._paths);
  },
  sep: path.sep,
  isAbsolute: (_path: string) => {
    return path.isAbsolute(_path);
  },
  normalize: (_path: string) => {
    return path.normalize(_path);
  },
  extname: (_path: string) => {
    return path.extname(_path);
  },
  walkdir: async (_path: string) => {
    return ipcRenderer.invoke("workbench.workspace.walkdir", _path);
  },
};

export const filesBridge = {
  openFolder: () => {
    ipcRenderer.invoke("workbench.workspace.folder.open");
  },
  openChildFolder: (_path: string) => {
    return ipcRenderer.invoke("workbench.workspace.folder.get.child", _path);
  },
};

export const ipcBridge = {
  send: (channel: string, ...args: any) => ipcRenderer.send(channel, ...args),

  invoke: async (channel: string, ...args: any) => {
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (e) {
      return false;
    }
  },

  on: (channel: string, func: Function) =>
    ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),

  once: (channel: string, func: Function) =>
    ipcRenderer.once(channel, (event, ...args) => func(event, ...args)),

  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),

  removeListener: (channel: string, listener: any) =>
    ipcRenderer.removeListener(channel, listener),
};

export const miraBridge = {
  requestCompletion: (params: FetchCompletionItemParams) => {
    return ipcRenderer.invoke("mira-completion-request", params);
  },
};

export const pythonBridge = {
  executeScript: (
    scriptPath: string,
    args: string[] = []
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const options = {
        ...PythonShell.defaultOptions,
        args: args,
      };

      const logs: string[] = [];
      const pyshell = new PythonShell(scriptPath, options);

      pyshell.on("message", (message) => {
        logs.push(message);
      });

      pyshell.on("error", (err) => {
        reject(err);
      });

      pyshell.end((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(logs);
        }
      });
    });
  },

  createStreamingShell: (scriptPath: string, args: string[] = []) => {
    const options = {
      mode: "text" as const,
      pythonOptions: ["-u"],
      args: args,
    };

    const pyshell = new PythonShell(scriptPath, options);

    return {
      shell: pyshell,
      onMessage: (callback: (message: string) => void) => {
        pyshell.on("message", callback);
      },
      onError: (callback: (error: Error) => void) => {
        pyshell.on("error", callback);
      },
      onClose: (callback: () => void) => {
        pyshell.on("close", callback);
      },
      terminate: () => {
        pyshell.terminate();
      },
      kill: () => {
        pyshell.kill();
      },
      send: (message: string) => {
        pyshell.send(message);
      },
    };
  },
};

export const childprocessBridge = {};

export const spawnBridge = {
  spawn: (
    command: string,
    args: string[] = [],
    options: SpawnOptionsWithoutStdio = {}
  ) => {
    return spawn(command, args, options);
  },
};

export const editorBridge = {
  getFsSuggestions: (currentPath: string) => {
    try {
      const resolvedPath = path.resolve(currentPath || ".");
      const items = fs.readdirSync(resolvedPath, { withFileTypes: true });

      return items.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(resolvedPath, item.name),
      }));
    } catch (error) {
      console.error("Error reading directory:", error);
      return [];
    }
  },
};

export const nodeBridge = {
  createWebSocketConnection: (_socket: IWebSocket) => {
    return createWebSocketConnection(_socket);
  },
  createWebSocketServer: (options?: ServerOptions) => {
    return new WebSocketServer(options);
  },
  createServerProcess: (
    _name: string,
    _command: string,
    _args: string[],
    _options: SpawnOptions
  ) => {
    return createServerProcess(_name, _command, _args, _options);
  },
  forward: (_client: IConnection, _server: IConnection) => {
    return forward(_client, _server);
  },
  createLanguageServer: (
    _port: number,
    _nodeCliPath: string,
    _websocketOptions: ServerOptions,
    _args: string[],
    _type: "node" | "cli",
    _cliPath?: string
  ) => {
    let _process: IConnection | undefined;
    const _websocket = new WebSocketServer(_websocketOptions);
    _websocket.on("connection", (webSocket) => {
      const socket = {
        send: (content: any) => webSocket.send(content),
        onMessage: (cb: any) => webSocket.on("message", cb),
        onError: (cb: any) => webSocket.on("error", cb),
        onClose: (cb: any) => webSocket.on("close", cb),
        dispose: () => webSocket.close(),
      };

      const connection = createWebSocketConnection(socket);

      _process = createServerProcess(
        "Language Server",
        _type === "node" ? process.execPath : _cliPath!,
        [_nodeCliPath, ..._args],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
          },
        }
      );

      forward(connection, _process!);

      webSocket.on("close", () => {});
    });

    return _process;
  },
  platform: os.platform(),
};

export const urlBridge = {
  pathToFileURL: (_path: string) => {
    const _url = url.pathToFileURL(_path);
    return _url.href;
  },
};

export const electronBridge = {
  shell: {
    ...shell,
  },
};

window.addEventListener("beforeunload", () => {
  activeWatchers.forEach((watcher, path) => {
    try {
      fs.unwatchFile(path);
      watcher.close();
    } catch (error) {}
  });
  activeWatchers.clear();
});

ipcRenderer.on("titlebar-insets", (_, insets) => {
  document.documentElement.style.setProperty(
    "--titlebar-window-controls-inset",
    `${insets}px`
  );
});

contextBridge.exposeInMainWorld("storage", storageBridge);
contextBridge.exposeInMainWorld("fs", fsBridge);
contextBridge.exposeInMainWorld("path", pathBridge);
contextBridge.exposeInMainWorld("files", filesBridge);
contextBridge.exposeInMainWorld("ipc", ipcBridge);
contextBridge.exposeInMainWorld("mira", miraBridge);
contextBridge.exposeInMainWorld("python", pythonBridge);
contextBridge.exposeInMainWorld("childprocess", childprocessBridge);
contextBridge.exposeInMainWorld("spawn", spawnBridge);
contextBridge.exposeInMainWorld("editor", editorBridge);
contextBridge.exposeInMainWorld("node", nodeBridge);
contextBridge.exposeInMainWorld("url", urlBridge);
contextBridge.exposeInMainWorld("electron", electronBridge);
