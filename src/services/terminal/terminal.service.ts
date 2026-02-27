import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { FileLinksAddon } from "./addons/file-links.addon";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { ImageAddon } from "@xterm/addon-image";
import { WebglAddon } from "@xterm/addon-webgl";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { SearchAddon } from "@xterm/addon-search";
import { IPersistedTerminalTab, ITerminalTab } from "./terminal.types";
import { theme } from "../theme/theme.service";
import { explorer } from "../explorer/explorer.service";
import { open_editor_tab } from "../editor/editor.helper";

type terminal_service_listener = () => void;

class terminal_service {
  private tabs: ITerminalTab[] = [];
  private listeners: terminal_service_listener[] = [];
  private _active_id: string | null = null;
  private _data_unsub: (() => void) | null = null;
  private _exit_unsub: (() => void) | null = null;

  constructor() {
    this._data_unsub = window.pty.on_data((_, id: string, data: string) => {
      this.write(id, data);
    });

    this._exit_unsub = window.pty.on_exit((_, id: string) => {
      this.close_tab(id);
    });
  }

  subscribe(fn: terminal_service_listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  get_tabs(): ITerminalTab[] {
    return this.tabs;
  }

  get_active(): ITerminalTab | null {
    return this.tabs.find((t) => t.id === this._active_id) ?? null;
  }

  serialize_tabs(): IPersistedTerminalTab[] {
    return this.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      active: tab.active,
    }));
  }

  async create_tab(name?: string, history?: string): Promise<ITerminalTab> {
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const label = name ?? `Terminal ${this.tabs.length + 1}`;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block", // vs "bar" or "underline"
      fontFamily: "monospace",
      fontSize: 13,
      lineHeight: 1.5,
      letterSpacing: 0,
      fontWeight: "normal",
      fontWeightBold: "bold",

      scrollback: 10000, // VS Code default is 10000, not 5000
      scrollOnUserInput: true, // hold Alt for fast scroll
      fastScrollSensitivity: 5,
      smoothScrollDuration: 0, // 0 = instant, >0 = animated (ms)
      // mouseEvents: true,

      allowTransparency: true,
      allowProposedApi: true, // required by ImageAddon and some others

      convertEol: false,
      drawBoldTextInBrightColors: true, // VS Code default
      minimumContrastRatio: 1, // 1 = disabled; VS Code lets users set this
      rescaleOverlappingGlyphs: true, // prevents wide glyphs bleeding into next cell
      customGlyphs: true, // VS Code draws box/powerline chars itself, not via font

      overviewRuler: {
        width: 15,
      },

      theme: {
        background: theme.get_color("terminal.background"),
        foreground: theme.get_color("terminal.foreground"),
        cursor: theme.get_color("terminal.foreground"),
        // selectionBackground: theme.get_color("terminal.selectionBackground"),
        // selectionForeground: theme.get_color("terminal.selectionForeground"),
        // selectionInactiveBackground: theme.get_color(
        //   "terminal.inactiveSelectionBackground",
        // ),
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(
      new WebLinksAddon((_, url) => {
        window.shell.open_external(url);
      }),
    );
    terminal.loadAddon(new ClipboardAddon());

    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    terminal.loadAddon(webgl);

    terminal.loadAddon(new SearchAddon());
    terminal.loadAddon(new ImageAddon());
    terminal.loadAddon(new Unicode11Addon());
    terminal.loadAddon(
      new FileLinksAddon({
        resolvePath: (raw) => {
          if (raw.startsWith(".")) {
            return raw;
          }
          return raw;
        },
        onOpen: async (path) => {
          const stat = await explorer.actions.stat(path);
          if (stat.isFile) open_editor_tab(path);
          else {
            const tree = explorer.tree.tree;
            if (!tree) return;

            await tree.highlight(path);
          }
        },
      }),
    );

    const el = document.createElement("div");
    el.className = "terminal-instance-viewport";
    el.style.cssText = "width:100%;height:100%;display:none;";

    const tab: ITerminalTab = {
      id,
      name: label,
      terminal,
      fitAddon,
      active: false,
      el,
    };

    terminal.onData((data) => {
      window.pty.write(id, data);
    });

    terminal.onResize(({ cols, rows }) => {
      window.pty.resize(id, cols, rows);
    });

    await window.pty.create(id);

    if (history && history.length > 0) {
      requestAnimationFrame(() => {
        terminal.write(history + "\r\n");
      });
    }

    this.tabs.push(tab);
    this.set_active(id);

    return tab;
  }

  set_active(id: string) {
    const prev = this.get_active();
    if (prev) {
      prev.active = false;
      prev.el.style.display = "none";
    }

    this._active_id = id;
    const next = this.tabs.find((t) => t.id === id);
    if (next) {
      next.active = true;
      next.el.style.display = "block";
      requestAnimationFrame(() => {
        try {
          next.fitAddon.fit();
        } catch {}
        next.terminal.focus();
      });
    }

    this.notify();
  }

  close_tab(id: string) {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const tab = this.tabs[idx];
    tab.terminal.dispose();
    tab.el.remove();

    window.pty.kill(id);

    this.tabs.splice(idx, 1);

    if (this._active_id === id) {
      const next = this.tabs[Math.min(idx, this.tabs.length - 1)];
      this._active_id = next?.id ?? null;
      if (next) {
        next.active = true;
        next.el.style.display = "block";
        requestAnimationFrame(() => {
          try {
            next.fitAddon.fit();
          } catch {}
          next.terminal.focus();
        });
      }
    }

    this.notify();
  }

  rename_tab(id: string, name: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.name = name;
      this.notify();
    }
  }

  fit_active() {
    const active = this.get_active();
    if (active) {
      try {
        active.fitAddon.fit();
      } catch {}
    }
  }

  fit_all() {
    this.tabs.forEach((tab) => {
      try {
        tab.fitAddon.fit();
      } catch {}
    });
  }

  write(id: string, data: string) {
    const tab = this.tabs.find((t) => t.id === id);
    tab?.terminal.write(data);
  }

  on_data(id: string, handler: (data: string) => void) {
    const tab = this.tabs.find((t) => t.id === id);
    return tab?.terminal.onData(handler);
  }

  destroy() {
    this.tabs.forEach((tab) => {
      tab.terminal.dispose();
      tab.el.remove();
      window.pty.kill(tab.id);
    });

    this._data_unsub?.();
    this._exit_unsub?.();

    this.tabs = [];
    this._active_id = null;
    this.listeners = [];
  }
}

export const terminal = new terminal_service();
