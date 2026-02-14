import LogoSvg from "../../assets/images/logo.svg?raw";
import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
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

  const center = h("div", {
    class: "flex-1 flex items-center justify-center min-w-0 px-2",
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
  );

  return el;
}
