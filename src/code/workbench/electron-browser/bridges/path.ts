import path from "path";
import { ipcRenderer } from "electron";

export const pathBridge = {
  __dirname: __dirname,
  dirname: (_path: string) => {
    return path.dirname(_path);
  },
  basename: (_path: string) => {
    return path.basename(_path);
  },
  relative: (_path: string, _path2: string) => {
    return path.relative(_path, _path2);
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
  walkdir: async (_path: string, depth: number = 1) => {
    return ipcRenderer.invoke("workbench.workspace.walkdir", _path, depth);
  },
};
