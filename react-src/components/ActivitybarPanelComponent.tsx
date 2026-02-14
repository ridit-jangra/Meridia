import { useAppDispatch, useAppSelector } from "../store/hooks";
import { icon_map } from "../lib/icon-map";
import { shortcuts } from "../shortcut/shortcut.service";
import { IActivityBarComponentProps } from "./components.types";
import { ScrollArea } from "./shadcn/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "./shadcn/tooltip";
import { set_active_panel_key } from "../store/slices/layout.slice";
import { PanelComponent } from "./PanelComponent";
import { useEffect, useRef } from "react";
import { ACTIVE_PANEL_KEY } from "../../shared/storage-keys";
import { toggle_node_at_path } from "../lib/layout.helper";
import { layout_engine } from "../layouts/layout.engine";
import { store } from "../store/store";

export function ActivityBarPanelComponent({
  panels,
}: IActivityBarComponentProps) {
  const active_panel_key = useAppSelector((s) => s.layout.active_panel_key);
  const dispatch = useAppDispatch();
  const is_initialized = useRef(false);

  useEffect(() => {
    (async () => {
      const saved_panel_key = await window.storage.get(ACTIVE_PANEL_KEY);
      if (saved_panel_key) {
        dispatch(set_active_panel_key(saved_panel_key as string));
      }
      is_initialized.current = true;
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!is_initialized.current) return;

    if (active_panel_key) {
      window.storage.set(ACTIVE_PANEL_KEY, active_panel_key);
    }
  }, [active_panel_key]);

  const handlePanelClick = (panelId: string) => {
    // If clicking the already-active panel, toggle the activity bar closed
    if (panelId === active_panel_key) {
      const state = store.getState();
      const active_layout_id = state.layout.active_layout_id;
      const preset = layout_engine.get_layout(active_layout_id);

      if (!preset) return;

      // Adjust this path to match where your activity-bar-panel is in your layout
      // For agent_preset, it's at ["a"]
      const new_root = toggle_node_at_path(preset.root, ["a"]);

      layout_engine.update_preset(active_layout_id, {
        ...preset,
        root: new_root,
      });
    } else {
      // Otherwise, just switch to the new panel
      dispatch(set_active_panel_key(panelId));
    }
  };

  return (
    <div className="h-full bg-panel-background text-panel-foreground flex flex-col">
      <div className="flex items-center justify-center gap-2 p-2 shrink-0">
        {panels.map((panel, i) => {
          const Icon = icon_map[panel.icon];
          const is_active = panel.id === active_panel_key;

          const shortcut_text = panel.shortcut_id
            ? shortcuts.get_shortcut({ id: panel.shortcut_id })?.keys
            : undefined;

          return (
            <Tooltip key={panel.id ?? i}>
              <TooltipTrigger
                className={`p-2 rounded-md   cursor-pointer ${
                  is_active
                    ? "bg-explorer-item-active-background"
                    : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-icon-foreground"
                }`}
                onClick={() => {
                  if (!panel.id) return;
                  handlePanelClick(panel.id);
                }}
              >
                <Icon size={22} />
              </TooltipTrigger>

              <TooltipContent side="bottom">
                {panel.tooltip}
                {shortcut_text ? ` (${shortcut_text})` : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <ScrollArea className="flex-1">
        {active_panel_key && <PanelComponent id={active_panel_key} />}
      </ScrollArea>
    </div>
  );
}
