import { ITabsComponentProps } from "./components.types";
import { Tooltip, TooltipContent, TooltipTrigger } from "./shadcn/tooltip";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { set_active_tab_key } from "../store/slices/layout.slice";
import React, { useEffect, useRef, useState } from "react";
import { ACTIVE_TAB_KEY } from "../../shared/storage-keys";
import { shortcuts } from "../shortcut/shortcut.service";
import { ScrollArea } from "./shadcn/scroll-area";
import { tabs_registery } from "../lib/tabs-registery";
import { toggle_node_at_path } from "../lib/layout.helper";
import { layout_engine } from "../layouts/layout.engine";
import { store } from "../store/store";

export function TabsComponent({
  tabs,
  default_active_id,
}: ITabsComponentProps) {
  const active_tab_key = useAppSelector((s) => s.layout.active_tab_key);
  const dispatch = useAppDispatch();
  const is_initialized = useRef(false);
  const [Panel, setPanel] = useState<React.FC | null>(null);

  useEffect(() => {
    const panel = tabs_registery[active_tab_key];
    if (panel) {
      setPanel(() => panel);
    } else {
      setPanel(null);
    }
  }, [active_tab_key]);

  useEffect(() => {
    (async () => {
      const saved_tab_key = await window.storage.get(ACTIVE_TAB_KEY);
      if (saved_tab_key) {
        dispatch(set_active_tab_key(saved_tab_key as string));
      } else if (default_active_id) {
        dispatch(set_active_tab_key(default_active_id));
      }
      is_initialized.current = true;
    })();
  }, [default_active_id, dispatch]);

  useEffect(() => {
    if (!is_initialized.current) return;

    if (active_tab_key) {
      window.storage.set(ACTIVE_TAB_KEY, active_tab_key);
    }
  }, [active_tab_key]);

  const handleTabClick = (tabId: string) => {
    if (tabId === active_tab_key) {
      const state = store.getState();
      const active_layout_id = state.layout.active_layout_id;
      const preset = layout_engine.get_layout(active_layout_id);

      if (!preset) return;

      const new_root = toggle_node_at_path(preset.root, ["b", "a", "b"]);

      layout_engine.update_preset(active_layout_id, {
        ...preset,
        root: new_root,
      });
    } else {
      dispatch(set_active_tab_key(tabId));
    }
  };

  return (
    <div className="flex flex-col h-full bg-panel-background">
      <div className="flex items-center gap-2 p-3">
        {tabs.map((tab, i) => {
          const is_active = tab.id === active_tab_key;
          const shortcut_text = tab.shortcut_id
            ? shortcuts.get_shortcut({ id: tab.shortcut_id })?.keys
            : undefined;
          return (
            <Tooltip key={i}>
              <TooltipTrigger>
                <div
                  onClick={() => {
                    if (!tab.id) return;
                    handleTabClick(tab.id);
                  }}
                  className={`px-3 py-1.5 text-lg rounded-md cursor-pointer transition-colors ${
                    is_active
                      ? "bg-view-tab-active-background text-view-tab-active-foreground"
                      : "bg-view-tab-background text-view-tab-foreground hover:bg-view-tab-hover-background hover:text-view-tab-hover-foreground"
                  }`}
                >
                  {tab.label}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {tab.label}
                {shortcut_text ? ` (${shortcut_text})` : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <ScrollArea className="flex-1">{Panel && <Panel />}</ScrollArea>
    </div>
  );
}
