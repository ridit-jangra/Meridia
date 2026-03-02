import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { Popover } from "./popover";
import { lucide } from "./icon";
import { Tooltip } from "./tooltip";

export type DropdownItem = {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
};

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

  const menu = h("div", {
    class: cn(
      "min-w-[220px] bg-context-menu-background text-context-menu-foreground rounded-[7px] shadow-sm",
      opts.menuClass,
    ),
  });

  opts.items.forEach((it) => {
    const row = h(
      "div",
      {
        class: cn(
          "flex items-center px-2 py-1.5 text-[13px] rounded-[7px] truncate",
          it.disabled
            ? "opacity-50 pointer-events-none"
            : "cursor-pointer hover:bg-context-menu-item-hover-background hover:text-context-menu-item-hover-foreground",
        ),
        on: {
          mousedown: (e: Event) => {
            e.preventDefault();
            if (it.disabled) return;
            it.onClick?.();
            pop.close();
          },
        },
      },
      it.label,
    );

    if (it.tooltip) {
      Tooltip({
        child: row,
        text: it.tooltip,
      });
    }

    menu.appendChild(row);
  });

  const pop = Popover(anchor, menu, {
    trigger: "click",
    placement: opts.placement ?? "bottom",
    align: opts.align ?? "start",
    offset: opts.offset ?? 6,
    closeOnOutsideClick: true,
    className: opts.class,
  });

  return {
    el: anchor,
    open: () => pop.open(),
    close: () => pop.close(),
    toggle: () => pop.toggle(),
    dispose: () => pop.dispose(),
  };
}
