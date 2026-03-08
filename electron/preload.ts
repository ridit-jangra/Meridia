import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type {
  IChildStructure,
  IFolderStructure,
  INode,
} from "../shared/types/explorer.types";
import type { IWorkspace } from "../shared/types/workspace.types";
import {
  STORAGE_GET,
  STORAGE_SET,
  WORKSPACE_GET,
  WORKSPACE_STORE,
  WORKSPACE_UPDATE,
  WORKSPACE_GET_CURRENT_PATH,
  WORKSPACE_SET_CURRENT_PATH,
  WORKSPACE_ASK_UPDATE,
  WORKSPACE_CLEAR_CURRENT,
  EXPLORER_GET_ROOT_STRUCTURE,
  EXPLORER_GET_CHILD_STRUCTURE,
  FS_EXISTS,
  FS_SAVE_AS,
  FS_READDIR,
  FS_STAT,
  FS_READ_FILE_TEXT,
  FS_CREATE_DIR,
  FS_REMOVE,
  FS_WRITE_FILE_TEXT,
  FS_RENAME,
  WATCHER_START,
  WATCHER_STOP,
  WATCHER_EVENT,
  NODE_PTY_CREATE,
  NODE_PTY_WRITE,
  NODE_PTY_RESIZE,
  NODE_PTY_KILL,
  NODE_PTY_DATA,
  NODE_PTY_EXIT,
  SHELL_OPEN_EXTERNAL,
  FS_RELATIVE,
  FS_OPEN,
} from "../shared/ipc/channels";

type Listener = (event: IpcRendererEvent, ...args: any[]) => void;

contextBridge.exposeInMainWorld("ipc", {
  on(channel: string, listener: Listener) {
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  once(channel: string, listener: Listener) {
    ipcRenderer.once(channel, listener);
  },
  off(channel: string, listener: Listener) {
    ipcRenderer.removeListener(channel, listener);
  },
  removeAllListeners(channel: string) {
    ipcRenderer.removeAllListeners(channel);
  },
  send(channel: string, ...args: any[]) {
    ipcRenderer.send(channel, ...args);
  },
  invoke<T = any>(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },
});

contextBridge.exposeInMainWorld("storage", {
  get: <T>(key: string, fallback?: T) =>
    ipcRenderer.invoke(STORAGE_GET, key, fallback) as Promise<T>,
  set: (key: string, value: any) =>
    ipcRenderer.invoke(STORAGE_SET, key, value) as Promise<boolean>,
});

contextBridge.exposeInMainWorld("explorer", {
  get_root_structure: (folder_path: string) =>
    ipcRenderer.invoke(
      EXPLORER_GET_ROOT_STRUCTURE,
      folder_path,
    ) as Promise<IFolderStructure>,
  get_child_structure: (node: INode) =>
    ipcRenderer.invoke(
      EXPLORER_GET_CHILD_STRUCTURE,
      node,
    ) as Promise<IChildStructure>,
});

contextBridge.exposeInMainWorld("workspace", {
  get_workspace: (folder_path: string) =>
    ipcRenderer.invoke(WORKSPACE_GET, folder_path) as Promise<IWorkspace>,
  set_workspace: (folder_path: string) =>
    ipcRenderer.invoke(WORKSPACE_STORE, folder_path) as Promise<void>,
  update_workspace: (folder_path: string, data: Partial<IWorkspace>) =>
    ipcRenderer.invoke(WORKSPACE_UPDATE, folder_path, data) as Promise<void>,
  get_current_workspace_path: () =>
    ipcRenderer.invoke(WORKSPACE_GET_CURRENT_PATH) as Promise<string | null>,
  set_current_workspace_path: (folder_path: string) =>
    ipcRenderer.invoke(
      WORKSPACE_SET_CURRENT_PATH,
      folder_path,
    ) as Promise<void>,
  ask_update_workspace: () =>
    ipcRenderer.invoke(WORKSPACE_ASK_UPDATE) as Promise<void>,
  clear_current_workspace: () =>
    ipcRenderer.invoke(WORKSPACE_CLEAR_CURRENT) as Promise<void>,
});

contextBridge.exposeInMainWorld("files", {
  exists: (p: string) => ipcRenderer.invoke(FS_EXISTS, p) as Promise<boolean>,
  saveAs: (c: string, p?: string) =>
    ipcRenderer.invoke(FS_SAVE_AS, c, p) as Promise<{
      cancel: boolean;
      path: string;
    }>,
  readdir: (p: string) =>
    ipcRenderer.invoke(FS_READDIR, p) as Promise<
      {
        name: string;
        isFile: boolean;
        isDirectory: boolean;
        isSymbolicLink: boolean;
      }[]
    >,
  create_dir: (p: string) =>
    ipcRenderer.invoke(FS_CREATE_DIR, p) as Promise<boolean>,
  remove: (p: string) => ipcRenderer.invoke(FS_REMOVE, p) as Promise<boolean>,
  stat: (p: string) =>
    ipcRenderer.invoke(FS_STAT, p) as Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtimeMs: number;
      ctimeMs: number;
    }>,
  read_file_text: (p: string) =>
    ipcRenderer.invoke(FS_READ_FILE_TEXT, p) as Promise<string>,
  write_file_text: (p: string, content: string) =>
    ipcRenderer.invoke(FS_WRITE_FILE_TEXT, p, content) as Promise<boolean>,
  rename: (from: string, to: string) =>
    ipcRenderer.invoke(FS_RENAME, from, to) as Promise<boolean>,
  relative: (from: string, to: string) =>
    ipcRenderer.invoke(FS_RELATIVE, from, to) as Promise<string>,
  open_file: () =>
    ipcRenderer.invoke(FS_OPEN) as Promise<{ cancel: boolean; path: string }>,
});

contextBridge.exposeInMainWorld("watcher", {
  start: (p: string) =>
    ipcRenderer.invoke(WATCHER_START, p) as Promise<boolean>,
  stop: (p: string) => ipcRenderer.invoke(WATCHER_STOP, p) as Promise<boolean>,
  on_event: (listener: Listener) => {
    ipcRenderer.on(WATCHER_EVENT, listener);
    return () => ipcRenderer.removeListener(WATCHER_EVENT, listener);
  },
});

contextBridge.exposeInMainWorld("shell", {
  open_external: (url: string) => ipcRenderer.invoke(SHELL_OPEN_EXTERNAL, url),
});

contextBridge.exposeInMainWorld("pty", {
  create: (id: string) =>
    ipcRenderer.invoke(NODE_PTY_CREATE, id) as Promise<boolean>,
  write: (id: string, data: string) =>
    ipcRenderer.send(NODE_PTY_WRITE, id, data),
  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke(NODE_PTY_RESIZE, id, cols, rows) as Promise<boolean>,
  kill: (id: string) =>
    ipcRenderer.invoke(NODE_PTY_KILL, id) as Promise<boolean>,
  on_data: (listener: Listener) => {
    ipcRenderer.on(NODE_PTY_DATA, listener);
    return () => ipcRenderer.removeListener(NODE_PTY_DATA, listener);
  },
  on_exit: (listener: Listener) => {
    ipcRenderer.on(NODE_PTY_EXIT, listener);
    return () => ipcRenderer.removeListener(NODE_PTY_EXIT, listener);
  },
});

contextBridge.exposeInMainWorld('platform', {
  get_platform: () => process.platform
});