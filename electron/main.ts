import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { server } from "./server/lsp.server";
import "./ipc/workspace-ipc";
import "./ipc/files-ipc";
import "./ipc/storage-ipc";
import "./ipc/shell-ipc";
import "./ipc/explorer-ipc";
import "./ipc/watcher-ipc";
import "./ipc/terminal-ipc";
import { event_emitter } from "./shared/emitter";
import { theme } from "../src/code/workbench/contrib/theme/theme.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");

process.env.APP_ROOT = appRoot;

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(appRoot, "dist-electron");
export const RENDERER_DIST = path.join(appRoot, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(appRoot, "public")
  : RENDERER_DIST;

export const lsp_server = new server();

lsp_server.register({
  languageId: "python",
  command: "",
  args: [],
});

lsp_server.start();

let win: BrowserWindow | null = null;

function createWindow() {
  const is_win = process.platform === "win32";

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    backgroundColor: theme.get_color("workbench.background"),
    titleBarOverlay: {
      color: theme.get_color("workbench.background"),
      symbolColor: theme.get_color("workbench.foreground"),
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
    const clamped = Math.min(Math.max(zoom_factor, 0.75), 2.0);
    const new_height = Math.round(27 * 1.4 * clamped);
    win.setTitleBarOverlay({
      color: theme.get_color("workbench.background"),
      symbolColor: theme.get_color("workbench.foreground"),
      height: new_height,
    });
    const new_inset = Math.round((is_win ? 170 : 115) / (clamped * 1.3));
    win.webContents.send("titlebar-insets", new_inset);
  }

  ipcMain.handle("workbench.zoom", () => {
    if (!win) return;
    win.webContents.setZoomFactor(win.webContents.getZoomFactor() + 0.1);
    update_titlebar_height();
  });

  ipcMain.handle("workbench.zoomout", () => {
    if (!win) return;
    win.webContents.setZoomFactor(
      Math.max(0.5, win.webContents.getZoomFactor() - 0.1),
    );
    update_titlebar_height();
  });

  event_emitter.on("window.reload", () => win?.webContents.reload());
  event_emitter.on(
    "window.webContents.send",
    (channel: string, ...args: any[]) => {
      win?.webContents.send(channel, ...args);
    },
  );

  ipcMain.on("titlebar-ready", (e) => {
    if (!win) return;
    e.sender.send("titlebar-insets", is_win ? 170 : 95);
    update_titlebar_height();
  });

  win.setMenuBarVisibility(false);
  win.maximize();

  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}

app.on("window-all-closed", () => {
  lsp_server.stop();
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);
