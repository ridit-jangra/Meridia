import { cn } from "../common/cn";
import { h } from "../common/h";
import { lucide } from "./icon";

export type MenuItem =
  | {
      type: "item";
      label: string;
      command_id?: string;
      sub_menu?: MenuItem[];
      disabled?: boolean;
    }
  | { type: "separator" };

export type Menu = {
  label: string;
  items: MenuItem[];
};

export function Menubar(opts: { menus: Menu[]; class?: string }) {
  let openMenuIndex: number | null = null;

  const triggers: HTMLDivElement[] = [];
  const panels: HTMLDivElement[] = [];
  const floatingPanels: HTMLDivElement[] = [];

  const closeFloating = () => {
    floatingPanels.forEach((p) => p.remove());
    floatingPanels.length = 0;
  };

  const closeAll = () => {
    openMenuIndex = null;
    closeFloating();

    panels.forEach((p) => (p.style.display = "none"));
    triggers.forEach((t) => {
      t.classList.remove(
        "bg-titlebar-item-active-background",
        "text-titlebar-item-active-foreground",
      );
    });
  };

  const openMenu = (index: number) => {
    if (openMenuIndex === index) return;

    closeAll();
    openMenuIndex = index;

    const trigger = triggers[index];
    const panel = panels[index];

    const r = trigger.getBoundingClientRect();
    panel.style.left = `${r.left}px`;
    panel.style.top = `${r.bottom + 2}px`;
    panel.style.minWidth = `${Math.max(180, r.width)}px`;
    panel.style.display = "block";

    trigger.classList.add(
      "bg-titlebar-item-active-background",
      "text-titlebar-item-active-foreground",
    );
  };

  const root = h("div", {
    class: cn("p-2 flex items-center gap-1 select-none no-drag", opts.class),
  });

  const buildPanel = (items: MenuItem[]) => {
    const panel = h("div", {
      class: cn(
        "fixed z-[9999] hidden w-85",
        "bg-panel-background text-panel-foreground p-1",
        "border border-workbench-border rounded-[7px] overflow-hidden",
        "shadow-sm",
      ),
    });

    const openSubmenu = (row: HTMLElement, sub: MenuItem[]) => {
      closeFloating();

      const subPanel = buildPanel(sub);
      subPanel.style.display = "block";

      const rr = row.getBoundingClientRect();
      subPanel.style.left = `${rr.right - 2}px`;
      subPanel.style.top = `${rr.top}px`;
      subPanel.style.minWidth = `${Math.max(180, rr.width)}px`;

      document.body.appendChild(subPanel);
      floatingPanels.push(subPanel);
    };

    items.forEach((item) => {
      if (item.type === "separator") {
        panel.appendChild(
          h("div", { class: "my-1 border-t border-workbench-border" }),
        );
        return;
      }

      const row = h(
        "div",
        {
          class: cn(
            "flex items-center justify-between px-3 py-1.5 text-[13px] rounded-[7px]",
            item.disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
            "hover:bg-titlebar-item-hover-background hover:text-titlebar-item-hover-foreground",
            "active:bg-titlebar-item-active-background",
          ),
          on: {
            mouseenter: () => {
              if (item.sub_menu && item.sub_menu.length > 0) {
                openSubmenu(row, item.sub_menu);
              } else {
                // closeFloating();
              }
            },
            mousedown: (e: Event) => {
              e.preventDefault();
              if (item.disabled) return;
              if (item.sub_menu && item.sub_menu.length > 0) return;
              closeAll();
            },
          },
        },
        h("span", { class: "truncate" }, item.label),
        h(
          "div",
          { class: "flex items-center gap-2 text-[12px] opacity-70" },
          item.command_id ? h("span", {}, item.command_id) : "",
          item.sub_menu && item.sub_menu.length > 0
            ? h("span", {}, lucide("chevron-right"))
            : "",
        ),
      );

      panel.appendChild(row);
    });

    return panel;
  };

  opts.menus.forEach((menu, index) => {
    const trigger = h(
      "div",
      {
        class: cn(
          "px-2.5 py-1 text-[13px] rounded-[7px] cursor-pointer",
          "text-titlebar-foreground",
          "hover:bg-titlebar-item-hover-background/80 hover:text-titlebar-item-hover-foreground",
        ),
      },
      menu.label,
    );

    const panel = buildPanel(menu.items);
    panels.push(panel);
    triggers.push(trigger);

    trigger.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (openMenuIndex === index) closeAll();
      else openMenu(index);
    });

    trigger.addEventListener("mouseenter", () => {
      if (openMenuIndex !== null) openMenu(index);
    });

    document.body.appendChild(panel);
    root.appendChild(trigger);
  });

  const onDocDown = (e: MouseEvent) => {
    const t = e.target as Node;
    const clickedInsideTop = root.contains(t);
    const clickedInsideAnyPanel =
      panels.some((p) => p.contains(t)) ||
      floatingPanels.some((p) => p.contains(t));

    if (!clickedInsideTop && !clickedInsideAnyPanel) closeAll();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeAll();
  };

  document.addEventListener("mousedown", onDocDown, true);
  window.addEventListener("keydown", onKey);

  return {
    el: root,
    close: closeAll,
    destroy() {
      closeAll();
      document.removeEventListener("mousedown", onDocDown, true);
      window.removeEventListener("keydown", onKey);
      panels.forEach((p) => p.remove());
      root.remove();
    },
  };
}
