import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { ACTIVE_PANEL_KEY } from "../../../../../../shared/storage-keys";
import { PanelComponent } from "../panels/panel-component";
import { lucide } from "../components/icon";
import { TActivityBarPanelNode } from "../../../../../types/preset.types";
import { store } from "../../../common/state/store";
import { shortcuts } from "../../../common/shortcut/shortcut.service";
import { toggle_node_at_path } from "../../layouts/layout.helper";
import { layout_engine } from "../../layouts/layout.engine";
import { set_active_panel_key } from "../../../common/state/slices/layout.slice";

export function ActivityBarPanelComponent(opts: {
  node: TActivityBarPanelNode;
  id: string;
}) {
  const toggle_path: number[] = [0];

  const el = h("div", {
    class: cn(
      "h-full bg-panel-background text-panel-foreground flex flex-col min-h-0 min-w-0",
    ),
  });

  const top = h("div", {
    class: cn(
      "flex items-center justify-center gap-1 p-2 shrink-0 mb-2",
      "[&_.activity-label]:inline",
      "[&_.activity-label]:whitespace-nowrap",
      "[&_.activity-label]:truncate",
      "[&_.activity-label]:max-w-[120px]",
      "[&.compact_._activity-label]:hidden",
    ),
  });

  const scroll = h("div", { class: "flex-1 min-h-0 h-full" });
  const content = scroll;

  const get_active = () => store.getState().layout.active_panel_key[opts.id];

  let is_initialized = false;
  const btns = new Map<string, HTMLElement>();
  const panelCache = new Map<string, HTMLElement>();

  const updateButtons = () => {
    const active = get_active();

    for (const [id, btn] of btns.entries()) {
      const isActive = id === active;

      btn.classList.toggle("bg-explorer-item-active-background/80", isActive);

      btn.classList.toggle("text-explorer-icon-foreground", !isActive);
      btn.classList.toggle(
        "hover:bg-explorer-item-hover-background",
        !isActive,
      );
      btn.classList.toggle(
        "hover:text-explorer-item-hover-foreground",
        !isActive,
      );
    }
  };

  const renderButtons = () => {
    top.innerHTML = "";
    btns.clear();

    const active = get_active();

    for (const panel of opts.node.panels) {
      const is_active = panel.id === active;

      const shortcut_text = panel.shortcut_id
        ? shortcuts.get_shortcut({ id: panel.shortcut_id })?.keys
        : undefined;

      const btn = h("div", {
        class: cn(
          "px-2.5 py-1 text-[12.5px] rounded-full cursor-pointer flex items-center justify-center transition-colors min-w-0 w-full",
          is_active
            ? "bg-explorer-item-active-background/80"
            : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-icon-foreground",
        ),
        on: { click: () => handle_click(panel.id) },
        tooltip: {
          text:
            (panel.tooltip ?? panel.id) +
            (shortcut_text ? ` (${shortcut_text})` : ""),
          position: "top",
        },
      });

      btn.appendChild(
        h(
          "span",
          { class: cn("flex items-center gap-2 min-w-0") },
          h("span", { class: "flex items-center" }, lucide(panel.icon, 16)),
          h("span", { class: "activity-label" }, panel.label),
        ),
      );

      btns.set(panel.id, btn);
      top.appendChild(btn);
    }
  };

  const renderPanel = () => {
    const active = get_active();

    if (!active) {
      for (const [_, panelEl] of panelCache.entries()) {
        panelEl.style.display = "none";
      }
      return;
    }

    let panelEl = panelCache.get(active);

    if (!panelEl) {
      panelEl = PanelComponent({ id: active });
      panelCache.set(active, panelEl);
      content.appendChild(panelEl);
    }

    for (const [panelId, el] of panelCache.entries()) {
      el.style.display = panelId === active ? "" : "none";
    }
  };

  const render = () => {
    renderPanel();
    updateButtons();
  };

  const handle_click = async (panelId: string) => {
    const active = get_active();

    if (panelId === active) {
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

    store.dispatch(set_active_panel_key({ key: opts.id, value: panelId }));
  };

  const applyCompact = () => {
    const w = top.getBoundingClientRect().width;
    top.classList.toggle("compact", w < 260);
  };

  const ro = new ResizeObserver(() => applyCompact());

  const init = async () => {
    const saved = (await window.storage.get(ACTIVE_PANEL_KEY)) as Record<
      string,
      string
    > | null;

    if (saved) {
      for (const [key, value] of Object.entries(saved)) {
        store.dispatch(set_active_panel_key({ key, value }));
      }
    }

    is_initialized = true;
    render();
    applyCompact();
    ro.observe(top);
  };

  let prev_active = get_active();

  const unsub = store.subscribe(() => {
    const current_active = get_active();
    if (current_active === prev_active) return;
    prev_active = current_active;

    if (is_initialized) {
      const { active_panel_key } = store.getState().layout;
      if (active_panel_key) {
        window.storage.set(ACTIVE_PANEL_KEY, active_panel_key);
      }
    }

    render();
    applyCompact();
  });

  renderButtons();
  init();

  el.appendChild(top);
  el.appendChild(scroll);

  return {
    el,
    destroy() {
      ro.disconnect();
      unsub();

      for (const [_, panelEl] of panelCache.entries()) {
        panelEl.remove();
      }
      panelCache.clear();

      el.remove();
    },
  };
}
