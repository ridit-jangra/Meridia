import { ipcMain } from "electron";
import { spawn } from "child_process";
import { workbench } from "../../../workbench/electron-browser/window";

ipcMain.handle(
  "workbench.workspace.install",
  async (_, command: string, args: string[]) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let buffer = "";
    let flushTimer: NodeJS.Timeout | null = null;
    let killed = false;

    const flush = () => {
      flushTimer = null;
      if (!buffer) return;
      workbench.webContents.send("workbench.workspace.install.log", buffer);
      buffer = "";
    };

    const push = (chunk: Buffer) => {
      buffer += chunk.toString();
      if (!flushTimer) flushTimer = setTimeout(flush, 50);
      if (buffer.length > 200_000) flush();
    };

    child.stdout?.on("data", push);
    child.stderr?.on("data", push);

    const cleanup = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flush();
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.removeAllListeners();
    };

    child.on("close", (code, signal) => {
      cleanup();
      workbench.webContents.send(
        "workbench.workspace.install.log",
        `\nProcess exited with code ${code}${signal ? ` (signal: ${signal})` : ""}\n`,
      );
      workbench.webContents.send("workbench.workspace.install.complete");
    });

    child.on("error", (err) => {
      cleanup();
      workbench.webContents.send(
        "workbench.workspace.install.log",
        `\n${err.message}\n`,
      );
      workbench.webContents.send("workbench.workspace.install.complete");
    });

    // optional: return a "cancel" function id pattern if you want
    return { ok: true };
  },
);
