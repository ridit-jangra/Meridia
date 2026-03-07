import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { Popover, TPopover } from "./popover";
import { lucide } from "./icon";

export type DropdownItem =
  | {
      type?: "item";
      label: string;
      disabled?: boolean;
      onClick?: () => void;
      tooltip?: string;
      children?: DropdownItem[];
      key?: string;
    }
  | { type: "separator" };

export function Dropdown(opts: {
  items: DropdownItem[];
  anchor?: HTMLElement;
  anchorClass?: string;
  placement?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  offset?: number;
  class?: string;
  menuClass?: string;
}) {
  const anchor =
    opts.anchor ??
    (h(
      "span",
      {
        class: cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-[6px] cursor-pointer text-muted-foreground hover:text-workbench-foreground hover:bg-statusbar-item-hover-background",
          opts.anchorClass,
        ),
        title: "More",
      },
      lucide("ellipsis"),
    ) as HTMLElement);

  type OpenEntry = {
    pop: TPopover;
    anchorRow: HTMLElement;
    parentMenu: HTMLElement;
  };
  const openEntries: OpenEntry[] = [];

  const closeAll = () => {
    for (let i = openEntries.length - 1; i >= 0; i--) {
      openEntries[i].pop.close();
    }
    openEntries.length = 0;
  };

  const closeSiblingsIn = (parentMenu: HTMLElement) => {
    for (let i = openEntries.length - 1; i >= 0; i--) {
      const entry = openEntries[i];
      if (entry.parentMenu === parentMenu) {
        const contentEl = entry.pop.contentEl;
        for (let j = openEntries.length - 1; j >= 0; j--) {
          if (contentEl.contains(openEntries[j].anchorRow)) {
            openEntries[j].pop.close();
            openEntries.splice(j, 1);
          }
        }
        entry.pop.close();
        openEntries.splice(i, 1);
      }
    }
  };

  const buildMenu = (items: DropdownItem[]): HTMLElement => {
    const menu = h("div", {
      class: cn(
        "min-w-[220px] bg-context-menu-background text-context-menu-foreground rounded-[7px] shadow-sm",
        opts.menuClass,
      ),
    });

    items.forEach((it) => {
      if (it.type === "separator") {
        menu.appendChild(
          h("div", { class: "my-1 mx-1 border-t border-workbench-border" }),
        );
        return;
      }

      const hasChildren = it.children && it.children.length > 0;

      const row = h(
        "div",
        {
          class: cn(
            "flex items-center justify-between gap-2 px-2 py-1.5 text-[13px] rounded-[7px]",
            it.disabled
              ? "opacity-50 pointer-events-none"
              : "cursor-pointer hover:bg-context-menu-item-hover-background hover:text-context-menu-item-hover-foreground",
          ),
          tooltip: { text: it.tooltip, position: "right" },
        },
        h("span", { class: "truncate" }, it.label),
        hasChildren
          ? h(
              "span",
              { class: "shrink-0 opacity-60 text-[14px]" },
              lucide("chevron-right"),
            )
          : h("span", { class: "shrink-0 opacity-60 text-[14px]" }, it.key),
      );

      if (hasChildren) {
        const childMenuEl = buildMenu(it.children!);

        row.addEventListener("mouseenter", () => {
          closeSiblingsIn(menu);

          const childPop = Popover(row, childMenuEl, {
            trigger: "manual",
            placement: "right",
            align: "start",
            offset: 4,
            forcePlacement: true,
            closeOnOutsideClick: false,
            closeOnEsc: false,
          });

          childPop.open();
          openEntries.push({ pop: childPop, anchorRow: row, parentMenu: menu });
        });

        row.addEventListener("mousedown", (e) => {
          e.preventDefault();
        });
      } else {
        row.addEventListener("mouseenter", () => {
          closeSiblingsIn(menu);
        });

        row.addEventListener("mousedown", (e) => {
          e.preventDefault();
          if (it.disabled) return;
          it.onClick?.();
          closeAll();
          pop.close();
        });
      }

      menu.appendChild(row);
    });

    return menu;
  };

  const menuEl = buildMenu(opts.items);

  const pop = Popover(anchor, menuEl, {
    trigger: "click",
    placement: opts.placement ?? "bottom",
    align: opts.align ?? "start",
    offset: opts.offset ?? 6,
    closeOnOutsideClick: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) closeAll();
    },
  });

  return {
    el: anchor,
    open: () => pop.open(),
    close: () => pop.close(),
    toggle: () => pop.toggle(),
    dispose: () => {
      closeAll();
      pop.dispose();
    },
  };
}
