import LogoSvg from "../../media/images/logo.svg?raw";
import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { titlebar_menu } from "./titlebar.menu";
import { Menubar } from "../components/menubar";
import { is_node_enabled_at_path_active_preset } from "../../layouts/layout.helper";
import { codicon, lucide } from "../components/icon";
import { shortcuts } from "../../../common/shortcut/shortcut.service";
import { layout_engine } from "../../layouts/layout.engine";
import { Button } from "../components/button";

export function Titlebar() {
  const menus = titlebar_menu;
  const is_mac = (window as any).platform.get_platform() === "darwin";

  const logo = h("div", {
    class: "w-6 mr-3.5 [&_path]:fill-titlebar-foreground opacity-100",
  });
  logo.innerHTML = LogoSvg;

  const left_panel = Button(codicon("layout-sidebar-left"), {
    variant: "ghost",
    size: "icon",
    tooltip: {
      text: `Toggle Primary Side Bar (${shortcuts.get_shortcut({ id: "togglePrimarySideBar" })?.keys})`,
    },
    onClick: (e) => {
      e.preventDefault();
      shortcuts.run_shortcut("layout.togglePrimarySideBar");
    },
  });

  const bottom_panel = Button(codicon("layout-panel"), {
    variant: "ghost",
    size: "icon",
    tooltip: {
      text: `Toggle Panel (${shortcuts.get_shortcut({ id: "toggleBottomPanel" })?.keys})`,
    },
    onClick: (e) => {
      e.preventDefault();
      shortcuts.run_shortcut("layout.toggleBottomPanel");
    },
  });

  const right_panel = Button(codicon("layout-sidebar-right"), {
    variant: "ghost",
    size: "icon",
    tooltip: {
      text: `Toggle Secondary Side Bar (${shortcuts.get_shortcut({ id: "toggleSecondarySideBar" })?.keys})`,
    },
    onClick: (e) => {
      e.preventDefault();
      shortcuts.run_shortcut("layout.toggleSecondarySideBar");
    },
  });

  const update_layout_btns = () => {
    const left_active = is_node_enabled_at_path_active_preset([0]);
    const right_active = is_node_enabled_at_path_active_preset([2]);
    const bottom_active = is_node_enabled_at_path_active_preset([1, 1]);

    const lSpan = left_panel.querySelector("span")!;
    const rSpan = right_panel.querySelector("span")!;
    const bSpan = bottom_panel.querySelector("span")!;

    lSpan.innerHTML = "";
    rSpan.innerHTML = "";
    bSpan.innerHTML = "";

    lSpan.appendChild(
      codicon(left_active ? "layout-sidebar-left" : "layout-sidebar-left-off"),
    );
    rSpan.appendChild(
      codicon(
        right_active ? "layout-sidebar-right" : "layout-sidebar-right-off",
      ),
    );
    bSpan.appendChild(
      codicon(bottom_active ? "layout-panel" : "layout-panel-off"),
    );
  };

  const settings_btn = Button(
    lucide(
      "settings",
      18,
      "[&_path]:stroke-titlebar-foreground [&_circle]:stroke-titlebar-foreground",
    ),
    {
      variant: "ghost",
      size: "icon",
      tooltip: {
        text: `Settings (${shortcuts.get_shortcut({ id: "openSettings" })?.keys})`,
      },
      onClick: () => shortcuts.run_shortcut("openSettings"),
    },
  );

  const new_custom_agent = Button(
    lucide("plus", 18, "[&_path]:stroke-titlebar-foreground"),
    {
      variant: "ghost",
      size: "icon",
      tooltip: {
        text: "New Custom Agent",
      },
    },
  );

  const right = h(
    "div",
    {
      class:
        "titlebar-inset titlebar-foreground h-full opacity-80 no-drag flex items-center",
    },
    settings_btn,
    new_custom_agent,
  );

  layout_engine.subscribe(() => {
    update_layout_btns();
  });

  update_layout_btns();

  const left = h(
    "div",
    {
      class: "flex mac-inset opacity-60 h-full no-drag items-center",
    },
    !is_mac && logo,
    h(
      "div",
      { class: "flex items-center pr-1.5 border-r border-workbench-border" },
      left_panel,
      bottom_panel,
      right_panel,
    ),

    !is_mac &&
      h(
        "div",
        { class: "h-full pl-1.5" },
        ...(menus ? [Menubar({ menus }).el] : []),
      ),
  );

  const el = h(
    "div",
    {
      class: cn(
        "h-[30px] w-full flex items-center justify-between px-2",
        "bg-titlebar-background",
        "drag-region",
        !is_mac && "border-r border-white/30",
      ),
    },
    left,
    right,
  );

  window.ipc.send("titlebar-ready");

  window.ipc.on("titlebar-insets", (_, inset: number, is_mac: boolean) => {
    const el = document.querySelector(
      is_mac ? ".mac-inset" : ".titlebar-inset",
    ) as HTMLDivElement;
    if (!el) return;

    if (is_mac) el.style.marginLeft = `${inset}px`;
    else el.style.marginRight = `${inset}px`;
  });

  return el;
}
