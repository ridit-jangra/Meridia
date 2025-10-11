import { Theme } from "../code/workbench/common/workbench.theme.js";
import { Layout } from "../code/workbench/workbench.layout.js";
import {
  filesBridge,
  fsBridge,
  ipcBridge,
  miraBridge,
  pathBridge,
  pythonBridge,
  storageBridge,
  childprocessBridge,
  spawnBridge,
  editorBridge,
  extensionBridge,
  nodeBridge,
} from "../code/base/base.preload.js";

declare global {
  interface Window {
    storage: typeof storageBridge;
    fs: typeof fsBridge;
    ipc: typeof ipcBridge;
    path: typeof pathBridge;
    files: typeof filesBridge;
    mira: typeof miraBridge;
    python: typeof pythonBridge;
    childprocess: typeof childprocessBridge;
    spawn: typeof spawnBridge;
    editor: typeof editorBridge;
    node: typeof nodeBridge;
  }
}
