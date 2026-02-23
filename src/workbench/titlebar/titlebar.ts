import LogoSvg from "../../assets/images/logo.svg?raw";
import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { shortcuts } from "../../services/shortcut/shortcut.service";
import { set_command_palette_open } from "../../services/state/slices/layout.slice";
import { store } from "../../services/state/store";
import { Popover, Tooltip } from "../../ui";
import { codicon, lucide } from "../../ui/components/icon";
import { Menubar } from "../../ui/components/menubar";
import { titlebar_menu } from "./titlebar.menu";

export function Titlebar() {
  const menus = titlebar_menu;

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
      ...(menus ? [Menubar({ menus }).el] : []),
    ),
  );

  const status_item = h(
    "span",
    {
      class:
        "text-sm text-titlebar-foreground hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 px-2 rounded-md no-drag",
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
      class:
        "flex-1 flex items-center justify-center min-w-0 w-min px-2 drag-region",
    },
    status_item,
  );

  const layout_btn = h(
    "span",
    {
      class:
        "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
    },
    lucide(
      "settings",
      18,
      "[&_path]:stroke-titlebar-foreground [&_circle]:stroke-titlebar-foreground",
    ),
  );

  const left_panel = h(
    "span",
    {
      class:
        "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
      on: {
        click: (e: Event) => {
          e.preventDefault();
          shortcuts.run_shortcut("layout.togglePrimarySideBar");
        },
      },
    },
    codicon("layout-sidebar-left", "text-titlebar-foreground"),
  );

  const bottom_panel = h(
    "span",
    {
      class:
        "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
      on: {
        click: (e: Event) => {
          e.preventDefault();
          shortcuts.run_shortcut("layout.toggleBottomPanel");
        },
      },
    },
    codicon("layout-panel", "text-titlebar-foreground"),
  );

  const right_panel = h(
    "span",
    {
      class:
        "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
      on: {
        click: (e: Event) => {
          e.preventDefault();
          shortcuts.run_shortcut("layout.toggleSecondarySideBar");
        },
      },
    },
    codicon("layout-sidebar-right-off", "text-titlebar-foreground"),
  );

  const new_custom_agent = h(
    "span",
    {
      class:
        "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
    },
    lucide(
      "plus",
      18,
      "[&_path]:stroke-titlebar-foreground [&_circle]:stroke-titlebar-foreground",
    ),
  );

  const right = h(
    "div",
    {
      class: "mr-30 no-drag flex items-center justify-center gap-1 min-w-0",
    },
    new_custom_agent,
    left_panel,
    bottom_panel,
    right_panel,
    layout_btn,
  );

  const content = h("div");
  content.textContent = "Hello popover";

  Popover(layout_btn, content, {
    trigger: "click",
    placement: "bottom",
    align: "start",
    closeOnOutsideClick: true,
    closeOnEsc: true,
  });

  Tooltip({
    text: `New Custom Agent`,
    child: new_custom_agent,
  });

  Tooltip({
    text: `Toggle Primary Side Bar (${shortcuts.get_shortcut({ id: "togglePrimarySideBar" })?.keys})`,
    child: left_panel,
  });

  Tooltip({
    text: `Toggle Panel (${shortcuts.get_shortcut({ id: "toggleBottomPanel" })?.keys})`,
    child: bottom_panel,
  });

  Tooltip({
    text: `Toggle Secondary Side Bar (${shortcuts.get_shortcut({ id: "toggleSecondarySideBar" })?.keys})`,
    child: right_panel,
  });

  Tooltip({
    text: `Change Layout`,
    child: layout_btn,
  });

  Tooltip({
    text: `Open Command Palette (${shortcuts.get_shortcut({ id: "commandPalette" })?.keys})`,
    child: status_item,
  });

  const el = h(
    "div",
    {
      class: cn(
        "h-[38px] w-full flex items-center justify-between px-2",
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
