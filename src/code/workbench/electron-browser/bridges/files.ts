import { ipcRenderer } from "electron";

export const filesBridge = {
  openFolder: () => {
    ipcRenderer.invoke("workbench.workspace.folder.open");
  },
  changeFolder: (path: string) => {
    ipcRenderer.invoke("workbench.workspace.folder.change", path);
  },
  getFolderPath: () => {
    return ipcRenderer.invoke("workbench.workspace.get.folder.path");
  },
  openChildFolder: (_path: string) => {
    return ipcRenderer.invoke("workbench.workspace.folder.get.child", _path);
  },
};
