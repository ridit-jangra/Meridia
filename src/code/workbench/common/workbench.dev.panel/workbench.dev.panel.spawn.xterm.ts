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

    this._dispatch("workbench.terminal.create", {
      id,
      shell,
      cwd,
    });

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
      let filteredData = this._filter(id, data);

      if (
        filteredData.includes("\x1b[H\x1b[2J") ||
        filteredData.includes("\x1b[2J")
      ) {
        term.clear();

        this._dispatch("workbench.terminal.clear", { id });
      } else if (filteredData.length > 0) {
        term.write(filteredData);

        this._dispatch("workbench.terminal.output", {
          id,
          data: filteredData,
        });
      }
    };
    ipcRenderer.on(`workbench.terminal.data.pty-${id}`, onPtyData);

    term.onData((data) => {
      ipcRenderer.invoke("workbench.terminal.data.user", id, data);

      this._dispatch("workbench.terminal.input", {
        id,
        data,
      });
    });

    term.onResize(({ cols, rows }) => {
      ipcRenderer.invoke("workbench.terminal.resize", id, cols, rows);
      this._update();

      this._dispatch("workbench.terminal.resize", {
        id,
        cols,
        rows,
      });
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
    }, 100);

    this._terminals.set(id, {
      term,
      _container,
      _fitAddon: fitAddon,
      _ptyDataListener: onPtyData,
    });

    this._dispatch("workbench.terminal.ready", { id });

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

    this._dispatch("workbench.terminal.theme.changed");
  }

  private _filter(id: string, data: string): string {
    const executionMarkerRegex =
      /__EXECUTION_COMPLETE_[a-f0-9]{8}__([A-Z_]+)(_\d+)?/;

    const markerMatch = data.match(executionMarkerRegex);
    const hasSuccessMarker = data.includes("__SUCCESS");
    const hasErrorMarker = data.includes("__ERROR");
    const hasInterruptedMarker = data.includes("__INTERRUPTED");
    const hasExceptionMarker = data.includes("__EXCEPTION");

    if (
      markerMatch ||
      hasSuccessMarker ||
      hasErrorMarker ||
      hasInterruptedMarker ||
      hasExceptionMarker
    ) {
      this._completionDetected.set(id, true);

      const commandInfo = this._runningCommands.get(id);
      if (commandInfo) {
        this._runningCommands.set(id, { ...commandInfo, isRunning: false });
      }

      let status: "success" | "error" | "interrupted" = "success";
      if (hasErrorMarker || hasExceptionMarker) {
        status = "error";
      } else if (hasInterruptedMarker) {
        status = "interrupted";
      }

      this._dispatch("workbench.editor.run.complete", {
        id,
        status,
        output: data,
      });

      this._dispatch("workbench.editor.run.enable");
      this._dispatch("workbench.editor.stop.disable");

      this._dispatchStatusUpdate(
        id,
        status === "success" ? "stopped" : "error"
      );

      const callback = this._completionCallbacks.get(id);
      if (callback) {
        callback(status);
        this._completionCallbacks.delete(id);
      }

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

    if (this._completionDetected.get(id)) {
      return "";
    }

    return data;
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

  _dispose(id: string) {
    const _instance = this._terminals.get(id);
    if (!_instance) return;

    this._dispatch("workbench.terminal.dispose", { id });

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

    this._dispatch("workbench.terminal.disposed", { id });
  }

  async _run(id: string, command: string, _path: string) {
    this._dispatch("workbench.editor.run.start", {
      id,
      command,
      path: _path,
    });

    this._dispatch("workbench.editor.run.disable");
    this._dispatch("workbench.editor.stop.enable");

    await this._spawn(id, "", _path);

    const instance = this._terminals.get(id);
    if (!instance?.term) {
      this._dispatch("workbench.editor.run.error", {
        id,
        error: "Failed to create terminal instance",
      });
      return false;
    }

    this._completionDetected.set(id, false);
    this._runningCommands.set(id, { isRunning: true });

    instance.term.clear();
    instance.term.options.disableStdin = false;

    this._dispatchStatusUpdate(id, "running");

    ipcRenderer.invoke("workbench.terminal.data.user", id, `${command}\r`);

    return id;
  }

  async _stop(id: string): Promise<boolean> {
    const commandInfo = this._runningCommands.get(id);
    if (!commandInfo || !commandInfo.isRunning) {
      return false;
    }

    this._dispatch("workbench.editor.stop.start", { id });

    const term = this._terminals.get(id)?.term;

    if (term) {
      try {
        await ipcRenderer.invoke("workbench.terminal.kill", id);

        this._runningCommands.set(id, { ...commandInfo, isRunning: false });
        this._completionDetected.set(id, true);

        term.options.disableStdin = true;

        const callback = this._completionCallbacks.get(id);
        if (callback) {
          callback("interrupted");
          this._completionCallbacks.delete(id);
        }

        this._dispatch("workbench.editor.stop.success", { id });

        this._dispatch("workbench.editor.run.enable");
        this._dispatch("workbench.editor.stop.disable");

        this._dispatchStatusUpdate(id, "stopped");

        return true;
      } catch (error) {
        console.error("Stop error:", error);

        this._dispatch("workbench.editor.stop.error", {
          id,
          error: error,
        });

        return false;
      }
    }

    return false;
  }

  _isRunning(id: string): boolean {
    const commandInfo = this._runningCommands.get(id);
    return commandInfo?.isRunning ?? false;
  }

  _isCompleted(id: string): boolean {
    return this._completionDetected.get(id) ?? false;
  }

  _dispatchTerminalEvent(eventType: string, id: string, data?: any) {
    this._dispatch(`workbench.terminal.${eventType}`, {
      terminalId: id,
      ...data,
    });
  }

  _dispatchStatusUpdate(id: string, status: "running" | "stopped" | "error") {
    this._dispatch("workbench.terminal.status.update", {
      id,
      status,
      timestamp: Date.now(),
    });
  }

  _dispatchThemeChange() {
    this._dispatch("workbench.terminal.theme.changed");
  }

  dispatchCustomEvent(eventName: string, detail?: any) {
    this._dispatch(eventName, detail);
  }

  dispatchBatchEvents(events: Array<{ name: string; detail?: any }>) {
    events.forEach((event) => {
      this._dispatch(event.name, event.detail);
    });
  }
}

export const _xtermManager = new XtermManager();

ipcRenderer.on("reset-sizes", () => {
  _xtermManager._update();
});

ipcRenderer.on("workbench.terminal.theme.update", () => {
  _xtermManager._updateTheme();
});

ipcRenderer.on("workbench.terminal.dispose.all", () => {
  _xtermManager._disposeAll();
});
