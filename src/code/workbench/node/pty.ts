import { ipcMain } from "electron";
import * as os from "os";
import * as pty from "node-pty";
import { workbench } from "../electron-browser/window";

const terminals = new Map<string, pty.IPty>();
const processes = new Map<string, pty.IPty>();

function getShell(): string {
  if (os.platform() === "win32") {
    return "powershell.exe";
  }
  return process.env.SHELL || "/bin/bash";
}

setTimeout(() => {
  ipcMain.handle(
    "workbench.terminal.spawn",
    (
      event,
      id: string,
      cols: number,
      rows: number,
      cwd: string,
      _shell?: string
    ) => {
      if (terminals.has(id)) {
        terminals.get(id)!.kill();
        terminals.delete(id);
      }

      const shell = _shell ?? getShell();

      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols,
        rows,
        cwd: cwd ?? os.homedir(),
        env: process.env,
      });

      ptyProcess.onData((data) => {
        workbench.webContents.send(`workbench.terminal.data.pty-${id}`, data);
      });

      terminals.set(id, ptyProcess);
      return true;
    }
  );

  ipcMain.handle(
    "workbench.terminal.resize",
    (event, id: string, cols: number, rows: number) => {
      const term = terminals.get(id);
      const process = processes.get(id);
      if (term) term.resize(cols, rows);
      if (process) process.resize(cols, rows);
      else return false;
    }
  );

  ipcMain.handle(
    "workbench.terminal.data.user",
    (event, id: string, data: string) => {
      return new Promise<boolean>((resolve) => {
        const term = terminals.get(id);
        if (!term) {
          resolve(false);
          return;
        }

        const onData = (output: string) => {
          if (
            output.includes("$") ||
            output.includes(">") ||
            output.includes("#")
          ) {
            resolve(true);
          }
        };

        const disposable = term.onData(onData);

        term.write(data);

        setTimeout(() => {
          disposable.dispose();
          resolve(true);
        }, 5000);
      });
    }
  );

  ipcMain.on(
    "workbench.terminal.user.run",
    (event, command: string, termId: string, cwd: string) => {
      const shell = getShell();
      const ptyProcess = pty.spawn(shell, ["-c", command], {
        name: "xterm-color",
        cwd,
        cols: 80,
        rows: 24,
        env: Object.assign({}, process.env, { PYTHONUNBUFFERED: "1" }),
      });

      processes.set(termId, ptyProcess);

      ptyProcess.onData((data) => {
        event.sender.send(`workbench.terminal.user.run.stdout.${termId}`, data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        event.sender.send(
          `workbench.terminal.user.run.exit.${termId}`,
          exitCode
        );
        processes.delete(termId);
      });
    }
  );

  ipcMain.on("workbench.terminal.run.user.data", (event, termId, input) => {
    const ptyProcess = processes.get(termId);
    if (ptyProcess) {
      ptyProcess.write(input);
    }
  });

  ipcMain.handle("workbench.terminal.run.kill", (event, termId) => {
    const term = processes.get(termId);
    if (term) {
      term.kill();
    }
  });

  ipcMain.handle("workbench.terminal.kill", (event, id: string) => {
    const term = terminals.get(id);
    if (term) {
      term.kill();
      terminals.delete(id);
      return true;
    }
    return false;
  });
}, 100);
