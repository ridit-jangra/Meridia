import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { ITerminalTab } from "./terminal.types";
import { theme } from "../theme/theme.service";

type TerminalServiceListener = () => void;

class terminal_service {
  private tabs: ITerminalTab[] = [];
  private listeners: TerminalServiceListener[] = [];
  private _activeId: string | null = null;

  subscribe(fn: TerminalServiceListener) {
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
    return this.tabs.find((t) => t.id === this._activeId) ?? null;
  }

  create_tab(name?: string): ITerminalTab {
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const label = name ?? `Terminal ${this.tabs.length + 1}`;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Geist Mono", "Cascadia Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.5,
      letterSpacing: 0,
      theme: {
        background: theme.get_color("terminal.background"),
        foreground: theme.get_color("terminal.background"),
        cursor: theme.get_color("terminal.background"),
        selectionBackground: "rgba(255,255,255,0.15)",
        black: "#1a1a1a",
        red: "#f87171",
        green: "#86efac",
        yellow: "#fde68a",
        blue: "#93c5fd",
        magenta: "#c084fc",
        cyan: "#67e8f9",
        white: "#e0e0e0",
        brightBlack: "#404040",
        brightRed: "#fca5a5",
        brightGreen: "#a7f3d0",
        brightYellow: "#fef3c7",
        brightBlue: "#bfdbfe",
        brightMagenta: "#e9d5ff",
        brightCyan: "#a5f3fc",
        brightWhite: "#f5f5f5",
      },
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

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

    this._activeId = id;
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

    this.tabs.splice(idx, 1);

    if (this._activeId === id) {
      const next = this.tabs[Math.min(idx, this.tabs.length - 1)];
      this._activeId = next?.id ?? null;
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
    });
    this.tabs = [];
    this._activeId = null;
    this.listeners = [];
  }
}

export const terminal = new terminal_service();
