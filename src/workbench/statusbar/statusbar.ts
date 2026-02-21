import LogoSvg from "../../assets/images/logo.svg?raw";
import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { set_command_palette_open } from "../../services/state/slices/layout.slice";
import { store } from "../../services/state/store";

export function Statusbar() {
  const logo = h("div", {
    class: "w-6 mr-3.5 [&_path]:fill-titlebar-foreground",
  });
  logo.innerHTML = LogoSvg;

  const left = h(
    "div",
    { class: "flex items-center min-w-0" },
    logo,
    h(
      "div",
      { class: "flex items-center min-w-0" },
      //   ...(menus ? [Menubar({ menus }).el] : []),
    ),
  );

  const status_item = h(
    "span",
    {
      class:
        "text-sm text-titlebar-foreground hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 px-2 rounded-md",
      on: {
        click: () => {
          store.dispatch(set_command_palette_open(true));
        },
      },
    },
    "MeridiaV2",
  );

  const center = h(
    "div",
    {
      class: "flex-1 flex items-center justify-center min-w-0 px-2 no-drag",
    },
    status_item,
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
        "h-[28px] w-full flex items-center justify-between px-2",
        "bg-titlebar-background border-b border-workbench-border",
        "drag-region",
      ),
    },
    left,
    center,
    right,
  );

  return el;
}
