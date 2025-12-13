import { ipcMain } from "electron";
import { spawn } from "child_process";
import { workbench } from "../../../workbench/electron-browser/window";

ipcMain.handle(
  "workbench.workspace.install",
  async (_, command: string, args: string[]) => {
    const process = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    process.stdout?.on("data", (data) => {
      const log = data.toString();
      workbench.webContents.send("workbench.workspace.install.log", log);
    });

    process.stderr?.on("data", (data) => {
      const log = data.toString();
      workbench.webContents.send("workbench.workspace.install.log", log);
    });

    process.on("close", (code, signal) => {
      workbench.webContents.send(
        "workbench.workspace.install.log",
        `Process exited with code ${code}${
          signal ? ` (signal: ${signal})` : ""
        }`
      );

      workbench.webContents.send("workbench.workspace.install.complete");
    });

    process.on("error", (error) => {
      workbench.webContents.send(
        "workbench.workspace.install.log",
        error.message
      );
      workbench.webContents.send(
        "workbench.workspace.install.complete",
        error.message
      );
    });
  }
);
