import dotenv from "dotenv";
import path from "path";
import { app, BrowserWindow } from "electron";
import { HttpServer } from "./server.js";
import { Theme } from "./code/workbench/common/workbench.theme.js";
import "./code/base/common/base.file.create.js";
import "./code/base/node/files.node.js";
import "./code/base/node/format.node.js";
import "./code/base/node/mira.node.js";
import "./code/base/node/init.node.js";
import "./code/base/node/pty.node.js";
import "./code/editor/editor.main.js";

dotenv.config();

let httpServer: HttpServer;
let PORT: number = 0;

if (process.env.NODE_ENV === "development") {
  const electronReload = require("electron-reload");
  electronReload(__dirname, {});
  httpServer = new HttpServer(5281);
  PORT = httpServer._port;
  httpServer._serve();
}

export const PRELOAD_PATH = path.join(
  __dirname,
  "code",
  "base",
  "base.preload.js"
);

export const MAIN_HTML_PATH =
  process.env.NODE_ENV === "development"
    ? `http://localhost:${PORT}/code/workbench/common/workbench.renderer/code.html`
    : path.join(
        __dirname,
        "code",
        "workbench",
        "common",
        "workbench.renderer",
        "code.html"
      );

export let mainWindow: BrowserWindow;

const _theme = new Theme(true);

function createWindow() {
  const _win = process.platform === "win32";
  mainWindow = new BrowserWindow({
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
    mainWindow.loadURL(MAIN_HTML_PATH);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(MAIN_HTML_PATH);
  }

  function getTitlebarControlInsets() {
    const _inset = _win ? 160 : 100;
    return _inset;
  }

  mainWindow.webContents.on("did-finish-load", () => {
    const insets = getTitlebarControlInsets();
    mainWindow.webContents.send("titlebar-insets", insets);
  });

  mainWindow.on("minimize", () => mainWindow.webContents.send("reset-sizes"));
  mainWindow.on("maximize", () => mainWindow.webContents.send("reset-sizes"));
  mainWindow.on("resize", () => mainWindow.webContents.send("reset-sizes"));

  mainWindow.maximize();
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
