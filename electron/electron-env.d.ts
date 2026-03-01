/// <reference types="vite-plugin-electron/electron-env" />

import type { IpcRendererEvent } from "electron";

type IpcListener = (event: IpcRendererEvent, ...args: any[]) => void;

import type {
  IChildStructure,
  IFolderStructure,
  INode,
} from "../shared/types/explorer.types";
import type { IWorkspace } from "../shared/types/workspace.types";

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
  get_root_structure(folder_path: string): Promise<IFolderStructure>;
  get_child_structure(node: INode): Promise<IChildStructure>;
};

type workspace_api = {
  get_workspace(folder_path: string): Promise<IWorkspace>;
  set_workspace(folder_path: string): Promise<void>;
  update_workspace(
    folder_path: string,
    workspace: Partial<IWorkspace>,
  ): Promise<void>;
  get_current_workspace_path(): Promise<string | null>;
  set_current_workspace_path(folder_path: string): Promise<void>;
  ask_update_workspace(): Promise<void>;
  clear_current_workspace(): Promise<void>;
};

type shell_api = {
  open_external(url: string): void;
};

type files_api = {
  exists(p: string): Promise<boolean>;
  saveAs(c: string, p: string): Promise<{ cancel: boolean; path: string }>;
  readdir(p: string): Promise<
    {
      name: string;
      isFile: boolean;
      isDirectory: boolean;
      isSymbolicLink: boolean;
    }[]
  >;
  stat(p: string): Promise<{
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    mtimeMs: number;
    ctimeMs: number;
  }>;
  read_file_text(p: string): Promise<string>;
  write_file_text(p: string, content: string): Promise<boolean>;
  create_dir(p: string): Promise<boolean>;
  remove(p: string): Promise<boolean>;
  rename(f: string, t: string): Promise<boolean>;
};

type watcher_api = {
  stop(p: string): Promise<boolean>;
  start(p: string): Promise<boolean>;
};

type pty_api = {
  create(id: string): Promise<boolean>;
  write(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): Promise<boolean>;
  kill(id: string): Promise<boolean>;
  on_data(listener: IpcListener): () => void;
  on_exit(listener: IpcListener): () => void;
};

declare global {
  interface Window {
    storage: storage_api;
    explorer: explorer_api;
    workspace: workspace_api;
    files: files_api;
    watcher: watcher_api;
    pty: pty_api;
    shell: shell_api;
    ipc: {
      on(channel: string, listener: IpcListener): () => void;
      once(channel: string, listener: IpcListener): void;
      off(channel: string, listener: IpcListener): void;
      removeAllListeners(channel: string): void;
      send(channel: string, ...args: any[]): void;
      invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
    };
  }
}

export {};
