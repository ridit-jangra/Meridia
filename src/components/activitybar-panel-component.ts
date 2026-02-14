import { h } from "../ui/common/h";
import { cn } from "../ui/common/cn";
import { Tooltip } from "../ui/components/tooltip";
import { ScrollArea } from "../ui/components/scroll-area";
import { shortcuts } from "../services/shortcut/shortcut.service";
import { layout_engine } from "../services/layouts/layout.engine";
import { toggle_node_at_path } from "../common/layout.helper";
import { store } from "../services/store/store";
import { set_active_panel_key } from "../services/store/slices/layout.slice";
import { ACTIVE_PANEL_KEY } from "../../shared/storage-keys";
import { PanelComponent } from "./panel-component";
import type { TActivityBarPanelNode } from "../services/layouts/presets/preset.types";
import { lucide } from "../ui/components/icon";

export function ActivityBarPanelComponent(opts: {
  node: TActivityBarPanelNode;
}) {
  const toggle_path: ("a" | "b")[] = ["a"];

  const el = h("div", {
    class: cn(
      "h-full bg-panel-background text-panel-foreground flex flex-col min-h-0 min-w-0",
    ),
  });

  const top = h("div", {
    class: "flex items-center justify-center gap-1 p-2 shrink-0",
  });

  const scroll = ScrollArea({ class: "flex-1 min-h-0" });
  const content = scroll.inner;

  const get_active = () => store.getState().layout.active_panel_key;

  let is_initialized = false;

  const render = () => {
    top.innerHTML = "";
    content.innerHTML = "";

    const active_panel_key = get_active();

    for (const panel of opts.node.panels) {
      const is_active = panel.id === active_panel_key;

      const shortcut_text = panel.shortcut_id
        ? shortcuts.get_shortcut({ id: panel.shortcut_id })?.keys
        : undefined;

      const btn = h("div", {
        class: cn(
          "p-2 rounded-[7px] cursor-pointer flex items-center justify-center",
          is_active
            ? "bg-explorer-item-active-background/80"
            : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-icon-foreground",
        ),
        on: { click: () => handle_click(panel.id) },
      });

      btn.appendChild(
        h(
          "span",
          {
            class: cn("[&_svg]:w-5 [&_svg]:h-5 leading-none"),
          },
          lucide(panel.icon),
        ),
      );

      Tooltip({
        child: btn,
        text:
          (panel.tooltip ?? panel.id) +
          (shortcut_text ? ` (${shortcut_text})` : ""),
        position: "bottom",
      });

      top.appendChild(btn);
    }

    if (active_panel_key) {
      content.appendChild(PanelComponent({ id: active_panel_key }));
    }
  };

  const handle_click = async (panelId: string) => {
    const active_panel_key = get_active();

    if (panelId === active_panel_key) {
      const state = store.getState();
      const active_layout_id = state.layout.active_layout_id;
      const preset = layout_engine.get_layout(active_layout_id);
      if (!preset) return;

      const new_root = toggle_node_at_path(preset.root, toggle_path);

      layout_engine.update_preset(active_layout_id, {
        ...preset,
        root: new_root,
      });

      return;
    }

    store.dispatch(set_active_panel_key(panelId));
  };

  const init = async () => {
    const saved = await window.storage.get(ACTIVE_PANEL_KEY);
    if (saved) store.dispatch(set_active_panel_key(saved as string));
    is_initialized = true;
    render();
  };

  const unsub = store.subscribe(() => {
    const { active_panel_key } = store.getState().layout;

    if (is_initialized && active_panel_key) {
      window.storage.set(ACTIVE_PANEL_KEY, active_panel_key);
    }

    render();
  });

  init();

  el.appendChild(top);
  el.appendChild(scroll.el);

  return {
    el,
    destroy() {
      unsub();
      el.remove();
    },
  };
}
