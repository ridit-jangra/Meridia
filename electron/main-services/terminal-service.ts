import pty, { IPty } from "node-pty";
import os from "node:os";
import { attach_event_emitter } from "../shared/terminal.helpers";
import { WebContents } from "electron";
import { NODE_PTY_EXIT } from "../../shared/ipc/channels";
import { workspace } from "./workspace-service";

function get_shell(): { shell: string; args: string[] } {
  if (os.platform() === "win32") {
    const pwsh = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
    const ps = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

    try {
      require("fs").accessSync(pwsh);
      return { shell: pwsh, args: [] };
    } catch {
      return { shell: ps, args: [] };
    }
  }

  return { shell: process.env.SHELL ?? "/bin/bash", args: [] };
}

class terminal_service {
  private terminals = new Map<string, IPty>();

  public async create(id: string, sender: WebContents, cwd?: string) {
    const { shell, args } = get_shell();

    const current_workspace_path = await workspace.get_current_workspace_path();

    const t = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd:
        cwd ??
        current_workspace_path ??
        process.env.HOME ??
        process.env.USERPROFILE,
      env: {
        ...(process.env as Record<string, string>),
        TERM: "xterm-256color",
      },
    });

    attach_event_emitter(t, id);

    t.onExit((exitCode) => {
      if (!sender.isDestroyed()) {
        sender.send(NODE_PTY_EXIT, id, exitCode);
      }
      this.terminals.delete(id);
    });

    this.terminals.set(id, t);
  }

  public kill(id: string) {
    const t = this.terminals.get(id);
    if (!t) return;
    t.kill();
    this.terminals.delete(id);
  }

  public get(id: string) {
    return this.terminals.get(id);
  }

  public write(id: string, data: string) {
    const t = this.terminals.get(id);
    if (!t) return;
    t.write(data);
  }

  public resize(id: string, cols: number, rows: number) {
    const t = this.terminals.get(id);
    if (!t) return;
    t.resize(cols, rows);
  }
}

export const terminal = new terminal_service();
