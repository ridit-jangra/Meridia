import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";
import { IXTermInstance } from "../../workbench.types.js";
import { getStandalone } from "../workbench.standalone.js";
import { Theme } from "../workbench.theme.js";
import { select } from "../workbench.store/workbench.store.selector.js";

const ipcRenderer = window.ipc;

class XtermManager {
  _terminals = new Map<string, IXTermInstance>();
  private _runningCommands = new Map<
    string,
    { pid?: number; isRunning: boolean }
  >();
  private _completionDetected = new Map<string, boolean>();

  async _spawn(id: string, shell?: string): Promise<HTMLElement> {
    if (this._terminals.has(id)) {
      return this._terminals.get(id)!._container;
    }

    const _container = document.createElement("div");
    _container.style.position = "relative";
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
    });
    term.open(_container);

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    fitAddon.fit();

    const structure = select((s) => s.main.folder_structure);

    const cwd = structure ? structure.uri : "";

    await ipcRenderer.invoke("pty-spawn", id, term.cols, term.rows, cwd, shell);

    const onPtyData = (_event: any, data: string) => {
      let filteredData = this._filter(id, data);

      if (
        filteredData.includes("\x1b[H\x1b[2J") ||
        filteredData.includes("\x1b[2J")
      ) {
        term.clear();
      } else if (filteredData.length > 0) {
        term.write(filteredData);
      }
    };
    ipcRenderer.on(`pty-data-${id}`, onPtyData);

    term.onData((data) => {
      ipcRenderer.invoke("pty-write", id, data);
    });

    term.onResize(({ cols, rows }) => {
      ipcRenderer.invoke("pty-resize", id, cols, rows);
      this._update();
    });

    setTimeout(() => {
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
      this._update();
    }, 100);

    this._terminals.set(id, {
      term,
      _container,
      _fitAddon: fitAddon,
      _ptyDataListener: onPtyData,
    });

    return _container;
  }

  _updateTheme() {
    const _theme = getStandalone("theme") as Theme;

    for (const [id, instance] of this._terminals) {
      instance.term.options.theme = {
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
    }
  }

  private _filter(id: string, data: string): string {
    if (this._completionDetected.get(id)) {
      return "";
    }

    const executionMarkerRegex =
      /__EXECUTION_COMPLETE_[a-f0-9]{8}__[A-Z_]+(_\d+)?/;
    const hasMarker =
      executionMarkerRegex.test(data) ||
      data.includes("__EXECUTION_COMPLETE_") ||
      data.includes("__SUCCESS") ||
      data.includes("__ERROR") ||
      data.includes("__INTERRUPTED") ||
      data.includes("__EXCEPTION");

    if (hasMarker) {
      this._completionDetected.set(id, true);

      const lines = data.split("\n");
      const filteredLines = [];

      for (const line of lines) {
        if (
          line.match(executionMarkerRegex) ||
          line.includes("__EXECUTION_COMPLETE_") ||
          line.includes("__SUCCESS") ||
          line.includes("__ERROR") ||
          line.includes("__INTERRUPTED") ||
          line.includes("__EXCEPTION")
        ) {
          break;
        }
        filteredLines.push(line);
      }

      return filteredLines.join("\n");
    }

    return data;
  }

  _get(id: string): HTMLElement | null {
    return this._terminals.get(id)?._container || null;
  }

  _dispose(id: string) {
    const _instance = this._terminals.get(id);
    if (!_instance) return;

    ipcRenderer.removeListener(`pty-data-${id}`, _instance._ptyDataListener);
    _instance.term.dispose();
    _instance._container.remove();
    this._terminals.delete(id);
    this._completionDetected.delete(id);

    ipcRenderer.invoke("pty-kill", id);
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
          instance._fitAddon.fit();

          const _height =
            instance._container.parentElement!.parentElement!.parentElement!
              .clientHeight -
            85 +
            "px";
          const _width =
            instance._container.parentElement!.parentElement!.parentElement!
              .clientWidth -
            10 +
            "px";

          instance._container.style.height = _height;
          instance._container.style.width = _width;
        } catch (e) {}
      }
    }, 10);
  }

  async _run(id: string, command: string, _path: string): Promise<boolean> {
    const instance = this._terminals.get(id);
    if (!instance?.term) return false;

    this._completionDetected.set(id, false);
    this._runningCommands.set(id, { isRunning: true });

    instance.term.clear();
    instance.term.options.disableStdin = false;

    ipcRenderer.invoke("pty-write", id, `cd "${_path}"\r`);
    await new Promise((r) => setTimeout(r, 200));
    ipcRenderer.invoke("pty-write", id, `clear\r`);
    await new Promise((r) => setTimeout(r, 200));
    ipcRenderer.invoke("pty-write", id, `${command}\r`);

    const commandCompleted = this._wait(id);

    const wasSuccessful = await commandCompleted;

    instance.term.options.disableStdin = true;
    this._runningCommands.delete(id);
    instance.term.write(`\r\nExit code 1\r\n`);

    return wasSuccessful;
  }

  private _wait(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      const instance = this._terminals.get(id);
      if (!instance?.term) {
        resolve(false);
        return;
      }

      let dataBuffer = "";
      let timeoutId: NodeJS.Timeout;
      let resolved = false;

      const ptyDataListener = (event: any, data: string) => {
        if (resolved) return;

        dataBuffer += data;

        const hasCompletionMarker = dataBuffer.includes(
          "__EXECUTION_COMPLETE_"
        );

        if (hasCompletionMarker) {
          const lines = dataBuffer.split("\n");
          const completionLine = lines.find((line) =>
            line.includes("__EXECUTION_COMPLETE_")
          );

          if (completionLine) {
            cleanup();
            const wasSuccessful = completionLine.includes("SUCCESS");
            resolved = true;
            resolve(wasSuccessful);
            return;
          }
        }

        if (
          dataBuffer.includes("__SUCCESS") ||
          dataBuffer.includes("SUCCESS")
        ) {
          cleanup();
          resolved = true;
          resolve(true);
          return;
        }

        if (
          dataBuffer.includes("__ERROR") ||
          dataBuffer.includes("__INTERRUPTED") ||
          dataBuffer.includes("__EXCEPTION")
        ) {
          cleanup();
          resolved = true;
          resolve(false);
          return;
        }
      };

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        ipcRenderer.removeListener(`pty-data-${id}`, ptyDataListener);
      };

      ipcRenderer.on(`pty-data-${id}`, ptyDataListener);

      timeoutId = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolved = true;
          resolve(false);
        }
      }, 60000);
    });
  }

  async _stop(id: string): Promise<boolean> {
    const commandInfo = this._runningCommands.get(id);
    if (!commandInfo || !commandInfo.isRunning) {
      return false;
    }

    const term = this._terminals.get(id)?.term;

    if (term) {
      try {
        this._runningCommands.set(id, { ...commandInfo, isRunning: false });
        this._completionDetected.delete(id);

        term.options.disableStdin = true;

        return true;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  }
}

export const _xtermManager = new XtermManager();

ipcRenderer.on("reset-sizes", () => {
  _xtermManager._update();
});
