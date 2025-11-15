import { FitAddon } from "@xterm/addon-fit";
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
    callback: (status: "success" | "error" | "interrupted") => void
  ) {
    this._completionCallbacks.set(id, callback);
  }

  async _spawn(id: string, shell?: string, cwd?: string): Promise<HTMLElement> {
    if (this._terminals.has(id)) {
      this._dispose(id);
    }

    const _container = document.createElement("div");
    _container.style.width = "100%";
    _container.style.height = "100%";
    _container.style.background = "var(--workbench-terminal-background)";
    _container.style.display = "flex";
    _container.style.flexDirection = "column";
    _container.style.padding = "12px";

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
    fitAddon.fit();

    const structure = select((s) => s.main.folder_structure);
    const _cwd = structure ? structure.uri : cwd ? cwd : "";

    await ipcRenderer.invoke(
      "workbench.terminal.spawn",
      id,
      term.cols,
      term.rows,
      _cwd,
      shell
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
        "workbench.terminal.selection.background"
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
    this._update();

    this._terminals.set(id, {
      term,
      _container,
      _fitAddon: fitAddon,
      _ptyDataListener: onPtyData,
    });

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
    setTimeout(() => {
      for (const [id, instance] of this._terminals) {
        try {
          const parentElement =
            instance._container.parentElement?.parentElement?.parentElement;

          if (!parentElement) continue;

          const _height =
            instance._container.parentElement!.parentElement!.parentElement!
              .clientHeight -
            25 +
            "px";

          instance._container.style.height = _height;
          instance._container.style.width = "calc(100% - 15px)";
          instance._container.style.overflow = "hidden";

          instance._fitAddon.fit();
        } catch (e) {}
      }
    }, 50);
  }

  _dispose(id: string) {
    const _instance = this._terminals.get(id);
    if (!_instance) return;

    ipcRenderer.removeListener(
      `workbench.terminal.data.pty-${id}`,
      _instance._ptyDataListener
    );

    _instance.term.dispose();
    _instance._container.remove();

    this._terminals.delete(id);
    this._completionDetected.delete(id);
    this._runningCommands.delete(id);
    this._completionCallbacks.delete(id);

    ipcRenderer.invoke("workbench.terminal.kill", id);
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
    fitAddon.fit();

    const _theme = getStandalone("theme") as Theme;
    term.options.theme = {
      background: _theme.getColor("workbench.terminal.background"),
      foreground: _theme.getColor("workbench.terminal.foreground"),
      cursor: _theme.getColor("workbench.terminal.cursor.foreground"),
      selectionBackground: _theme.getColor(
        "workbench.terminal.selection.background"
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
      }
    );

    ipcRenderer.on(
      `workbench.terminal.user.run.exit.${id}`,
      (event: any, code: string) => {
        term.write(`\r\n\x1b[90mProcess exited with code ${code}\x1b[0m\r\n`);

        this._dispatch("workbench.editor.run.enable");
        this._dispatch("workbench.editor.stop.disable");
      }
    );

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
}

export const _xtermManager = new XtermManager();

ipcRenderer.on("reset-sizes", () => {
  _xtermManager._update();
});
