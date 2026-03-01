import LogoSvg from "../../media/images/logo.svg?raw";
import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { titlebar_menu } from "./titlebar.menu";
import { Menubar } from "../components/menubar";
import { is_node_enabled_at_path_active_preset } from "../../layouts/layout.helper";
import { codicon, lucide } from "../components/icon";
import { shortcuts } from "../../../common/shortcut/shortcut.service";
import { Tooltip } from "../components/tooltip";
import { layout_engine } from "../../layouts/layout.engine";

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

  const update_layout_btns = () => {
    const left_active = is_node_enabled_at_path_active_preset([0]);
    const right_active = is_node_enabled_at_path_active_preset([2]);
    const bottom_active = is_node_enabled_at_path_active_preset([1, 1]);

    left_panel.innerHTML = "";
    right_panel.innerHTML = "";
    bottom_panel.innerHTML = "";

    if (left_active) left_panel.appendChild(codicon("layout-sidebar-left"));
    else left_panel.appendChild(codicon("layout-sidebar-left-off"));

    if (right_active) right_panel.appendChild(codicon("layout-sidebar-right"));
    else right_panel.appendChild(codicon("layout-sidebar-right-off"));

    if (bottom_active) bottom_panel.appendChild(codicon("layout-panel"));
    else bottom_panel.appendChild(codicon("layout-panel-off"));
  };

  const settings_btn = h(
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

  const left_panel = h("span", {
    class:
      "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
    on: {
      click: (e: Event) => {
        e.preventDefault();
        shortcuts.run_shortcut("layout.togglePrimarySideBar");
      },
    },
  });

  const bottom_panel = h("span", {
    class:
      "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
    on: {
      click: (e: Event) => {
        e.preventDefault();
        shortcuts.run_shortcut("layout.toggleBottomPanel");
      },
    },
  });

  const right_panel = h("span", {
    class:
      "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer p-1 rounded-md",
    on: {
      click: (e: Event) => {
        e.preventDefault();
        shortcuts.run_shortcut("layout.toggleSecondarySideBar");
      },
    },
  });

  const new_custom_agent = h(
    "span",
    {
      class:
        "flex items-center justify-center hover:bg-titlebar-item-hover-background/80 cursor-pointer mb-px p-1 rounded-md",
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
      class:
        "titlebar-inset titlebar-foreground opacity-80 no-drag flex items-center justify-center gap-1 min-w-0",
    },
    new_custom_agent,
    left_panel,
    bottom_panel,
    right_panel,
    settings_btn,
  );

  const content = h("div");
  content.textContent = "Hello popover";

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
    text: `Settings (${shortcuts.get_shortcut({ id: "openSettings" })?.keys})`,
    child: settings_btn,
  });

  layout_engine.subscribe(() => {
    update_layout_btns();
  });

  update_layout_btns();

  const el = h(
    "div",
    {
      class: cn(
        "h-[30px] w-full flex items-center justify-between px-2",
        "bg-titlebar-background",
        "drag-region",
      ),
    },
    left,
    right,
  );

  window.ipc.send("titlebar-ready");

  window.ipc.on("titlebar-insets", (_, inset: number) => {
    const el = document.querySelector(".titlebar-inset") as HTMLDivElement;
    if (!el) return;

    el.style.marginRight = `${inset}px`;
  });

  return el;
}
