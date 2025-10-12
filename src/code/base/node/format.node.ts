import path from "path";
import { spawn } from "child_process";
import { ipcMain } from "electron";

ipcMain.on("workbench.editor.format.file", (_, _path: string) => {
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

  child.stdout.on("data", (data) => {});

  child.stderr.on("data", (data) => {});

  child.on("close", (code) => {});

  child.on("error", (error) => {});
});

ipcMain.on("workbench.editor.format.file.rust", (_, _path: string) => {
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

  child.stdout.on("data", (data) => {});

  child.stderr.on("data", (data) => {
    const errorMessage = data.toString();

    if (
      errorMessage.includes("InvalidDocError") ||
      errorMessage.includes("Unexpected doc 'undefined'")
    ) {
    }
  });

  child.on("close", (code) => {
    if (code !== 0) {
      const rustfmtChild = spawn("rustfmt", [_path], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      rustfmtChild.on("close", (rustfmtCode) => {
        if (rustfmtCode === 0) {
        } else {
        }
      });

      rustfmtChild.on("error", (error) => {});
    } else {
    }
  });

  child.on("error", (error) => {});
});
