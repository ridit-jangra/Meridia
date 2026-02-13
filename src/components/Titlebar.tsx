import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "./shadcn/menubar";
import Logo from "../assets/images/logo.svg?react";
import { titlebar_menu } from "../lib/titlebar.menu";
import { shortcuts } from "../shortcut/shortcut.service";

export function Titlebar() {
  return (
    <div className="h-12 bg-titlebar-background border-b flex items-center justify-between px-4 drag-region **:font-inter">
      <div className="flex items-center gap-3 h-full">
        <Logo className="w-8 h-auto [&_path]:fill-titlebar-icon-foreground" />
        <Menubar className="border-0">
          {titlebar_menu.map((item, i) => (
            <MenubarMenu key={i}>
              <MenubarTrigger className="text-[14px] no-drag">
                {item.name}
              </MenubarTrigger>
              {item.submenu && (
                <MenubarContent className="no-drag gap-0.5 flex flex-col">
                  {item.submenu.map((sub_item, k) => {
                    if (sub_item.name === "separator") {
                      return <MenubarSeparator key={k} />;
                    }
                    return (
                      <MenubarItem
                        key={k}
                        onClick={() => {
                          if (sub_item.command)
                            shortcuts.run_shortcut(sub_item.command);
                        }}
                        className="cursor-pointer no-drag text-[14px] px-10 py-2 gap-12"
                      >
                        {sub_item.name}
                        {sub_item.command && (
                          <MenubarShortcut className="text-[14px]">
                            {
                              shortcuts.get_shortcut({
                                command: sub_item.command,
                              })?.keys
                            }
                          </MenubarShortcut>
                        )}
                      </MenubarItem>
                    );
                  })}
                </MenubarContent>
              )}
            </MenubarMenu>
          ))}
        </Menubar>
      </div>
    </div>
  );
}
