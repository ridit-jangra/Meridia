import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";
import { lucide } from "./icon";

export type ContextMenuItem =
  | {
      type: "item";
      label: string;
      command_id?: string;
      disabled?: boolean;
      onClick?: () => void;
    }
  | { type: "separator" }
  | {
      type: "submenu";
      label: string;
      items: ContextMenuItem[];
      disabled?: boolean;
    };

export function ContextMenu(opts?: {
  class?: string;
  menuClass?: string;
  widthClass?: string;
}) {
  const floating: HTMLDivElement[] = [];
  let closeTimer: number | null = null;

  const cancelClose = () => {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const closeFloating = () => {
    cancelClose();
    floating.forEach((p) => p.remove());
    floating.length = 0;
  };

  const closeAll = () => {
    closeFloating();
    root.style.display = "none";
  };

  const root = h("div", {
    class: cn(
      "fixed z-[10000] hidden",
      opts?.menuClass
        ? ""
        : "bg-panel-background text-panel-foreground p-0.5 border border-workbench-border rounded-[7px] shadow-sm",
      opts?.menuClass,
    ),
  }) as HTMLDivElement;

  const content = h("div", {
    class: cn("min-w-[260px]", opts?.widthClass),
  });

  root.appendChild(content);
  document.body.appendChild(root);

  const placeAt = (x: number, y: number, el: HTMLDivElement) => {
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.display = "block";

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(6, Math.min(x, vw - r.width - 6));
    const top = Math.max(6, Math.min(y, vh - r.height - 6));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  const buildPanel = (items: ContextMenuItem[], floatingPanel = false) => {
    const panel = h("div", {
      class: cn(
        "fixed z-[10001] hidden min-w-[260px]",
        "bg-panel-background text-panel-foreground p-1",
        "border border-workbench-border rounded-[7px] overflow-hidden shadow-sm",
        opts?.class,
      ),
    }) as HTMLDivElement;

    if (floatingPanel) {
      panel.addEventListener("mouseenter", cancelClose);
      //   panel.addEventListener("mouseleave", () => scheduleClose());
    }

    const openSub = (row: HTMLElement, subItems: ContextMenuItem[]) => {
      closeFloating();

      const sub = buildPanel(subItems, true);
      sub.style.display = "block";

      const rr = row.getBoundingClientRect();
      sub.style.left = `${rr.right + 6}px`;
      sub.style.top = `${rr.top}px`;

      document.body.appendChild(sub);
      floating.push(sub);
    };

    panel.innerHTML = "";

    items.forEach((it) => {
      if (it.type === "separator") {
        panel.appendChild(
          h("div", { class: "my-1 border-t border-workbench-border" }),
        );
        return;
      }

      if (it.type === "submenu") {
        const row = h(
          "div",
          {
            class: cn(
              "flex items-center justify-between px-7 py-1.5 text-[13px] rounded-[7px]",
              it.disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
              "hover:bg-titlebar-item-hover-background hover:text-titlebar-item-hover-foreground",
              "active:bg-titlebar-item-active-background",
            ),
            on: {
              mouseenter: () => {
                cancelClose();
                if (!it.disabled) openSub(row, it.items);
              },
              //   mouseleave: () => scheduleClose(),
              mousedown: (e: Event) => {
                e.preventDefault();
              },
            },
          },
          h("span", { class: "truncate" }, it.label),
          h("span", { class: "opacity-70" }, lucide("chevron-right")),
        );
        panel.appendChild(row);
        return;
      }

      const row = h(
        "div",
        {
          class: cn(
            "flex items-center justify-between px-7 py-1.5 text-[13px] rounded-[7px]",
            it.disabled ? "opacity-50 pointer-events-none" : "cursor-pointer",
            "hover:bg-titlebar-item-hover-background hover:text-titlebar-item-hover-foreground",
            "active:bg-titlebar-item-active-background",
          ),
          on: {
            mouseenter: cancelClose,
            mousedown: (e: Event) => {
              e.preventDefault();
              if (it.disabled) return;
              it.onClick?.();
              closeAll();
            },
          },
        },
        h("span", { class: "truncate" }, it.label),
        h(
          "div",
          { class: "text-[12px] opacity-70" },
          it.command_id ? it.command_id : "",
        ),
      );

      panel.appendChild(row);
    });

    return panel;
  };

  let currentItems: ContextMenuItem[] = [];

  const render = () => {
    content.innerHTML = "";
    const main = buildPanel(currentItems, false);
    main.style.position = "static";
    main.style.display = "block";
    main.className = cn(
      "p-0 border-0 shadow-none bg-transparent text-inherit",
      main.className,
    );
    content.appendChild(main);
  };

  const onDocDown = (e: MouseEvent) => {
    const t = e.target as Node;
    const insideMain = root.contains(t);
    const insideFloating = floating.some((p) => p.contains(t));
    if (!insideMain && !insideFloating) closeAll();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeAll();
  };

  document.addEventListener("mousedown", onDocDown, true);
  window.addEventListener("keydown", onKey);

  const openAt = (x: number, y: number, items: ContextMenuItem[]) => {
    currentItems = items;
    closeFloating();
    render();
    placeAt(x, y, root);
  };

  const bind = (target: HTMLElement, getItems: () => ContextMenuItem[]) => {
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      const items = getItems();
      if (!items || items.length === 0) return;
      openAt(e.clientX, e.clientY, items);
    };

    target.addEventListener("contextmenu", onCtx);

    return () => target.removeEventListener("contextmenu", onCtx);
  };

  return {
    el: root,
    openAt,
    close: closeAll,
    bind,
    destroy() {
      closeAll();
      document.removeEventListener("mousedown", onDocDown, true);
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
