import dotenv from "dotenv";
import path from "path";
import { app, BrowserWindow, ipcMain } from "electron";
import { HttpServer } from "../../server/node/http.js";
import { Theme } from "../common/theme.js";
import "../node/files.js";
import "../node/filesCreate.js";
import "../node/format.js";
import "../node/node.js";
import "../node/init.js";
import "../node/pty.js";
import "../node/project.js";
import "../node/storage.js";
import "../node/utils.js";
import "../node/python.js";
import "../node/watcher.js";
import "../browser/window/new-project/node/project-creator.js";
import "../../platform/messagebox/node/message.js";

dotenv.config();

export let httpServer: HttpServer;
let PORT: number = 0;

if (process.env.NODE_ENV === "development") {
  const electronReload = require("electron-reload");
  electronReload(path.join(__dirname, "..", "..", ".."), {});
  httpServer = new HttpServer(5281);
  PORT = httpServer._port;
  httpServer._serve();
}

export const PRELOAD_PATH = path.join(__dirname, "preload.js");

export const MAIN_HTML_PATH =
  process.env.NODE_ENV === "development"
    ? `http://localhost:${PORT}/code/workbench/common/renderer/code.html`
    : path.join(__dirname, "..", "common", "renderer", "code.html");

export let workbench: BrowserWindow;

ipcMain.handle("workbench.reload", () => {
  workbench.webContents.reload();
});

ipcMain.handle("workbench.zoom", () => {
  const current = workbench.webContents.getZoomFactor();
  const next = current + 0.1;
  workbench.webContents.setZoomFactor(next);
  updateTitleBarHeight();
});

ipcMain.handle("workbench.zoomout", () => {
  const current = workbench.webContents.getZoomFactor();
  const next = Math.max(0.5, current - 0.1);
  workbench.webContents.setZoomFactor(next);
  updateTitleBarHeight();
});

function updateTitleBarHeight() {
  const zoomFactor = workbench.webContents.getZoomFactor();
  const _win = process.platform === "win32";
  const base = 27;

  const clamped = Math.min(Math.max(zoomFactor, 0.75), 2.0);
  const newHeight = Math.round(base * 1.4 * clamped);

  workbench.setTitleBarOverlay({
    color: _theme.getNodeColor("workbench.titlebar.background"),
    symbolColor: _theme.getNodeColor("workbench.titlebar.foreground"),
    height: newHeight,
  });

  const baseInset = _win ? 170 : 115;
  const newInset = Math.round(baseInset / (clamped * 1.3));

  workbench.webContents.send("titlebar-insets", newInset);
}

const _theme = new Theme(true);

function createWindow() {
  const _win = process.platform === "win32";
  workbench = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    backgroundColor: _theme.getNodeColor("workbench.titlebar.background"),
    titleBarOverlay: {
      color: _theme.getNodeColor("workbench.titlebar.background"),
      symbolColor: _theme.getNodeColor("workbench.titlebar.foreground"),
      height: _win ? 27 : 37,
    },
    titleBarStyle: "hidden",
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    workbench.loadURL(MAIN_HTML_PATH);
    workbench.webContents.openDevTools();
  } else {
    workbench.loadFile(MAIN_HTML_PATH);
  }

  function getTitlebarControlInsets() {
    const _inset = _win ? 170 : 95;
    return _inset;
  }

  workbench.webContents.on("did-finish-load", () => {
    const insets = getTitlebarControlInsets();
    workbench.webContents.send("titlebar-insets", insets);
    updateTitleBarHeight();
  });

  workbench.on("minimize", () => workbench.webContents.send("reset-sizes"));
  workbench.on("maximize", () => workbench.webContents.send("reset-sizes"));
  workbench.on("resize", () => workbench.webContents.send("reset-sizes"));

  workbench.maximize();
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (window === null) {
    createWindow();
  }
});
