import dotenv from "dotenv";
import path from "path";
import { app, BrowserWindow } from "electron";
import { HttpServer } from "../../server/node/http.js";
import { Theme } from "../common/theme.js";
import "../node/files.js";
import "../node/filesCreate.js";
import "../node/format.js";
import "../node/init.js";
import "../node/pty.js";
import "../node/storage.js";
import "../node/utils.js";
import "../node/watcher.js";

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

const _theme = new Theme(true);

function createWindow() {
  const _win = process.platform === "win32";
  workbench = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    backgroundColor: _theme.getNodeColor("workbench.background"),
    titleBarOverlay: {
      color: _theme.getNodeColor("workbench.titlebar.background") ?? "#ffffff",
      symbolColor:
        _theme.getNodeColor("workbench.titlebar.foreground") ?? "#000000",
      height: _win ? 40 : 50,
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
    const _inset = _win ? 160 : 95;
    return _inset;
  }

  workbench.webContents.on("did-finish-load", () => {
    const insets = getTitlebarControlInsets();
    workbench.webContents.send("titlebar-insets", insets);
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
