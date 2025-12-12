import { ipcMain } from "electron";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { workbench } from "../../../workbench/electron-browser/window";

ipcMain.handle(
  "workbench.workspace.install",
  async (_, command: string, args: string[]) => {
    console.log(`[INSTALL] Starting: ${command}`);

    const process = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    process.stdout?.on("data", (data) => {
      const log = data.toString();
      console.log(`[INSTALL:STDOUT] ${log.trim()}`);
      workbench.webContents.send("workbench.workspace.install.log", {
        type: "stdout",
        message: log,
      });
    });

    process.stderr?.on("data", (data) => {
      const log = data.toString();
      console.error(`[INSTALL:STDERR] ${log.trim()}`);
      workbench.webContents.send("workbench.workspace.install.log", {
        type: "stderr",
        message: log,
      });
    });

    process.on("close", (code, signal) => {
      const status = code === 0 ? "success" : "failed";
      console.log(
        `[INSTALL] Completed with ${status} (code: ${code}, signal: ${signal})`
      );

      workbench.webContents.send("workbench.workspace.install.log", {
        type: "status",
        message: `Process exited with code ${code}${
          signal ? ` (signal: ${signal})` : ""
        }`,
      });

      workbench.webContents.send("workbench.workspace.install.complete", {
        code,
        signal,
        success: code === 0,
      });
    });

    process.on("error", (error) => {
      console.error(`[INSTALL] Spawn error:`, error);
      workbench.webContents.send("workbench.workspace.install.log", {
        type: "error",
        message: error.message,
      });
      workbench.webContents.send("workbench.workspace.install.complete", {
        error: error.message,
        success: false,
      });
    });
  }
);
