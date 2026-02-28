// electron/main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { LspBridge } from "./server/lsp.server";
import "./ipc/storage-ipc";
import "./ipc/shell-ipc";
import "./ipc/explorer-ipc";
import "./ipc/workspace-ipc";
import "./ipc/watcher-ipc";
import "./ipc/terminal-ipc";
import "./ipc/files-ipc";
import { event_emitter } from "./shared/emitter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");

process.env.APP_ROOT = appRoot;

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(appRoot, "dist-electron");
export const RENDERER_DIST = path.join(appRoot, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(appRoot, "public")
  : RENDERER_DIST;

export const lspBridge = new LspBridge();

const tslsCli = path.join(
  appRoot,
  "node_modules",
  "typescript-language-server",
  "lib",
  "cli.mjs",
);

lspBridge.register({
  languageId: "typescript",
  command: process.execPath,
  args: [tslsCli, "--stdio"],
});

lspBridge.register({
  languageId: "javascript",
  command: process.execPath,
  args: [tslsCli, "--stdio"],
});

lspBridge.register({
  languageId: "python",
  command: "pylsp",
  args: [],
});

lspBridge.register({
  languageId: "rust",
  command: "rust-analyzer",
  args: [],
});

lspBridge.start();

let win: BrowserWindow | null = null;

function createWindow() {
  const is_win = process.platform === "win32";

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    backgroundColor: "#0a0a0a",
    titleBarOverlay: {
      color: "#0a0a0a",
      symbolColor: "#E4E4E4A8",
      height: is_win ? 27 : 37,
    },
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  function update_titlebar_height() {
    if (!win) return;

    const zoom_factor = win.webContents.getZoomFactor();
    const base = 27;

    const clamped = Math.min(Math.max(zoom_factor, 0.75), 2.0);
    const new_height = Math.round(base * 1.4 * clamped);

    win.setTitleBarOverlay({
      color: "#0a0a0a",
      symbolColor: "#E4E4E4A8",
      height: new_height,
    });

    const base_inset = is_win ? 170 : 115;
    const new_inset = Math.round(base_inset / (clamped * 1.3));

    win.webContents.send("titlebar-insets", new_inset);
  }

  ipcMain.handle("workbench.zoom", () => {
    if (!win) return;
    const current = win.webContents.getZoomFactor();
    win.webContents.setZoomFactor(current + 0.1);
    update_titlebar_height();
  });

  ipcMain.handle("workbench.zoomout", () => {
    if (!win) return;
    const current = win.webContents.getZoomFactor();
    win.webContents.setZoomFactor(Math.max(0.5, current - 0.1));
    update_titlebar_height();
  });

  event_emitter.on("window.reload", () => {
    if (!win) return;
    win.webContents.reload();
  });

  event_emitter.on(
    "window.webContents.send",
    (channel: string, ...args: any[]) => {
      if (!win) return;
      win.webContents.send(channel, ...args);
    },
  );

  function get_titlebar_control_height() {
    return is_win ? 170 : 95;
  }

  ipcMain.on("titlebar-ready", (e) => {
    if (!win) return;
    e.sender.send("titlebar-insets", get_titlebar_control_height());
    update_titlebar_height();
  });

  win.setMenuBarVisibility(false);
  win.maximize();

  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}

app.on("window-all-closed", () => {
  lspBridge.stop();
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);
