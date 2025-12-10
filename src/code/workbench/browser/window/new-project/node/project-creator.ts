import { ipcMain } from "electron";
import { workbench } from "../../../../electron-browser/window.js";
import child_process from "child_process";
import path from "path";
import fs from "fs";

ipcMain.handle(
  "workbench.workspace.project.create.python.empty",
  (_, name: string, location: string, main: boolean, venv: boolean) => {
    const fullPath = path.join(location, name);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });

    if (main) fs.writeFileSync(path.join(fullPath, "main.py"), "");

    const meridiaPath = path.join(fullPath, ".meridia");

    if (!fs.existsSync(meridiaPath))
      fs.mkdirSync(meridiaPath, { recursive: true });

    const configFile = path.join(meridiaPath, "editor.json");

    fs.writeFileSync(configFile, "");

    if (venv)
      child_process.execSync("python -m venv " + path.join(fullPath, ".venv"));

    workbench.webContents.send(
      "workbench.workspace.project.python.empty.complete",
      fullPath
    );
  }
);

ipcMain.handle(
  "workbench.workspace.project.create.typescript.empty",
  async (_, name: string, location: string, main: boolean) => {
    const fullPath = path.join(location, name);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    if (main) fs.writeFileSync(path.join(fullPath, "main.ts"), "");

    const meridiaPath = path.join(fullPath, ".meridia");
    if (!fs.existsSync(meridiaPath)) {
      fs.mkdirSync(meridiaPath, { recursive: true });
    }

    const configFile = path.join(meridiaPath, "editor.json");
    fs.writeFileSync(configFile, "");

    child_process.execSync("npm init -y", {
      cwd: fullPath,
    });

    child_process.execSync("npm i --save-dev typescript", {
      cwd: fullPath,
    });

    workbench.webContents.send(
      "workbench.workspace.project.typescript.empty.complete",
      fullPath
    );
  }
);

ipcMain.handle(
  "workbench.workspace.project.create.javascript.empty",
  async (_, name: string, location: string, main: boolean) => {
    const fullPath = path.join(location, name);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    if (main) fs.writeFileSync(path.join(fullPath, "main.js"), "");

    const meridiaPath = path.join(fullPath, ".meridia");
    if (!fs.existsSync(meridiaPath)) {
      fs.mkdirSync(meridiaPath, { recursive: true });
    }

    const configFile = path.join(meridiaPath, "editor.json");
    fs.writeFileSync(configFile, "");

    child_process.execSync("npm init -y", {
      cwd: fullPath,
    });

    workbench.webContents.send(
      "workbench.workspace.project.javascript.empty.complete",
      fullPath
    );
  }
);

ipcMain.handle(
  "workbench.workspace.project.create.typescript.nextjs",
  async (
    _,
    name: string,
    location: string,
    turbopack: boolean,
    appRouter: boolean,
    tailwind: boolean,
    eslint: boolean,
    reactIcons: boolean,
    srcDir: boolean,
    alias: boolean,
    swcMinify: boolean
  ) => {
    const fullPath = path.join(location, name);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    const meridiaPath = path.join(fullPath, ".meridia");
    if (!fs.existsSync(meridiaPath)) {
      fs.mkdirSync(meridiaPath, { recursive: true });
    }

    const configFile = path.join(meridiaPath, "editor.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify(
        {
          language: "typescript",
          formatOnSave: true,
          tabSize: 2,
        },
        null,
        2
      )
    );

    const nextArgs = [
      `create-next-app@${name}`,
      `.`,
      `--typescript`,
      `--eslint ${eslint}`,
      `--tailwind ${tailwind}`,
      `--app ${appRouter}`,
      `--src-dir ${srcDir}`,
      `--import-alias "@/*" ${alias}`,
      `--swc-minify ${swcMinify}`,
      `--turbopack ${turbopack}`,
      ...(reactIcons ? [`--with-react-icons`] : []),
    ];

    try {
      child_process.execSync(`npx ${nextArgs.join(" ")}`, {
        cwd: fullPath,
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Next.js creation failed:", error);
      throw new Error(`Failed to create Next.js project: ${error}`);
    }

    workbench.webContents.send(
      "workbench.workspace.project.typescript.nextjs.complete",
      fullPath
    );
  }
);
