import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { Tooltip } from "../../ui/components/tooltip";
import { ScrollArea } from "../../ui/components/scroll-area";
import { shortcuts } from "../../services/shortcut/shortcut.service";
import { layout_engine } from "../../services/layouts/layout.engine";
import { toggle_node_at_path } from "../../services/layouts/layout.helper";
import { store } from "../../services/state/store";
import { set_active_panel_key } from "../../services/state/slices/layout.slice";
import { ACTIVE_PANEL_KEY } from "../../../shared/storage-keys";
import { PanelComponent } from "../panels/panel-component";
import type { TActivityBarPanelNode } from "../../services/layouts/presets/preset.types";
import { lucide } from "../../ui/components/icon";

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
      "flex items-center justify-center gap-1.5 p-2 shrink-0 mb-2",
      "[&_.activity-label]:inline",
      "[&_.activity-label]:whitespace-nowrap",
      "[&_.activity-label]:truncate",
      "[&_.activity-label]:max-w-[120px]",
      "[&_.activity-icon_svg]:w-5 [&_.activity-icon_svg]:h-5",
      "[&.compact_._activity-label]:hidden",
    ),
  });

  const scroll = ScrollArea({ class: "flex-1 min-h-0 h-full" });
  scroll.inner.classList.add("h-full", "activity-scroll-viewport");
  const content = scroll.inner;

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
          "p-[6px] rounded-[7px] cursor-pointer flex items-center justify-center transition-colors min-w-0",
          is_active
            ? "bg-explorer-item-active-background/80"
            : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-icon-foreground",
        ),
        on: { click: () => handle_click(panel.id) },
      });

      btn.appendChild(
        h(
          "span",
          { class: cn("flex items-center gap-2 min-w-0") },
          h(
            "span",
            { class: "activity-icon flex items-center" },
            lucide(panel.icon),
          ),
          h("span", { class: "activity-label" }, panel.label),
        ),
      );

      Tooltip({
        child: btn,
        text:
          (panel.tooltip ?? panel.id) +
          (shortcut_text ? ` (${shortcut_text})` : ""),
        position: "top",
      });

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

  const unsub = store.subscribe(() => {
    const { active_panel_key } = store.getState().layout;

    if (is_initialized && active_panel_key) {
      window.storage.set(ACTIVE_PANEL_KEY, active_panel_key);
    }

    render();
    applyCompact();
  });

  renderButtons();
  init();

  el.appendChild(top);
  el.appendChild(scroll.el);

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
