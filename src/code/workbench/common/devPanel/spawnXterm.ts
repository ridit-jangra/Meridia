import { FitAddon } from "@xterm/addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { Terminal as XTerm } from "@xterm/xterm";
import { IXTermInstance } from "../../workbench.types.js";
import { getStandalone } from "../class.js";
import { Theme } from "../theme.js";
import { select } from "../store/selector.js";

const ipcRenderer = window.ipc;

class XtermManager {
  _terminals = new Map<string, IXTermInstance>();
  private _runningCommands = new Map<
    string,
    { pid?: number; isRunning: boolean }
  >();
  private _completionDetected = new Map<string, boolean>();
  private _completionCallbacks = new Map<
    string,
    (status: "success" | "error" | "interrupted") => void
  >();

  private _dispatch(eventName: string, detail?: any) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  }

  _setCompletionCallback(
    id: string,
    callback: (status: "success" | "error" | "interrupted") => void,
  ) {
    this._completionCallbacks.set(id, callback);
  }

  async _spawn(id: string, shell?: string, cwd?: string): Promise<HTMLElement> {
    if (this._terminals.has(id)) {
      this._dispose(id);
    }

    const project_details = select((s) => s.main.project_details);

    const _container = document.createElement("div");
    _container.style.width = "100%";
    _container.style.height = "100%";
    _container.style.background = "var(--workbench-terminal-background)";
    _container.style.display = "flex";
    _container.style.flexDirection = "column";
    _container.style.padding = "12px";

    const term = new XTerm({
      scrollback: 1000,
      fontFamily: "Jetbrains Mono, monospace",
      fontSize: 18,
      cursorBlink: true,
      cursorStyle: "bar",
      cursorInactiveStyle: "none",
    });
    term.open(_container);

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const clipboardAddon = new ClipboardAddon({
      writeText: (data) => window.workbench.clipboard.writeText(data),
      readText: () => window.workbench.clipboard.readText(),
    });
    term.loadAddon(clipboardAddon);

    const structure = select((s) => s.main.folder_structure);
    const _cwd = structure ? structure.uri : cwd ? cwd : "";

    await ipcRenderer.invoke(
      "workbench.terminal.spawn",
      id,
      term.cols,
      term.rows,
      _cwd,
      shell,
    );

    const onPtyData = (_event: any, data: string) => {
      if (data.includes("\x1b[H\x1b[2J") || data.includes("\x1b[2J")) {
        term.clear();
      } else if (data.length > 0) {
        term.write(data);
      }
    };
    ipcRenderer.on(`workbench.terminal.data.pty-${id}`, onPtyData);

    term.onData((data) => {
      ipcRenderer.invoke("workbench.terminal.data.user", id, data);
    });

    term.onResize(({ cols, rows }) => {
      ipcRenderer.invoke("workbench.terminal.resize", id, cols, rows);
      this._update();
    });

    const _theme = getStandalone("theme") as Theme;
    term.options.theme = {
      background: _theme.getColor("workbench.terminal.background"),
      foreground: _theme.getColor("workbench.terminal.foreground"),
      cursor: _theme.getColor("workbench.terminal.cursor.foreground"),
      selectionBackground: _theme.getColor(
        "workbench.terminal.selection.background",
      ),
      black: _theme.getColor("workbench.terminal.black"),
      red: _theme.getColor("workbench.terminal.red"),
      green: _theme.getColor("workbench.terminal.green"),
      yellow: _theme.getColor("workbench.terminal.yellow"),
      blue: _theme.getColor("workbench.terminal.blue"),
      magenta: _theme.getColor("workbench.terminal.magenta"),
      cyan: _theme.getColor("workbench.terminal.cyan"),
      white: _theme.getColor("workbench.terminal.white"),
      brightBlack: _theme.getColor("workbench.terminal.bright.black"),
      brightRed: _theme.getColor("workbench.terminal.bright.red"),
      brightGreen: _theme.getColor("workbench.terminal.bright.green"),
      brightYellow: _theme.getColor("workbench.terminal.bright.yellow"),
      brightBlue: _theme.getColor("workbench.terminal.bright.blue"),
      brightMagenta: _theme.getColor("workbench.terminal.bright.magenta"),
      brightCyan: _theme.getColor("workbench.terminal.bright.cyan"),
      brightWhite: _theme.getColor("workbench.terminal.bright.white"),
    };

    this._terminals.set(id, {
      term,
      _container,
      _fitAddon: fitAddon,
      _ptyDataListener: onPtyData,
    });

    // Ensure font is loaded before fitting with multiple attempts
    const ensureFontLoaded = async () => {
      try {
        // Wait for all fonts to be ready
        await document.fonts.ready;
        // Explicitly load JetBrains Mono
        await document.fonts.load('18px "Jetbrains Mono"');
      } catch (e) {
        // Fallback if font loading API fails
      }

      // Multiple fit attempts to ensure proper rendering
      requestAnimationFrame(() => {
        term.refresh(0, term.rows - 1);
        fitAddon.fit();
        setTimeout(() => {
          term.refresh(0, term.rows - 1);
          fitAddon.fit();
          this._update();
          // One more fit after a longer delay
          setTimeout(() => {
            term.refresh(0, term.rows - 1);
            fitAddon.fit();
          }, 200);
        }, 100);
      });
    };

    ensureFontLoaded();

    if (project_details.venv && project_details.venv.activate) {
      ipcRenderer.invoke(
        "workbench.terminal.data.user",
        id,
        project_details.venv.activate + "\r",
      );
    }

    return _container;
  }

  _get(id: string): HTMLElement | null {
    return this._terminals.get(id)?._container || null;
  }

  _disposeAll() {
    for (const id of Array.from(this._terminals.keys())) {
      this._dispose(id);
    }
  }

  _update() {
    // Use requestAnimationFrame for better timing with browser rendering
    requestAnimationFrame(() => {
      setTimeout(() => {
        for (const [_, instance] of this._terminals) {
          try {
            const parentElement =
              instance._container.parentElement?.parentElement?.parentElement;

            if (!parentElement) continue;

            // Ensure parent has dimensions
            const parentHeight = parentElement.clientHeight;
            if (parentHeight === 0) continue;

            const _height = parentHeight - 7 + "px";

            instance._container.style.height = _height;
            instance._container.style.width = "100%";
            instance._container.style.overflow = "hidden";

            // Force refresh to ensure font is properly rendered
            instance.term.refresh(0, instance.term.rows - 1);
            instance._fitAddon.fit();
          } catch (e) {}
        }
      }, 50);
    });
  }

  _forceRefresh(id?: string) {
    if (id) {
      const instance = this._terminals.get(id);
      if (instance) {
        instance.term.refresh(0, instance.term.rows - 1);
        instance._fitAddon.fit();
      }
    } else {
      // Refresh all terminals
      for (const [_, instance] of this._terminals) {
        instance.term.refresh(0, instance.term.rows - 1);
        instance._fitAddon.fit();
      }
    }
  }

  _dispose(id: string) {
    const _instance = this._terminals.get(id);
    if (!_instance) return;

    ipcRenderer.removeListener(
      `workbench.terminal.data.pty-${id}`,
      _instance._ptyDataListener,
    );

    _instance.term.dispose();
    _instance._container.remove();

    this._terminals.delete(id);
    this._completionDetected.delete(id);
    this._runningCommands.delete(id);
    this._completionCallbacks.delete(id);

    ipcRenderer.invoke("workbench.terminal.kill", id);

    setTimeout(() => {
      this._update();
    }, 100);
  }

  async _run(id: string, command: string, _path: string) {
    this._dispatch("workbench.editor.run.disable");
    this._dispatch("workbench.editor.stop.enable");

    const cwd = select((s) => s.main.folder_structure).uri ?? "/";

    this._dispose(id);

    const _container = document.createElement("div");

    _container.style.width = "100%";
    _container.style.height = "100%";
    _container.style.background = "var(--workbench-terminal-background)";
    _container.style.display = "flex";
    _container.style.flexDirection = "column";
    _container.style.padding = "12px";
    _container.style.overflow = "hidden";
    _container.style.boxSizing = "border-box";

    const term = new XTerm({
      scrollback: 1000,
      fontFamily: "Jetbrains Mono",
      fontSize: 18,
      cursorBlink: true,
      cursorStyle: "bar",
      cursorInactiveStyle: "none",
    });
    term.open(_container);

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const clipboardAddon = new ClipboardAddon({
      writeText: (data) => window.workbench.clipboard.writeText(data),
      readText: () => window.workbench.clipboard.readText(),
    });
    term.loadAddon(clipboardAddon);

    const _theme = getStandalone("theme") as Theme;
    term.options.theme = {
      background: _theme.getColor("workbench.terminal.background"),
      foreground: _theme.getColor("workbench.terminal.foreground"),
      cursor: _theme.getColor("workbench.terminal.cursor.foreground"),
      selectionBackground: _theme.getColor(
        "workbench.terminal.selection.background",
      ),
      black: _theme.getColor("workbench.terminal.black"),
      red: _theme.getColor("workbench.terminal.red"),
      green: _theme.getColor("workbench.terminal.green"),
      yellow: _theme.getColor("workbench.terminal.yellow"),
      blue: _theme.getColor("workbench.terminal.blue"),
      magenta: _theme.getColor("workbench.terminal.magenta"),
      cyan: _theme.getColor("workbench.terminal.cyan"),
      white: _theme.getColor("workbench.terminal.white"),
      brightBlack: _theme.getColor("workbench.terminal.bright.black"),
      brightRed: _theme.getColor("workbench.terminal.bright.red"),
      brightGreen: _theme.getColor("workbench.terminal.bright.green"),
      brightYellow: _theme.getColor("workbench.terminal.bright.yellow"),
      brightBlue: _theme.getColor("workbench.terminal.bright.blue"),
      brightMagenta: _theme.getColor("workbench.terminal.bright.magenta"),
      brightCyan: _theme.getColor("workbench.terminal.bright.cyan"),
      brightWhite: _theme.getColor("workbench.terminal.bright.white"),
    };

    term.clear();

    this._terminals.set(id, {
      term,
      _container,
      _fitAddon: fitAddon,
      _ptyDataListener: () => {},
    });

    this._runningCommands.set(id, { isRunning: true });

    term.write("\x1b[90m" + command + "\x1b[0m" + "\r\n\n");

    ipcRenderer.send("workbench.terminal.user.run", command, id, cwd);

    term.onData((data) => {
      ipcRenderer.send("workbench.terminal.run.user.data", id, data);
    });

    ipcRenderer.on(
      `workbench.terminal.user.run.stdout.${id}`,
      (event: any, data: string) => {
        this._update();
        term.write(data);
      },
    );

    ipcRenderer.on(
      `workbench.terminal.user.run.exit.${id}`,
      (event: any, code: string) => {
        term.write(`\r\n\x1b[90mProcess exited with code ${code}\x1b[0m\r\n`);

        this._dispatch("workbench.editor.run.enable");
        this._dispatch("workbench.editor.stop.disable");
      },
    );

    // Ensure font is loaded before fitting with multiple attempts
    const ensureFontLoaded = async () => {
      try {
        // Wait for all fonts to be ready
        await document.fonts.ready;
        // Explicitly load JetBrains Mono
        await document.fonts.load('18px "Jetbrains Mono"');
      } catch (e) {
        // Fallback if font loading API fails
      }

      // Multiple fit attempts to ensure proper rendering
      setTimeout(() => {
        term.refresh(0, term.rows - 1);
        fitAddon.fit();
        this._update();
        setTimeout(() => {
          term.refresh(0, term.rows - 1);
          fitAddon.fit();
        }, 200);
      }, 100);
    };

    ensureFontLoaded();

    return _container;
  }

  async _stop(id: string): Promise<boolean> {
    const commandInfo = this._runningCommands.get(id);
    if (!commandInfo || !commandInfo.isRunning) {
      return false;
    }

    const term = this._terminals.get(id)?.term;

    if (term) {
      try {
        await ipcRenderer.invoke("workbench.terminal.run.kill", id);

        this._runningCommands.set(id, { ...commandInfo, isRunning: false });
        this._completionDetected.set(id, true);

        term.options.disableStdin = true;

        this._completionCallbacks.delete(id);

        this._dispatch("workbench.editor.run.enable");
        this._dispatch("workbench.editor.stop.disable");

        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  async _runCommand(command: string): Promise<boolean> {
    const ids = Array.from(this._terminals.keys());
    const id = ids[0]!;
    const instance = this._terminals.get(id);

    if (!instance) {
      return false;
    }

    setTimeout(() => {
      this._update();
    }, 100);

    try {
      await ipcRenderer.invoke(
        "workbench.terminal.data.user",
        id,
        command + "\r",
      );

      return true;
    } catch (error) {
      return false;
    }
  }
}

export const _xtermManager = new XtermManager();

ipcRenderer.on("reset-sizes", () => {
  _xtermManager._update();
});

document.addEventListener("workbench.workspace.virtual.env.complete", () => {
  console.log("virtual env got event");

  _xtermManager._terminals.forEach((v, i) => {
    v.term.clear();

    const project_details = select((s) => s.main.project_details);

    if (project_details.venv && project_details.venv.activate) {
      ipcRenderer.invoke(
        "workbench.terminal.data.user",
        i,
        project_details.venv.activate + "\r",
      );
    }
  });
});
