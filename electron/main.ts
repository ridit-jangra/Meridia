import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from "electron";
import { autoUpdater } from "electron-updater";
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
import { titlebar_menu } from "../src/code/workbench/browser/parts/titlebar/titlebar.menu";
import { ITitlebarMenuItem } from "../src/types/core.types";
import { shortcut_def } from "../src/types/shortcut.types";
import { normalize_chord } from "../src/code/workbench/common/shortcut/shortcut.parse";
import type { ContextMenuItem } from "../src/code/workbench/browser/parts/components/context-menu";

export function get_accelerator(
  shortcuts: shortcut_def[],
  command: string
): string | undefined {
  const match = shortcuts.find((s) => s.command === command);
  if (!match) return undefined;
  const key = Array.isArray(match.keys) ? match.keys[0] : match.keys;
  return normalize_chord(key);
}

function convert_menu_items(
  items: ITitlebarMenuItem[],
  shortcuts: shortcut_def[],
  onCommand: (command: string) => void
): MenuItemConstructorOptions[] {
  return items.map((item): MenuItemConstructorOptions => {
    if (item.name === "separator") return { type: "separator" };

    if (item.submenu && item.submenu.length > 0) {
      return {
        id: item.id,
        label: item.name,
        submenu: convert_menu_items(item.submenu, shortcuts, onCommand),
      };
    }

    return {
      id: item.id,
      label: item.name,
      accelerator: item.command ? get_accelerator(shortcuts, item.command) : undefined,
      click: item.command ? () => onCommand(item.command!) : undefined,
    };
  });
}

export function build_electron_menu(
  items: ITitlebarMenuItem[],
  shortcuts: shortcut_def[],
  onCommand: (command: string) => void
): Menu {
  const template = convert_menu_items(items, shortcuts, onCommand);
  return Menu.buildFromTemplate(template);
}

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

function setup_auto_updater() {
  if (VITE_DEV_SERVER_URL) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    win?.webContents.send("updater:update-available", info.version);
  });

  autoUpdater.on("update-downloaded", () => {
    win?.webContents.send("updater:update-downloaded");
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto updater error:", err);
  });

  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
  setInterval(() => autoUpdater.checkForUpdates(), 2 * 60 * 60 * 1000);
}

ipcMain.on("updater:install-now", () => {
  autoUpdater.quitAndInstall();
});

function createWindow() {
  const is_win = process.platform === "win32";
  const is_mac = process.platform === "darwin"

  const inset = is_mac ? 75 : is_win ? 170 : 115

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
    if (!is_mac) {
      win.setTitleBarOverlay({      
        color: theme.get_color("workbench.background"),
        symbolColor: theme.get_color("workbench.foreground"),
        height: new_height,
      });
    }                                  
    const new_inset = Math.round(inset / (clamped * 1.3));
    win.webContents.send("titlebar-insets", new_inset, is_mac);  
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
    e.sender.send("titlebar-insets", inset, is_mac);
    update_titlebar_height();
  });

  ipcMain.handle("context-menu:show", (_e, items: ContextMenuItem[]) => {
    if (!win) return;
  
    const buildNativeItems = (items: ContextMenuItem[]): MenuItemConstructorOptions[] =>
      items.map((item) => {
        if (item.type === "separator") return { type: "separator" };
  
        if (item.type === "submenu") {
          return {
            label: item.label,
            enabled: !item.disabled,
            submenu: buildNativeItems(item.items),
          };
        }
  
        return {
          label: item.label,
          enabled: !item.disabled,
          click: () => {
            // Fire back to renderer so onClick handlers still work
            win?.webContents.send("context-menu:click", item.command_id);
          },
        };
      });
  
    const menu = Menu.buildFromTemplate(buildNativeItems(items));
    menu.popup({ window: win! });
  });

  ipcMain.on("build-menu", (_, shortcuts: shortcut_def[]) => {
    const menu = build_electron_menu(titlebar_menu, shortcuts, (command: string) => {
      if (!win) return
      win.webContents.send("run-command", command)
    })
  
    if (is_mac) {
      Menu.setApplicationMenu(menu);
    } else {
      if (!win) return
      win.setMenuBarVisibility(false);
      win.setMenu(menu);
    }
  })
  
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

app.whenReady().then(() => {
  createWindow();
  setup_auto_updater();
});
