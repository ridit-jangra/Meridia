import "@xterm/xterm/css/xterm.css";
import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";
import { lucide } from "../icon";
import { terminal } from "../../../services/terminal/terminal.service";
import { ITerminalTab } from "../../../services/terminal/terminal.types";
import { ScrollArea } from "../scroll-area";
import { IWorkspace } from "../../../../shared/types/workspace.types";
import { terminal_events } from "../../../events/terminal.events";

export function TerminalPanel(opts?: { class?: string }) {
  let unsub: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let is_initializing = true;

  let saving = false;
  let queued_save: ReturnType<typeof terminal.serialize_tabs> | null = null;

  const save_tabs_to_workspace = async (
    tabs: ReturnType<typeof terminal.serialize_tabs>,
  ) => {
    if (saving) {
      queued_save = tabs;
      return;
    }

    saving = true;

    try {
      const current_workspace_path =
        await window.workspace.get_current_workspace_path();
      if (!current_workspace_path) return;

      const current_workspace = await window.workspace.get_workspace(
        current_workspace_path,
      );
      if (!current_workspace) return;

      const updates: Partial<IWorkspace> = { terminal_tabs: tabs };
      await window.workspace.update_workspace(current_workspace_path, updates);
    } finally {
      saving = false;

      if (queued_save) {
        const next = queued_save;
        queued_save = null;
        await save_tabs_to_workspace(next);
      }
    }
  };

  let save_timer: ReturnType<typeof setTimeout> | null = null;
  const schedule_save = () => {
    if (is_initializing) return;
    if (save_timer) clearTimeout(save_timer);
    save_timer = setTimeout(() => {
      save_timer = null;
      void save_tabs_to_workspace(terminal.serialize_tabs());
    }, 1000);
  };

  const scrollArea = ScrollArea({
    class: cn("shrink-0", "z-5", "bg-editor-tab-background"),
    innerClass:
      "flex flex-col items-stretch border-l border-workbench-border w-30",
    dir: "vertical",
  });

  const tabBar = scrollArea.inner;

  const addBtn = h("button", {});

  const add = async () => {
    const tab = await terminal.create_tab();
    mountTab(tab);
    renderTabs();
    schedule_save();
  };

  addBtn.addEventListener("click", async () => {
    await add();
  });

  terminal_events.on("newTab", async () => {
    await add();
  });

  tabBar.appendChild(addBtn);

  const viewport = h("div", {
    class: "relative flex-1 min-h-0 min-w-0 overflow-hidden",
  });

  const root = h("div", {
    class: cn(
      "flex flex-row h-full min-h-0 min-w-0 pl-2 pb-2",
      "bg-terminal-background",
      "text-terminal-foreground",
      opts?.class,
    ),
  });

  root.appendChild(viewport);
  root.appendChild(scrollArea.inner);

  const mountTab = (tab: ITerminalTab) => {
    if (viewport.contains(tab.el)) return;

    tab.el.style.cssText =
      "position:absolute;inset:0;display:none;padding:4px 4px 0 4px;";
    viewport.appendChild(tab.el);

    if (!tab.terminal.element) {
      tab.terminal.open(tab.el);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            tab.fitAddon.fit();
          } catch {}
        });
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
            "absolute top-1 right-4 [&_svg]:w-5 [&_svg]:h-5 close",
            "flex items-center justify-center rounded-[3px]",
            "opacity-0 group-hover:opacity-60 hover:!opacity-100",
            "hover:bg-button-secondary-hover-background/60",
          ),
        },
        lucide("x", 9),
      );

      closeBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        terminal.close_tab(tab.id);
        renderTabs();
        schedule_save();
      });

      const label = h(
        "span",
        {
          class: cn(
            "text-[10px] truncate leading-none",
            "origin-center whitespace-nowrap truncate flex items-center gap-1 text-[12px] min-w-0",
          ),
        },
        lucide("terminal"),
      );

      const pill = h(
        "div",
        {
          class: cn(
            "group relative flex items-center justify-center gap-1",
            "w-full py-1.5 shrink-0",
            "text-[12px] cursor-pointer select-none",
            isActive
              ? cn("bg-button-secondary-hover-background/60 text-foreground")
              : cn(
                  "text-foreground/50 hover:text-foreground/80",
                  "hover:bg-button-secondary-hover-background/30",
                ),
          ),
        },
        label,
        closeBtn,
      );

      pill.addEventListener("mousedown", (e) => {
        if ((e.target as HTMLElement).closest("span[class='close']")) return;
        e.preventDefault();
        terminal.set_active(tab.id);
        renderTabs();
        schedule_save();
      });

      tabBar.insertBefore(pill, addBtn);
    });
  };

  resizeObserver = new ResizeObserver(() => {
    terminal.fit_active();
  });

  resizeObserver.observe(viewport);

  unsub = terminal.subscribe(() => {
    renderTabs();
  });

  const init = async () => {
    try {
      if (terminal.get_tabs().length > 0) {
        terminal.get_tabs().forEach((tab) => mountTab(tab));
        renderTabs();
        return;
      }

      const current_workspace_path =
        await window.workspace.get_current_workspace_path();

      if (current_workspace_path) {
        const current_workspace = await window.workspace.get_workspace(
          current_workspace_path,
        );

        const persisted = current_workspace?.terminal_tabs;

        if (persisted && persisted.length > 0) {
          for (const saved of persisted) {
            const tab = await terminal.create_tab(saved.name);
            mountTab(tab);
          }

          const active_saved = persisted.find((t) => t.active);
          const active_tab = terminal
            .get_tabs()
            .find((t) => t.name === active_saved?.name);
          if (active_tab) {
            terminal.set_active(active_tab.id);
          }

          renderTabs();
          return;
        }
      }

      terminal.get_tabs().forEach((tab) => mountTab(tab));
      renderTabs();
    } finally {
      is_initializing = false;
    }
  };

  void init();

  const new_terminal = async () => {
    const tab = await terminal.create_tab();
    mountTab(tab);
    renderTabs();
    schedule_save();
    return tab;
  };

  return {
    el: root,
    new_terminal,
    destroy() {
      unsub?.();
      resizeObserver?.disconnect();
      scrollArea.destroy();
      if (save_timer) clearTimeout(save_timer);
      root.remove();
    },
  };
}
