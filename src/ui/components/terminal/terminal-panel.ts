import "@xterm/xterm/css/xterm.css";
import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";
import { lucide } from "../icon";
import { terminal } from "../../../services/terminal/terminal.service";
import { ITerminalTab } from "../../../services/terminal/terminal.types";

export function TerminalPanel(opts?: { class?: string }) {
  let unsub: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const tabBar = h("div", {
    class: cn(
      "flex items-center gap-0.5 px-1 shrink-0",
      "h-8 overflow-x-auto scrollbar-hide",
      "border-b border-workbench-border",
      "bg-editor-tab-background",
    ),
  });

  const addBtn = h(
    "button",
    {
      class: cn(
        "ml-1 shrink-0 flex items-center justify-center",
        "h-6 w-6 rounded-[5px] cursor-pointer",
        "text-foreground/50 hover:text-foreground hover:bg-button-secondary-hover-background/40",
        "transition-colors",
      ),
      attrs: { type: "button", title: "New Terminal" },
    },
    lucide("plus", 14),
  );

  addBtn.addEventListener("click", () => {
    const tab = terminal.create_tab();
    mountTab(tab);
    renderTabs();
  });

  tabBar.appendChild(addBtn);

  const viewport = h("div", {
    class: "relative flex-1 min-h-0 min-w-0 overflow-hidden",
  });

  const root = h("div", {
    class: cn(
      "flex flex-col h-full min-h-0 min-w-0",
      "bg-[var(--terminal-background,#0d0d0d)]",
      "text-[var(--terminal-foreground,#e0e0e0)]",
      opts?.class,
    ),
  });

  root.appendChild(tabBar);
  root.appendChild(viewport);

  const mountTab = (tab: ITerminalTab) => {
    tab.el.style.cssText =
      "position:absolute;inset:0;display:none;padding:4px 4px 0 4px;";
    viewport.appendChild(tab.el);

    if (!tab.terminal.element) {
      tab.terminal.open(tab.el);
      requestAnimationFrame(() => {
        try {
          tab.fitAddon.fit();
        } catch {}
      });
    }
  };

  const renderTabs = () => {
    const tabs = terminal.get_tabs();

    Array.from(tabBar.children).forEach((c) => {
      if (c !== addBtn) c.remove();
    });

    tabs.forEach((tab) => {
      const isActive = tab.active;

      const closeBtn = h(
        "span",
        {
          class: cn(
            "flex items-center justify-center ml-1 rounded-[3px]",
            "opacity-0 group-hover:opacity-60 hover:!opacity-100",
            "hover:bg-button-secondary-hover-background/60",
            "transition-opacity w-4 h-4 shrink-0",
          ),
          attrs: { title: "Close terminal" },
        },
        lucide("x", 11),
      );

      closeBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        terminal.close_tab(tab.id);
        renderTabs();
      });

      const pill = h(
        "div",
        {
          class: cn(
            "group flex items-center gap-1 px-2 h-6 shrink-0 max-w-[180px]",
            "text-[12px] rounded-[5px] cursor-pointer select-none",
            "transition-colors",
            isActive
              ? "bg-button-secondary-hover-background/60 text-foreground"
              : "text-foreground/50 hover:text-foreground/80 hover:bg-button-secondary-hover-background/30",
          ),
        },
        lucide("terminal", 12),
        h("span", { class: "truncate max-w-[100px]" }, tab.name),
        closeBtn,
      );

      pill.addEventListener("mousedown", (e) => {
        if ((e.target as HTMLElement).closest("span[title='Close terminal']"))
          return;
        e.preventDefault();
        terminal.set_active(tab.id);
        renderTabs();
      });

      tabBar.insertBefore(pill, addBtn);
    });

    emptyState.style.display = tabs.length === 0 ? "flex" : "none";
  };

  const emptyState = h(
    "div",
    {
      class: cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3",
        "text-foreground/30 select-none pointer-events-none",
      ),
    },
    lucide("terminal", 28),
    h("span", { class: "text-[13px]" }, "No terminals open"),
    h(
      "span",
      { class: "text-[11px] opacity-60" },
      "Click + to open a new terminal",
    ),
  );

  viewport.appendChild(emptyState);

  resizeObserver = new ResizeObserver(() => {
    terminal.fit_active();
  });

  resizeObserver.observe(viewport);

  unsub = terminal.subscribe(() => {
    renderTabs();
  });

  terminal.get_tabs().forEach((tab) => mountTab(tab));
  renderTabs();

  const new_terminal = () => {
    const tab = terminal.create_tab();
    mountTab(tab);
    renderTabs();
    return tab;
  };

  return {
    el: root,
    new_terminal,
    destroy() {
      unsub?.();
      resizeObserver?.disconnect();
      root.remove();
    },
  };
}
