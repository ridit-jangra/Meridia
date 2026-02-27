import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { Tooltip } from "../../ui/components/tooltip";
import { ScrollArea } from "../../ui/components/scroll-area";
import { shortcuts } from "../../services/shortcut/shortcut.service";
import { layout_engine } from "../../services/layouts/layout.engine";
import { toggle_node_at_path } from "../../services/layouts/layout.helper";
import { store } from "../../services/state/store";
import { set_active_tab_key } from "../../services/state/slices/layout.slice";
import { ACTIVE_TAB_KEY } from "../../../shared/storage-keys";
import type { TTabNode } from "../../services/layouts/presets/preset.types";
import { tabs_registry } from "../../core/registry";

type ViewFactory = () => HTMLElement;

export function TabsComponent(opts: { node: TTabNode }) {
  const toggle_path: number[] = [2, 1, 1];

  const el = h("div", {
    class: "flex flex-col h-full min-h-0 bg-panel-background",
  });

  const header = h("div", { class: "flex items-center gap-2 p-3 shrink-0" });

  const scroll = ScrollArea({ class: "flex-1 min-h-0 h-full" });
  scroll.inner.classList.add("h-full");
  const content = scroll.inner;

  const get_active = () => store.getState().layout.active_tab_key;

  let is_initialized = false;
  const pills = new Map<string, HTMLElement>();

  const panel_cache = new Map<string, HTMLElement>();

  const mountPanel = () => {
    const key = get_active();
    const active_el = panel_cache.get(key);

    for (const [, panel_el] of panel_cache) {
      panel_el.style.display = "none";
    }

    if (active_el) {
      active_el.style.display = "";
      return;
    }

    const factory = (tabs_registry as Record<string, ViewFactory | undefined>)[
      key
    ];
    if (!factory) return;

    const new_el = factory();
    new_el.style.height = "100%";
    panel_cache.set(key, new_el);
    content.appendChild(new_el);
  };

  const updatePills = () => {
    const active = get_active();

    for (const [id, pill] of pills.entries()) {
      const isActive = id === active;

      pill.classList.toggle("bg-view-tab-active-background", isActive);
      pill.classList.toggle("text-view-tab-active-foreground", isActive);

      pill.classList.toggle("bg-view-tab-background", !isActive);
      pill.classList.toggle("text-view-tab-foreground", !isActive);
      pill.classList.toggle("hover:bg-view-tab-hover-background", !isActive);
      pill.classList.toggle("hover:text-view-tab-hover-foreground", !isActive);
    }
  };

  const renderTabs = () => {
    header.innerHTML = "";
    pills.clear();

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
            "px-2.5 py-1 text-[13px] rounded-[7px] cursor-pointer select-none",
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

      pills.set(tab.id, pill);
      header.appendChild(pill);
    }
  };

  const render = () => {
    mountPanel();
    updatePills();
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

  renderTabs();
  init();

  el.appendChild(header);
  el.appendChild(scroll.el);

  return {
    el,
    destroy() {
      unsub();

      for (const [, panel_el] of panel_cache) {
        (panel_el as any).destroy?.();
      }
      panel_cache.clear();
      el.remove();
    },
  };
}
