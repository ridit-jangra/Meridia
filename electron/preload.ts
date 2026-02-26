import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type {
  IChildStructure,
  IFolderStructure,
  INode,
} from "../shared/types/explorer.types";
import type { IWorkspace } from "../shared/types/workspace.types";

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
    ipcRenderer.invoke("workbench.storage.get", key, fallback) as Promise<T>,
  set: (key: string, value: any) =>
    ipcRenderer.invoke("workbench.storage.set", key, value) as Promise<boolean>,
});

contextBridge.exposeInMainWorld("explorer", {
  get_root_structure: (folder_path: string) =>
    ipcRenderer.invoke(
      "workbench.explorer.get.root.structure",
      folder_path,
    ) as Promise<IFolderStructure>,
  get_child_structure: (node: INode) =>
    ipcRenderer.invoke(
      "workbench.explorer.get.child.structure",
      node,
    ) as Promise<IChildStructure>,
});

contextBridge.exposeInMainWorld("workspace", {
  get_workspace: (folder_path: string) =>
    ipcRenderer.invoke(
      "workbench.workspace.get",
      folder_path,
    ) as Promise<IWorkspace>,
  set_workspace: (folder_path: string) =>
    ipcRenderer.invoke("workbench.workspace.set", folder_path) as Promise<void>,
  update_workspace: (folder_path: string, data: Partial<IWorkspace>) =>
    ipcRenderer.invoke(
      "workbench.workspace.update",
      folder_path,
      data,
    ) as Promise<void>,
  get_current_workspace_path: () =>
    ipcRenderer.invoke("workbench.workspace.get.current.path") as Promise<
      string | null
    >,
  set_current_workspace_path: (folder_path: string) =>
    ipcRenderer.invoke(
      "workbench.workspace.set.current.path",
      folder_path,
    ) as Promise<void>,
  ask_update_workspace: () =>
    ipcRenderer.invoke("workbench.workspace.ask.update") as Promise<void>,
});

contextBridge.exposeInMainWorld("files", {
  exists: (p: string) =>
    ipcRenderer.invoke("workbench.fs.exists", p) as Promise<boolean>,
  saveAs: (c: string, p?: string) =>
    ipcRenderer.invoke("workbench.fs.saveAs", c, p) as Promise<{
      cancel: boolean;
      path: string;
    }>,
  readdir: (p: string) =>
    ipcRenderer.invoke("workbench.fs.readdir", p) as Promise<
      {
        name: string;
        isFile: boolean;
        isDirectory: boolean;
        isSymbolicLink: boolean;
      }[]
    >,
  stat: (p: string) =>
    ipcRenderer.invoke("workbench.fs.stat", p) as Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtimeMs: number;
      ctimeMs: number;
    }>,
  readFileText: (p: string) =>
    ipcRenderer.invoke("workbench.fs.readFileText", p) as Promise<string>,
  writeFileText: (p: string, content: string) =>
    ipcRenderer.invoke(
      "workbench.fs.writeFileText",
      p,
      content,
    ) as Promise<boolean>,
});

contextBridge.exposeInMainWorld("watcher", {
  start: (p: string) =>
    ipcRenderer.invoke("workbench.watcher.start", p) as Promise<boolean>,
  stop: (p: string) =>
    ipcRenderer.invoke("workbench.watcher.stop", p) as Promise<boolean>,
});
