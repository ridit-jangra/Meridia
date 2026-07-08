import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { ScrollArea } from "../components/scroll-area";
import { ACTIVE_TAB_KEY } from "../../../../../../shared/storage-keys";
import {
  tabs_registry,
  tabs_options_registery,
} from "../../../contrib/core/registry";
import { codicon, lucide } from "../components/icon";
import { TTabNode } from "../../../../../types/preset.types";
import { shortcuts } from "../../../common/shortcut/shortcut.service";
import { store } from "../../../common/state/store";
import { layout_engine } from "../../layouts/layout.engine";
import { toggle_node_at_path } from "../../layouts/layout.helper";
import { set_active_tab_key } from "../../../common/state/slices/layout.slice";
import {
  VIEW_DND_MIME,
  begin_view_drag,
  end_view_drag,
} from "../../../contrib/editor/group/dnd";
import {
  is_movable_view,
  is_view_docked,
} from "../../../contrib/editor/group/view-host";

type ViewFactory = () => HTMLElement;

export function TabsComponent(opts: { node: TTabNode }) {
  const toggle_path: number[] = [2, 1, 1];

  const el = h("div", {
    class: "flex flex-col h-full min-h-0 bg-panel-background",
  });

  const header = h("div", {
    class: "flex items-center justify-between w-full",
  });

  const optionsHeader = h("div", { class: "pr-3 flex items-center gap-1" });

  const tabsHeader = h("div", {
    class: "flex items-center gap-2 p-3 shrink-0",
  });

  const scroll = ScrollArea({ class: "flex-1 min-h-0 h-full" });
  scroll.inner.classList.add("h-full");
  const content = scroll.inner;

  const empty_state = h(
    "div",
    {
      class:
        "h-full w-full flex items-center justify-center text-[13px] text-muted-foreground select-none",
      style: "display:none",
    },
    "No tabs",
  );
  content.appendChild(empty_state);

  const get_active = () => store.getState().layout.active_tab_key;

  // A tab whose view has been dragged into the editor area is no longer hosted
  // by this panel, so its pill is hidden until the view is brought back.
  const is_docked_tab = (id: string) =>
    is_movable_view(id) && is_view_docked(id);
  const visible_tabs = () => opts.node.tabs.filter((t) => !is_docked_tab(t.id));
  const docked_sig = () =>
    opts.node.tabs
      .filter((t) => is_docked_tab(t.id))
      .map((t) => t.id)
      .join(",");

  const ensure_active_visible = () => {
    const visible = visible_tabs();
    if (visible.some((t) => t.id === get_active())) return;
    if (visible.length > 0) store.dispatch(set_active_tab_key(visible[0].id));
  };

  let is_initialized = false;
  const pills = new Map<string, HTMLElement>();
  const panel_cache = new Map<string, HTMLElement>();
  const options_cache = new Map<string, HTMLElement>();

  const close_opt = (() => {
    const btn = h(
      "span",
      {
        class:
          "p-1.5 rounded-[7px] cursor-pointer [&_svg]:w-5 [&_svg]:h-5 hover:bg-view-tab-active-background",
        on: {
          click: () => shortcuts.run_shortcut("layout.toggleBottomPanel"),
        },
        tooltip: {
          text: `Close (${shortcuts.get_shortcut({ id: "toggleBottomPanel" })?.keys})`,
          class: "w-max",
          position: "bottom",
        },
      },
      lucide("x"),
    );

    return btn;
  })();

  let last_mounted_key = "";

  const mountPanel = () => {
    if (visible_tabs().length === 0) {
      for (const [, panel_el] of panel_cache) panel_el.style.display = "none";
      empty_state.style.display = "";
      optionsHeader.innerHTML = "";
      optionsHeader.appendChild(close_opt);
      last_mounted_key = "";
      return;
    }
    empty_state.style.display = "none";

    const key = get_active();

    if (key === last_mounted_key) return;
    last_mounted_key = key;

    for (const [id, panel_el] of panel_cache) {
      panel_el.style.display = id === key ? "" : "none";
    }

    if (!panel_cache.has(key)) {
      const factory = (
        tabs_registry as Record<string, ViewFactory | undefined>
      )[key];
      if (!factory) return;

      const new_el = factory();
      new_el.style.height = "100%";
      panel_cache.set(key, new_el);
      content.appendChild(new_el);
    }

    const factory_options = (
      tabs_options_registery as Record<string, ViewFactory | undefined>
    )[key];

    optionsHeader.innerHTML = "";

    if (factory_options) {
      if (!options_cache.has(key)) {
        options_cache.set(key, factory_options());
      }
      optionsHeader.appendChild(options_cache.get(key)!);
    }

    optionsHeader.appendChild(close_opt);
  };

  const updatePills = () => {
    const active = get_active();

    for (const [id, pill] of pills) {
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
    tabsHeader.innerHTML = "";
    pills.clear();

    const active_tab_key = get_active();

    for (const tab of visible_tabs()) {
      const is_active = tab.id === active_tab_key;
      const shortcut_text = tab.shortcut_id
        ? shortcuts.get_shortcut({ id: tab.shortcut_id })?.keys
        : undefined;

      const pill = h(
        "div",
        {
          class: cn(
            "px-10 py-1 text-[13px] rounded-full cursor-pointer select-none flex items-center gap-2 transition-colors",
            is_active
              ? "bg-view-tab-active-background text-view-tab-active-foreground"
              : "bg-view-tab-background text-view-tab-foreground hover:bg-view-tab-hover-background hover:text-view-tab-hover-foreground",
          ),
          on: { click: () => handle_click(tab.id) },
          tooltip: {
            text: tab.label + (shortcut_text ? ` (${shortcut_text})` : ""),
            position: "bottom",
          },
        },
        tab.icon && (lucide(tab.icon) ?? codicon(tab.icon)),
        tab.label,
      );

      if (is_movable_view(tab.id)) {
        pill.draggable = true;
        pill.addEventListener("dragstart", (e) => {
          begin_view_drag({ view_id: tab.id });
          e.dataTransfer!.effectAllowed = "move";
          e.dataTransfer!.setData(VIEW_DND_MIME, tab.id);
        });
        pill.addEventListener("dragend", () => end_view_drag());
      }

      pills.set(tab.id, pill);
      tabsHeader.appendChild(pill);
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
      const preset = layout_engine.get_layout(state.layout.active_layout_id);
      if (!preset) return;

      layout_engine.update_preset(state.layout.active_layout_id, {
        ...preset,
        root: toggle_node_at_path(preset.root, toggle_path),
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

  let prev_active_tab_key = get_active();
  let prev_docked_sig = docked_sig();

  const unsub = store.subscribe(() => {
    const current_tab_key = get_active();
    const current_docked_sig = docked_sig();
    const active_changed = current_tab_key !== prev_active_tab_key;
    const docked_changed = current_docked_sig !== prev_docked_sig;
    if (!active_changed && !docked_changed) return;

    prev_active_tab_key = current_tab_key;
    prev_docked_sig = current_docked_sig;

    if (is_initialized && current_tab_key && active_changed) {
      window.storage.set(ACTIVE_TAB_KEY, current_tab_key);
    }

    if (docked_changed) {
      renderTabs();
      ensure_active_visible();
    }

    render();
  });

  renderTabs();
  init();

  header.appendChild(tabsHeader);
  header.appendChild(optionsHeader);
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
      options_cache.clear();
      el.remove();
    },
  };
}
