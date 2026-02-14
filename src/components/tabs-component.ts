import { h } from "../ui/common/h";
import { cn } from "../ui/common/cn";
import { Tooltip } from "../ui/components/tooltip";
import { ScrollArea } from "../ui/components/scroll-area";
import { shortcuts } from "../services/shortcut/shortcut.service";
import { layout_engine } from "../services/layouts/layout.engine";
import { toggle_node_at_path } from "../common/layout.helper";
import { store } from "../services/store/store";
import { set_active_tab_key } from "../services/store/slices/layout.slice";
import { ACTIVE_TAB_KEY } from "../../shared/storage-keys";
import type { TTabNode } from "../services/layouts/presets/preset.types";
import { tabs_registery } from "../common/tabs.registery";

type ViewFactory = () => HTMLElement;

export function TabsComponent(opts: { node: TTabNode }) {
  const toggle_path: ("a" | "b")[] = ["b", "a", "b"];

  const el = h("div", {
    class: "flex flex-col h-full min-h-0 bg-panel-background",
  });

  const header = h("div", { class: "flex items-center gap-2 p-3 shrink-0" });

  const scroll = ScrollArea({ class: "flex-1 min-h-0" });
  const content = scroll.inner;

  const get_active = () => store.getState().layout.active_tab_key;

  let is_initialized = false;

  const mountPanel = () => {
    content.innerHTML = "";

    const key = get_active();
    const panel = (tabs_registery as Record<string, ViewFactory | undefined>)[
      key
    ];

    if (panel) content.appendChild(panel());
  };

  const renderTabs = () => {
    header.innerHTML = "";

    const active_tab_key = get_active();

    for (const tab of opts.node.tabs) {
      const is_active = tab.id === active_tab_key;

      const shortcut_text = tab.shortcut_id
        ? shortcuts.get_shortcut({ id: tab.shortcut_id })?.keys
        : undefined;

      const pill = h(
        "div",
        {
          class: cn(
            "px-3 py-1.5 text-[14px] rounded-[7px] cursor-pointer select-none",
            is_active
              ? "bg-view-tab-active-background text-view-tab-active-foreground"
              : "bg-view-tab-background text-view-tab-foreground hover:bg-view-tab-hover-background hover:text-view-tab-hover-foreground",
          ),
          on: { click: () => handle_click(tab.id) },
        },
        tab.label,
      );

      Tooltip({
        child: pill,
        text: tab.label + (shortcut_text ? ` (${shortcut_text})` : ""),
        position: "top",
      });

      header.appendChild(pill);
    }
  };

  const render = () => {
    renderTabs();
    mountPanel();
  };

  const handle_click = async (tabId: string) => {
    const active_tab_key = get_active();

    if (tabId === active_tab_key) {
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

    store.dispatch(set_active_tab_key(tabId));
  };

  const init = async () => {
    const saved = await window.storage.get(ACTIVE_TAB_KEY);

    if (saved) store.dispatch(set_active_tab_key(saved as string));
    else if (opts.node.active)
      store.dispatch(set_active_tab_key(opts.node.active));

    is_initialized = true;
    render();
  };

  const unsub = store.subscribe(() => {
    const { active_tab_key } = store.getState().layout;

    if (is_initialized && active_tab_key) {
      window.storage.set(ACTIVE_TAB_KEY, active_tab_key);
    }

    render();
  });

  init();

  el.appendChild(header);
  el.appendChild(scroll.el);

  return {
    el,
    destroy() {
      unsub();
      el.remove();
    },
  };
}
