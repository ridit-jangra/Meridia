import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";

export function Statusbar() {
  const left = h(
    "div",
    { class: "flex items-center min-w-0" },
    h("span", {}, "statusbar"),
    h(
      "div",
      { class: "flex items-center min-w-0" },
      //   ...(menus ? [Menubar({ menus }).el] : []),
    ),
  );

  const right = h("div", {
    class: "mr-30 no-drag flex items-center justify-center gap-1 min-w-0",
  });

  const content = h("div");
  content.textContent = "Hello popover";

  const el = h(
    "div",
    {
      class: cn(
        "h-[28px] text-[13px] text-statusbar-foreground w-full flex items-center justify-between px-2",
        "bg-statusbar-background",
        "drag-region",
      ),
    },
    left,
    right,
  );

  return el;
}
