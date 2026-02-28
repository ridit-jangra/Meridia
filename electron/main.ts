import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./ipc/storage-ipc";
import "./ipc/shell-ipc";
import "./ipc/explorer-ipc";
import "./ipc/workspace-ipc";
import "./ipc/watcher-ipc";
import "./ipc/terminal-ipc";
import "./ipc/files-ipc";
import { event_emitter } from "./shared/emitter";

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

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
    const is_win = process.platform === "win32";
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
    const next = current + 0.1;
    win.webContents.setZoomFactor(next);
    update_titlebar_height();
  });

  ipcMain.handle("workbench.zoomout", () => {
    if (!win) return;

    const current = win.webContents.getZoomFactor();
    const next = Math.max(0.5, current - 0.1);
    win.webContents.setZoomFactor(next);
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
    const _inset = is_win ? 170 : 95;
    return _inset;
  }

  ipcMain.on("titlebar-ready", (e) => {
    if (!win) return;
    const inset = get_titlebar_control_height();
    e.sender.send("titlebar-insets", inset);
    update_titlebar_height();
  });

  win.setMenuBarVisibility(false);

  win.maximize();

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
