import { spawn } from "child_process";
import { ipcMain } from "electron";
import { IProjectDetails } from "../workbench.types";

ipcMain.handle(
  "workbench.workspace.python.project.check.package",
  (_, project_details: IProjectDetails, _package: string) => {
    if (!project_details?.venv?.python) {
      return { installed: false, reason: "No venv python path" };
    }

    return new Promise<boolean>((resolve) => {
      const process = spawn(
        project_details.venv.python,
        ["-m", "pip", "show", _package],
        { stdio: ["ignore", "pipe", "pipe"] }
      );

      let output = "";
      let errorOutput = "";

      process.stdout?.on("data", (data) => {
        output += data.toString();
      });

      process.stderr?.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0 && output.includes(`Name: ${_package}`)) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      process.on("error", (error) => {
        resolve(false);
      });
    });
  }
);

ipcMain.handle(
  "workbench.workspace.python.check.package",
  (_, _package: string) => {
    return new Promise<boolean>((resolve) => {
      const process = spawn("python", ["-m", "pip", "show", _package], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      process.stdout?.on("data", (data) => {
        output += data.toString();
      });

      process.stderr?.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        const hasNameLine = output.toLowerCase().includes(`name: ${_package}`);

        if (code === 0 && hasNameLine) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      process.on("error", (error) => {
        resolve(false);
      });
    });
  }
);
