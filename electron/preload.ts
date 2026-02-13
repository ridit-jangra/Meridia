import { ipcRenderer, contextBridge } from "electron";
import { IFolderStructure, INode } from "../shared/explorer.types";

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
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
      "workbench.storage.get.child.structure",
      node,
    ) as Promise<INode[]>,
});
