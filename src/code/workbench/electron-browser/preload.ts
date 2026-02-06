import { contextBridge, ipcRenderer } from "electron";
import xlsx from "xlsx";
import { storageBridge } from "./bridges/storage.js";
import { fsBridge } from "./bridges/fs.js";
import { pathBridge } from "./bridges/path.js";
import { filesBridge } from "./bridges/files.js";
import { ipcBridge } from "./bridges/ipc.js";
import { miraBridge } from "./bridges/mira.js";
import { pythonBridge } from "./bridges/python.js";
import { childprocessBridge } from "./bridges/childprocess.js";
import { spawnBridge } from "./bridges/spawn.js";
import { editorBridge } from "./bridges/editor.js";
import { nodeBridge } from "./bridges/node.js";
import { urlBridge } from "./bridges/url.js";
import { electronBridge } from "./bridges/electron.js";
import { pypiBridge } from "./bridges/pypi.js";
import { workbenchBridge } from "./bridges/workbench.js";
import { jupyterBridge } from "./bridges/jupyter.js";
import { gitBridge } from "./bridges/git.js";
import { cleanupWatchers } from "./utils/cleanup.js";

export {
  storageBridge,
  fsBridge,
  pathBridge,
  filesBridge,
  ipcBridge,
  miraBridge,
  pythonBridge,
  childprocessBridge,
  spawnBridge,
  editorBridge,
  nodeBridge,
  urlBridge,
  electronBridge,
  pypiBridge,
  workbenchBridge,
  jupyterBridge,
  gitBridge,
};

window.addEventListener("beforeunload", cleanupWatchers);

ipcRenderer.on("titlebar-insets", (_, insets) => {
  const el = document.querySelector(".right-panel-section") as HTMLDivElement;
  if (el) {
    el.style.marginRight = `${insets}px`;
  }
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
contextBridge.exposeInMainWorld("pypi", pypiBridge);
contextBridge.exposeInMainWorld("workbench", workbenchBridge);
contextBridge.exposeInMainWorld("jupyter", jupyterBridge);
contextBridge.exposeInMainWorld("xlsx", xlsx);
contextBridge.exposeInMainWorld("git", gitBridge);
