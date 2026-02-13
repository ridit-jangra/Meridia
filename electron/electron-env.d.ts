/// <reference types="vite-plugin-electron/electron-env" />

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

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  storage: storage_api;
}
