import { spawn } from "child_process";
import { ipcMain } from "electron";
import { workbench } from "../electron-browser/window";

ipcMain.handle(
  "workbench.workspace.run.command",
  (_, command: string, args: string[]) => {
    console.log("[RUN]", command, args);

    const process = spawn(command, args, {});

    process.stdout?.on("data", (data) => {
      const log = data.toString();
      console.log("[STDOUT]", log.trim());
      workbench.webContents.send("workbench.workspace.run.command.log", log);
    });

    process.stderr?.on("data", (data) => {
      const log = data.toString();
      console.log("[STDERR]", log.trim());
      workbench.webContents.send("workbench.workspace.run.command.log", log);
    });

    process.on("close", (code, signal) => {
      const msg = `Process exited with code ${code}${
        signal ? ` (signal: ${signal})` : ""
      }`;
      console.log("[CLOSE]", msg);

      workbench.webContents.send("workbench.workspace.run.command.log", msg);
      workbench.webContents.send("workbench.workspace.run.command.complete");
    });

    process.on("error", (error) => {
      console.log("[ERROR]", error.message);

      workbench.webContents.send(
        "workbench.workspace.run.command.log",
        error.message,
      );
      workbench.webContents.send(
        "workbench.workspace.run.command.complete",
        error.message,
      );
    });
  },
);
