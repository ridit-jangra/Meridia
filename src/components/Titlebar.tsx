import "@vscode/codicons/dist/codicon.css";
import Logo from "../assets/images/logo.svg?react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./shadcn/menubar";
import { Popover, PopoverContent, PopoverTrigger } from "./shadcn/popover";
import { titlebar_menu } from "../lib/titlebar.menu";
import { shortcuts } from "../shortcut/shortcut.service";
import { ITitlebarMenuItem } from "../lib/lib.types";
import { Tooltip, TooltipContent, TooltipTrigger } from "./shadcn/tooltip";
import { Button } from "./shadcn/button";
import { update_layout } from "../lib/utils";
import {
  is_node_enabled_at_path_active_preset,
  toggle_node_at_path,
} from "../lib/layout.helper";
import { SettingsIcon } from "lucide-react";
import { layout_engine } from "../layouts/layout.engine";
import { Switch } from "./shadcn/switch";
import { Label } from "./shadcn/label";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { set_active_layout_id } from "../store/slices/layout.slice";

function ShortcutLabel({ command }: { command: string }) {
  const keys = shortcuts.get_shortcut({ command })?.keys;
  if (!keys) return null;

  return (
    <MenubarShortcut className="text-[14px]">
      {Array.isArray(keys) ? keys.join(" ") : keys}
    </MenubarShortcut>
  );
}

function runCommand(command?: string) {
  if (!command) return;
  shortcuts.run_shortcut(command);
}

function renderMenuItems(items: ITitlebarMenuItem[]) {
  return items.map((item) => {
    if (item.name === "separator") {
      return <MenubarSeparator key={item.id} />;
    }

    if (item.submenu?.length) {
      return (
        <MenubarSub key={item.id}>
          <MenubarSubTrigger className="cursor-pointer no-drag text-[14px] px-10 py-2 gap-12">
            {item.name}
          </MenubarSubTrigger>

          <MenubarSubContent className="no-drag gap-0.5 flex flex-col">
            {renderMenuItems(item.submenu)}
          </MenubarSubContent>
        </MenubarSub>
      );
    }

    return (
      <MenubarItem
        key={item.id}
        onClick={() => runCommand(item.command)}
        className="cursor-pointer no-drag text-[14px] px-10 py-2 gap-12"
      >
        {item.name}
        {item.command && <ShortcutLabel command={item.command} />}
      </MenubarItem>
    );
  });
}

const layoutPanels = [
  {
    id: "primary-sidebar",
    path: ["a"] as ("a" | "b")[],
    iconOn: "codicon-layout-sidebar-left",
    iconOff: "codicon-layout-sidebar-left-off",
    tooltip: "Toggle Primary Side Bar",
    command: "layout.togglePrimarySideBar",
  },
  {
    id: "bottom-panel",
    path: ["b", "a", "b"] as ("a" | "b")[],
    iconOn: "codicon-layout-panel",
    iconOff: "codicon-layout-panel-off",
    tooltip: "Toggle Panel",
    command: "layout.toggleBottomPanel",
  },
  {
    id: "secondary-sidebar",
    path: ["b", "b"] as ("a" | "b")[],
    iconOn: "codicon-layout-sidebar-right",
    iconOff: "codicon-layout-sidebar-right-off",
    tooltip: "Toggle Secondary Side Bar",
    command: "layout.toggleSecondarySideBar",
  },
];

export function Titlebar() {
  const active_layout_id = useAppSelector((s) => s.layout.active_layout_id);
  const dispatch = useAppDispatch();

  return (
    <div className="h-12 bg-titlebar-background border-b flex items-center justify-between px-4 drag-region **:font-inter **:select-none">
      <div className="flex items-center gap-3 h-full">
        <Logo className="w-7 h-auto [&_path]:fill-titlebar-icon-foreground" />

        <Menubar className="border-0">
          {titlebar_menu.map((menu) => (
            <MenubarMenu key={menu.id}>
              <MenubarTrigger className="text-[14px] no-drag">
                {menu.name}
              </MenubarTrigger>

              {menu.submenu?.length ? (
                <MenubarContent className="no-drag gap-0.5 flex flex-col">
                  {renderMenuItems(menu.submenu)}
                </MenubarContent>
              ) : null}
            </MenubarMenu>
          ))}
        </Menubar>
      </div>

      <Tooltip>
        <TooltipTrigger>
          <span className="py-1 px-2 rounded-md hover:bg-titlebar-item-hover-background hover:text-titlebar-item-hover-foreground no-drag cursor-pointer transition-colors">
            MeridiaV2
          </span>
        </TooltipTrigger>
        <TooltipContent>Command Palette</TooltipContent>
      </Tooltip>

      <div className="mr-35 no-drag flex items-center gap-px">
        {layoutPanels.map((panel) => {
          const isEnabled = is_node_enabled_at_path_active_preset(panel.path);
          const shortcutKeys = shortcuts.get_shortcut({
            command: panel.command,
          })?.keys;

          return (
            <Tooltip key={panel.id}>
              <TooltipTrigger>
                <Button
                  variant={"ghost"}
                  className="no-drag hover:bg-titlebar-item-hover-background cursor-pointer text-titlebar-icon-foreground flex items-center justify-center"
                  size={"xs"}
                  onClick={() => {
                    update_layout(panel.path, toggle_node_at_path);
                  }}
                >
                  <i
                    className={`codicon ${
                      isEnabled ? panel.iconOn : panel.iconOff
                    }`}
                    style={{ fontSize: "18px" }}
                  ></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {panel.tooltip} {shortcutKeys && `(${shortcutKeys})`}
              </TooltipContent>
            </Tooltip>
          );
        })}
        <Popover>
          <PopoverTrigger asChild>
            <button className="no-drag hover:bg-titlebar-item-hover-background cursor-pointer text-titlebar-icon-foreground p-1 rounded-md bg-transparent border-0 transition-colors">
              <SettingsIcon style={{ width: "21px", height: "21px" }} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 no-drag p-0"
            side="bottom"
            align="end"
          >
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-md">Layouts</h3>
              </div>

              <div className="p-2 space-y-1">
                {Object.values(layout_engine.get_all_presets()).map(
                  (preset) => {
                    const isActive = active_layout_id === preset.id;

                    return (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <Label
                          htmlFor={preset.id}
                          className="text-md capitalize cursor-pointer flex-1"
                        >
                          {preset.name}
                        </Label>
                        <Switch
                          id={preset.id}
                          checked={isActive}
                          onCheckedChange={() =>
                            dispatch(set_active_layout_id(preset.id))
                          }
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
