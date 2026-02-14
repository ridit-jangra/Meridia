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

type explorer_api = {
  get_root_structure(folder_path: string): Promise<{
    root: IRootNode;
    path: string;
    structure: { root: IRootNode; path: string; structure: INode[] }[];
  }>;
  get_child_structure(node: {
    id: string;
    type: "file" | "folder";
    name: string;
    path: string;
    child_nodes: { root: IRootNode; path: string; structure: INode[] }[];
  }): Promise<{
    id: string;
    type: "file" | "folder";
    name: string;
    path: string;
    child_nodes: { root: IRootNode; path: string; structure: INode[] }[];
  }>;
};

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  storage: storage_api;
  explorer: explorer_api;
}
