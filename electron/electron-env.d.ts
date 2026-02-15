/// <reference types="vite-plugin-electron/electron-env" />

// import { IFolderStructure } from "../shared/explorer.types";

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string;
    VITE_PUBLIC: string;
  }
}

type storage_api = {
  get<T>(key: string, fallback?: T): Promise<T>;
  set(key: string, value: any): Promise<boolean>;
};

interface INode {
  id: string;
  type: "file" | "folder";
  name: string;
  path: string;
  child_nodes: INode[];
}

interface IRootNode {
  name: string;
}

interface IFolderStructure {
  root: IRootNode;
  path: string;
  structure: INode[];
}

interface IChildStructure {
  path: string;
  id: string;
  child_nodes: INode[];
}

type explorer_api = {
  get_root_structure(folder_path: string): Promise<IFolderStructure>;
  get_child_structure(node: INode): Promise<IChildStructure>;
};

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  storage: storage_api;
  explorer: explorer_api;
}
