import { spawn } from "child_process";
import { ipcMain } from "electron";
import { workbench } from "../electron-browser/window";

ipcMain.handle(
  "workbench.workspace.run.command",
  (_, command: string, args: string[]) => {
    const process = spawn(command, args, {});

    process.stdout?.on("data", (data) => {
      const log = data.toString();
      workbench.webContents.send("workbench.workspace.run.command.log", log);
    });

    process.stderr?.on("data", (data) => {
      const log = data.toString();
      workbench.webContents.send("workbench.workspace.run.command.log", log);
    });

    process.on("close", (code, signal) => {
      workbench.webContents.send(
        "workbench.workspace.run.command.log",
        `Process exited with code ${code}${
          signal ? ` (signal: ${signal})` : ""
        }`
      );

      workbench.webContents.send("workbench.workspace.run.command.complete");
    });

    process.on("error", (error) => {
      workbench.webContents.send(
        "workbench.workspace.run.command.log",
        error.message
      );
      workbench.webContents.send(
        "workbench.workspace.run.command.complete",
        error.message
      );
    });
  }
);
