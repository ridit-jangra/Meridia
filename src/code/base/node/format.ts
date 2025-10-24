import path from "path";
import { spawn } from "child_process";
import { ipcMain } from "electron";

ipcMain.handle("workbench.editor.format.file", async (_, _path: string) => {
  return new Promise<void>((resolve, reject) => {
    const prettierPath = path.join(
      __dirname,
      "formatter",
      "prettier",
      "bin",
      "prettier.cjs"
    );

    const child = spawn(process.execPath, [prettierPath, "--write", _path], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
      },
    });

    let stderrData = "";

    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prettier formatting failed: ${stderrData}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
});

ipcMain.handle(
  "workbench.editor.format.file.rust",
  async (_, _path: string) => {
    return new Promise<void>((resolve, reject) => {
      const prettierPath = path.join(
        __dirname,
        "formatter",
        "prettier",
        "bin",
        "prettier.cjs"
      );

      const prettierRustPath = path.join(
        __dirname,
        "formatter",
        "prettier-rust",
        "index.js"
      );

      const child = spawn(
        process.execPath,
        [
          prettierPath,
          "--plugin",
          prettierRustPath,
          "--write",
          _path,
          "--log-level",
          "debug",
        ],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
          },
        }
      );

      let stderrData = "";

      child.stderr.on("data", (data) => {
        const errorMessage = data.toString();
        stderrData += errorMessage;
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }
);

ipcMain.handle(
  "workbench.editor.format.file.python",
  async (_, _path: string) => {
    return new Promise<void>((resolve, reject) => {
      const prettierPath = path.join(
        __dirname,
        "formatter",
        "prettier",
        "bin",
        "prettier.cjs"
      );

      const prettierRustPath = path.join(
        __dirname,
        "formatter",
        "prettier-python",
        "src",
        "index.js"
      );

      const child = spawn(
        process.execPath,
        [
          prettierPath,
          "--plugin",
          prettierRustPath,
          "--write",
          _path,
          "--log-level",
          "debug",
        ],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
          },
        }
      );

      let stderrData = "";

      child.stderr.on("data", (data) => {
        const errorMessage = data.toString();
        stderrData += errorMessage;
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }
);
