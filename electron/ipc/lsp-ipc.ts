import { ipcMain, BrowserWindow } from "electron";
import * as cp from "node:child_process";
import * as path from "node:path";
import { existsSync } from "node:fs";
import {
  LSP_CHECK,
  LSP_INSTALL,
  LSP_INSTALL_PROGRESS,
  LSP_INSTALL_DONE,
  LSP_INSTALL_ERROR,
} from "../../shared/ipc/channels";
import { resolve_python, resolve_pylsp } from "../lsp.resolver";

function get_all_windows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows();
}

function broadcast(channel: string, ...args: any[]) {
  for (const win of get_all_windows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

function find_npm(): string {
  if (process.platform === "win32") {
    const candidates = [
      path.join(path.dirname(process.execPath), "npm.cmd"),
      "npm.cmd",
    ];
    for (const c of candidates) if (existsSync(c)) return c;
    return "npm.cmd";
  }
  return "npm";
}

function find_pip(pythonPath: string): { cmd: string; args: string[] } {
  return { cmd: pythonPath, args: ["-m", "pip"] };
}

type LspId = "pylsp" | "typescript-language-server";

interface InstallRecipe {
  check(): boolean;
  install_cmd(): { cmd: string; args: string[] } | null;
  install_error_hint(): string;
}

function make_recipes(pythonPath: string | null): Record<LspId, InstallRecipe> {
  return {
    pylsp: {
      check() {
        if (!pythonPath) return false;
        return resolve_pylsp(pythonPath) !== null;
      },
      install_cmd() {
        if (!pythonPath) return null;
        const { cmd, args } = find_pip(pythonPath);
        return { cmd, args: [...args, "install", "python-lsp-server[all]"] };
      },
      install_error_hint() {
        return pythonPath
          ? `"${pythonPath}" -m pip install python-lsp-server[all]`
          : "Python not found — install Python 3.8+ first";
      },
    },

    "typescript-language-server": {
      check() {
        const bin =
          process.platform === "win32"
            ? "typescript-language-server.cmd"
            : "typescript-language-server";

        const which = cp.spawnSync(
          process.platform === "win32" ? "where" : "which",
          [bin],
          { encoding: "utf8", timeout: 3000 },
        );
        if (which.status === 0 && which.stdout.trim()) return true;

        const npm_root = cp.spawnSync(find_npm(), ["root", "-g"], {
          encoding: "utf8",
          timeout: 5000,
          shell: process.platform === "win32",
        });
        if (npm_root.status === 0) {
          const global_bin = path.join(npm_root.stdout.trim(), ".bin", bin);
          if (existsSync(global_bin)) return true;
        }

        return false;
      },
      install_cmd() {
        return {
          cmd: find_npm(),
          args: ["install", "-g", "typescript-language-server", "typescript"],
        };
      },
      install_error_hint() {
        return "npm install -g typescript-language-server typescript";
      },
    },
  };
}

const installing = new Set<LspId>();

ipcMain.handle(LSP_CHECK, async (_, lsp_id: LspId) => {
  const python = resolve_python();
  const recipes = make_recipes(python);
  const recipe = recipes[lsp_id];
  if (!recipe) return { installed: false, error: `Unknown LSP: ${lsp_id}` };

  try {
    return { installed: recipe.check() };
  } catch (e: any) {
    return { installed: false, error: e?.message };
  }
});

ipcMain.handle(LSP_INSTALL, async (_, lsp_id: LspId) => {
  if (installing.has(lsp_id)) {
    return { already_installing: true };
  }

  const python = resolve_python();
  const recipes = make_recipes(python);
  const recipe = recipes[lsp_id];

  if (!recipe) return { error: `Unknown LSP: ${lsp_id}` };

  const cmd_spec = recipe.install_cmd();
  if (!cmd_spec) {
    const hint = recipe.install_error_hint();
    broadcast(LSP_INSTALL_ERROR, lsp_id, `Cannot install: ${hint}`);
    return { error: hint };
  }

  installing.add(lsp_id);
  broadcast(
    LSP_INSTALL_PROGRESS,
    lsp_id,
    `Running: ${cmd_spec.cmd} ${cmd_spec.args.join(" ")}\n`,
  );

  return new Promise<{ ok: boolean }>((resolve) => {
    const proc = cp.spawn(cmd_spec.cmd, cmd_spec.args, {
      shell: process.platform === "win32",
      env: {
        ...process.env,

        PYTHONUNBUFFERED: "1",
      },
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      broadcast(LSP_INSTALL_PROGRESS, lsp_id, chunk.toString());
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      broadcast(LSP_INSTALL_PROGRESS, lsp_id, chunk.toString());
    });

    proc.on("close", (code) => {
      installing.delete(lsp_id);

      if (code === 0) {
        broadcast(LSP_INSTALL_DONE, lsp_id);
        resolve({ ok: true });
      } else {
        const hint = recipe.install_error_hint();
        broadcast(
          LSP_INSTALL_ERROR,
          lsp_id,
          `Install failed (exit ${code}). Try manually:\n  ${hint}`,
        );
        resolve({ ok: false });
      }
    });

    proc.on("error", (err) => {
      installing.delete(lsp_id);
      broadcast(
        LSP_INSTALL_ERROR,
        lsp_id,
        `Spawn error: ${err.message}\nTry manually:\n  ${recipe.install_error_hint()}`,
      );
      resolve({ ok: false });
    });
  });
});
