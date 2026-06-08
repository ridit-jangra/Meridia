import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import {
  ACTIVE_PANEL_KEY,
  ACTIVITY_PANEL_ORDER_KEY,
} from "../../../../../../shared/storage-keys";
import { PanelComponent } from "../panels/panel-component";
import { lucide } from "../components/icon";
import { TActivityBarPanelNode } from "../../../../../types/preset.types";
import { store } from "../../../common/state/store";
import { shortcuts } from "../../../common/shortcut/shortcut.service";
import { toggle_node_at_path } from "../../layouts/layout.helper";
import { layout_engine } from "../../layouts/layout.engine";
import { set_active_panel_key } from "../../../common/state/slices/layout.slice";
import {
  begin_view_drag,
  end_view_drag,
} from "../../../contrib/editor/group/dnd";
import { is_movable_view } from "../../../contrib/editor/group/view-host";

type ActivityPanel = TActivityBarPanelNode["panels"][number];

export function ActivityBarPanelComponent(opts: {
  node: TActivityBarPanelNode;
  id: string;
}) {
  const toggle_path: number[] = [0];

  let panels: ActivityPanel[] = [...opts.node.panels];

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

  let drag_src_id: string | null = null;
  let drag_over_id: string | null = null;
  let drag_ghost: HTMLElement | null = null;

  const clear_drag_indicators = () => {
    for (const b of btns.values()) {
      b.style.borderLeft = "";
      b.style.borderRight = "";
    }
  };

  const persist_order = async () => {
    if (!is_initialized) return;
    const existing =
      ((await window.storage.get(ACTIVITY_PANEL_ORDER_KEY)) as Record<
        string,
        string[]
      > | null) ?? {};
    existing[opts.id] = panels.map((p) => p.id);
    await window.storage.set(ACTIVITY_PANEL_ORDER_KEY, existing);
  };

  const reorder = (from_id: string, to_id: string) => {
    const from = panels.findIndex((p) => p.id === from_id);
    const to = panels.findIndex((p) => p.id === to_id);
    if (from === -1 || to === -1 || from === to) return;

    const next = [...panels];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    panels = next;

    renderButtons();
    updateButtons();
    persist_order();
  };

  const apply_saved_order = (order: string[]) => {
    const by_id = new Map(panels.map((p) => [p.id, p]));
    const next: ActivityPanel[] = [];

    for (const id of order) {
      const p = by_id.get(id);
      if (p) {
        next.push(p);
        by_id.delete(id);
      }
    }

    for (const p of by_id.values()) next.push(p);

    panels = next;
  };

  const bind_drag_events = (element: HTMLElement, id: string) => {
    element.draggable = true;

    element.addEventListener("dragstart", (e) => {
      drag_src_id = id;
      if (is_movable_view(id)) begin_view_drag({ view_id: id });
      e.dataTransfer!.effectAllowed = "move";
      e.dataTransfer!.setData("text/plain", id);

      drag_ghost = element.cloneNode(true) as HTMLElement;
      drag_ghost.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0.8;pointer-events:none;";
      document.body.appendChild(drag_ghost);
      e.dataTransfer!.setDragImage(
        drag_ghost,
        element.offsetWidth / 2,
        element.offsetHeight / 2,
      );

      requestAnimationFrame(() => {
        element.style.opacity = "0.4";
      });
    });

    element.addEventListener("dragend", () => {
      element.style.opacity = "";
      drag_src_id = null;
      drag_over_id = null;
      drag_ghost?.remove();
      drag_ghost = null;
      end_view_drag();
      clear_drag_indicators();
    });

    element.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
      if (!drag_src_id || drag_src_id === id) return;
      if (drag_over_id === id) return;

      drag_over_id = id;
      clear_drag_indicators();

      const order = panels.map((p) => p.id);
      const from_idx = order.indexOf(drag_src_id);
      const to_idx = order.indexOf(id);

      if (from_idx < to_idx) {
        element.style.borderRight = "2px solid var(--focus-border)";
      } else {
        element.style.borderLeft = "2px solid var(--focus-border)";
      }
    });

    element.addEventListener("dragleave", () => {
      if (drag_over_id === id) {
        drag_over_id = null;
        clear_drag_indicators();
      }
    });

    element.addEventListener("drop", (e) => {
      e.preventDefault();
      clear_drag_indicators();

      const src = drag_src_id;
      drag_src_id = null;
      drag_over_id = null;
      drag_ghost?.remove();
      drag_ghost = null;

      if (!src || src === id) return;
      reorder(src, id);
    });
  };

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

    for (const panel of panels) {
      const is_active = panel.id === active;

      const shortcut_text = panel.shortcut_id
        ? shortcuts.get_shortcut({ id: panel.shortcut_id })?.keys
        : undefined;

      const btn = h("div", {
        class: cn(
          "px-2.5 py-1 text-[12.5px] rounded-full cursor-pointer flex items-center justify-center transition-colors min-w-0 w-full select-none",
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

      bind_drag_events(btn, panel.id);

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

  const applyCompact = () => {
    const w = top.getBoundingClientRect().width;
    top.classList.toggle("compact", w < 260);
  };

  const ro = new ResizeObserver(() => applyCompact());

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

  const init = async () => {
    const saved_active = (await window.storage.get(ACTIVE_PANEL_KEY)) as Record<
      string,
      string
    > | null;

    if (saved_active) {
      for (const [key, value] of Object.entries(saved_active)) {
        store.dispatch(set_active_panel_key({ key, value }));
      }
    }

    const saved_order = (await window.storage.get(
      ACTIVITY_PANEL_ORDER_KEY,
    )) as Record<string, string[]> | null;

    const order = saved_order?.[opts.id];
    if (order && order.length) apply_saved_order(order);

    is_initialized = true;

    renderButtons();
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
