/// <reference types="vite-plugin-electron/electron-env" />

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
};

type files_api = {
  exists(p: string): Promise<boolean>;
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
  readFileText(p: string): Promise<string>;
  writeFileText(p: string, content: string): Promise<boolean>;
};

declare global {
  interface Window {
    storage: storage_api;
    explorer: explorer_api;
    workspace: workspace_api;
    files: files_api;
  }
}

export {};
