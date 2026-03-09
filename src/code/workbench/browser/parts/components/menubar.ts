import { ITitlebarMenuItem } from "../../../../../types/core.types";
import { cn } from "../../../contrib/core/utils/cn";
import { h } from "../../../contrib/core/dom/h";
import { lucide } from "./icon";
import { shortcuts } from "../../../common/shortcut/shortcut.service";
import { Dropdown, DropdownItem } from "./dropdown";
import { Button } from "./button";

export function Menubar(opts: { menus: ITitlebarMenuItem[]; class?: string }) {
  const root = h("div", {
    class: cn(
      "flex items-center gap-px select-none no-drag h-full",
      opts.class,
    ),
  });

  const buildItems = (menuItems: ITitlebarMenuItem[]): DropdownItem[] => {
    const result: DropdownItem[] = [];

    menuItems.forEach((item) => {
      if (item.name === "separator") {
        result.push({ type: "separator" });
        return;
      }

      const keys = item.command
        ? shortcuts.get_shortcut({ command: item.command })?.keys
        : undefined;
      const keyText = Array.isArray(keys) ? keys.join(" + ") : (keys ?? "");

      const hasSubmenu = item.submenu && item.submenu.length > 0;

      result.push({
        type: "item",
        label: item.name,
        onClick: item.command
          ? () => shortcuts.run_shortcut(item.command!)
          : undefined,
        children: hasSubmenu ? buildItems(item.submenu!) : undefined,
        key: keyText,
      });
    });

    return result;
  };

  const topLevelItems: DropdownItem[] = opts.menus.map((menu) => ({
    type: "item" as const,
    label: menu.name,
    children: buildItems(menu.submenu ?? []),
  }));

  const anchor = Button(lucide("menu"), { variant: "ghost" });

  const dropdown = Dropdown({
    items: topLevelItems,
    anchor,
    placement: "bottom",
    align: "start",
    offset: 4,
  });

  root.appendChild(dropdown.el);

  return {
    el: root,
    close: () => dropdown.close(),
    destroy() {
      dropdown.dispose();
      root.remove();
    },
  };
}
