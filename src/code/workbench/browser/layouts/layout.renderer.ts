import { set_node_at_path } from "./layout.helper";
import { layout_engine } from "./layout.engine";
import type {
  TLayoutNode,
  TLayoutPreset,
} from "../../../../types/preset.types";
import { node_path } from "../../../../types/layout.types";
import { Splitter } from "../parts/components/splitter/splitter";
import { TabsComponent } from "../parts/tabs/tabs-component";
import { PanelComponent } from "../parts/panels/panel-component";
import { ActivityBarPanelComponent } from "../parts/activitybar/activitybar-panel-component";
import { h } from "../../contrib/core/dom/h";
import { Titlebar } from "../parts/titlebar/titlebar";
import { Statusbar } from "../parts/statusbar/statusbar";
import { terminal } from "../../../platform/terminal/terminal.service";
import { init_notifications } from "../../contrib/notification/notification";

type RenderResult = { el: HTMLElement; destroy: () => void };

const panel_store = new Map<string, RenderResult>();
const saved_sizes = new Map<string, number>();

function path_key(path: node_path, idx: number) {
  return [...path, idx].join(".");
}

function get_or_create_leaf(node: TLayoutNode): RenderResult | null {
  if (node.type === "split") return null;

  const id = node.id;
  if (panel_store.has(id)) return panel_store.get(id)!;

  let result: RenderResult | null = null;

  if (node.type === "panel") {
    const el = PanelComponent({ id: node.id });
    result = {
      el,
      destroy() {
        panel_store.delete(id);
      },
    };
  } else if (node.type === "tabs") {
    const component = TabsComponent({ node });
    result = {
      el: component.el,
      destroy() {
        panel_store.delete(id);
      },
    };
  } else if (node.type === "activity-bar-panel") {
    const view = ActivityBarPanelComponent({ node, id: node.id });
    result = {
      el: view.el,
      destroy() {
        view.destroy();
        panel_store.delete(id);
      },
    };
  }

  if (result) panel_store.set(id, result);
  return result;
}

function compute_sizes(
  children: TLayoutNode[],
  raw_sizes: number[],
  path: node_path,
): number[] {
  const n = children.length;
  const enabled = children.map((c) =>
    c.type === "split"
      ? c.children.some((cc: any) => cc.enabled !== false)
      : c.enabled !== false,
  );

  const sizes = [...raw_sizes];

  for (let i = 0; i < n; i++) {
    if (enabled[i]) continue;

    const key = path_key(path, i);
    if (sizes[i] > 0) saved_sizes.set(key, sizes[i]);

    const lost = sizes[i];
    sizes[i] = 0;
    if (lost === 0) continue;

    let neighbor = -1;
    if (i === 0) {
      for (let j = i + 1; j < n; j++) {
        if (enabled[j]) {
          neighbor = j;
          break;
        }
      }
    } else if (i === n - 1) {
      for (let j = i - 1; j >= 0; j--) {
        if (enabled[j]) {
          neighbor = j;
          break;
        }
      }
    } else {
      for (let j = i + 1; j < n; j++) {
        if (enabled[j]) {
          neighbor = j;
          break;
        }
      }
      if (neighbor === -1) {
        for (let j = i - 1; j >= 0; j--) {
          if (enabled[j]) {
            neighbor = j;
            break;
          }
        }
      }
    }

    if (neighbor !== -1) sizes[neighbor] += lost;
  }

  for (let i = 0; i < n; i++) {
    if (!enabled[i]) continue;
    if (raw_sizes[i] !== 0) continue;

    const key = path_key(path, i);
    const restore = saved_sizes.get(key) ?? 100 / n;
    saved_sizes.delete(key);

    let neighbor = -1;
    if (i === 0) {
      for (let j = i + 1; j < n; j++) {
        if (enabled[j] && sizes[j] > 0) {
          neighbor = j;
          break;
        }
      }
    } else if (i === n - 1) {
      for (let j = i - 1; j >= 0; j--) {
        if (enabled[j] && sizes[j] > 0) {
          neighbor = j;
          break;
        }
      }
    } else {
      for (let j = i + 1; j < n; j++) {
        if (enabled[j] && sizes[j] > 0) {
          neighbor = j;
          break;
        }
      }
      if (neighbor === -1) {
        for (let j = i - 1; j >= 0; j--) {
          if (enabled[j] && sizes[j] > 0) {
            neighbor = j;
            break;
          }
        }
      }
    }

    const actual =
      neighbor !== -1 ? Math.min(restore, sizes[neighbor]) : restore;

    sizes[i] = actual;
    if (neighbor !== -1) sizes[neighbor] -= actual;
  }

  return sizes;
}

function render_node(
  node: TLayoutNode,
  path: node_path,
  on_update_node: (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => void,
): RenderResult | null {
  if (node.type !== "split") {
    if (node.enabled === false) return null;
    return get_or_create_leaf(node);
  }

  const enabled_children = node.children
    .map((child, i) => ({ child, i }))
    .filter(({ child }) =>
      child.type === "split"
        ? child.children.some((c: any) => c.enabled !== false)
        : child.enabled !== false,
    );

  if (enabled_children.length === 0) return null;

  if (enabled_children.length === 1) {
    const { child, i } = enabled_children[0];
    return render_node(child, [...path, i], on_update_node);
  }

  const dir = node.dir === "col" ? "vertical" : "horizontal";
  const total = node.children.length;
  const raw_sizes = node.sizes ?? node.children.map(() => 100 / total);

  const display_sizes = compute_sizes(node.children, raw_sizes, path);

  const enabled_total = enabled_children.reduce(
    (sum, { i }) => sum + display_sizes[i],
    0,
  );

  const panels = enabled_children.map(({ child, i }) => {
    const result = render_node(child, [...path, i], on_update_node);
    const size =
      enabled_total > 0
        ? (display_sizes[i] / enabled_total) * 100
        : 100 / enabled_children.length;

    return {
      id: String(i),
      size,
      minSize: 80,
      collapsible: false,
      el: result?.el ?? h("div", {}),
    };
  });

  const splitter = Splitter({
    direction: dir,
    gutterSize: dir === "horizontal" ? 7 : 9,
    panels,
    onResize: (sizes) => {
      const updated_sizes = [...raw_sizes];
      sizes.forEach(({ id, size }) => {
        updated_sizes[enabled_children[Number(id)]?.i ?? Number(id)] = size;
      });
      on_update_node(path, { ...node, sizes: updated_sizes }, true);
    },
    onResizeEnd: (sizes) => {
      const updated_sizes = [...raw_sizes];
      sizes.forEach(({ id, size }) => {
        updated_sizes[enabled_children[Number(id)]?.i ?? Number(id)] = size;
      });
      on_update_node(path, { ...node, sizes: updated_sizes }, true);
    },
  });

  return {
    el: splitter.el,
    destroy() {
      splitter.destroy();
    },
  };
}

export function LayoutRenderer(opts: { layout_preset: TLayoutPreset }) {
  let preset = opts.layout_preset;
  let root_node: TLayoutNode = preset.root;

  let save_timer: number | null = null;
  let current_splitters: RenderResult[] = [];

  let suspend_external = false;
  let suspend_timer: number | null = null;

  const scroll_els = new Map<HTMLElement, number>();

  const is_scrollable = (el: HTMLElement) => {
    const s = getComputedStyle(el);
    const oy = s.overflowY;
    if (oy !== "auto" && oy !== "scroll") return false;
    return el.scrollHeight > el.clientHeight + 1;
  };

  const collect_scrollables = (root: HTMLElement) => {
    const out: HTMLElement[] = [];
    const walk = (el: HTMLElement) => {
      if (is_scrollable(el)) out.push(el);
      for (const c of Array.from(el.children)) walk(c as HTMLElement);
    };
    walk(root);
    return out;
  };

  const capture_scroll = () => {
    scroll_els.clear();
    for (const { el } of panel_store.values()) {
      if (!el.isConnected) continue;
      for (const scroll_el of collect_scrollables(el)) {
        scroll_els.set(scroll_el, scroll_el.scrollTop);
      }
    }
  };

  const restore_scroll = () => {
    for (const [el, top] of scroll_els) {
      if (el.isConnected) el.scrollTop = top;
    }
  };

  const rerender = () => {
    capture_scroll();

    const r = render_node(root_node, [], on_update_node);

    for (const s of current_splitters) s.destroy();
    current_splitters = [];

    if (!r) return;

    current_splitters.push(r);
    content_host.innerHTML = "";
    content_host.appendChild(r.el);

    restore_scroll();
    requestAnimationFrame(() => terminal.refresh_active());
  };

  const content_host = h("div", {
    class: "min-h-0 min-w-0 h-[calc(100vh-4.7rem)] overflow-hidden",
  });

  const titlebar = Titlebar();
  const statusbar = Statusbar();
  init_notifications();

  const el = h(
    "div",
    {
      class:
        "h-screen w-screen min-h-0 min-w-0 overflow-hidden bg-background p-2",
    },
    titlebar,
    content_host,
    statusbar,
  );

  const persist = (new_root: TLayoutNode, delay = 50) => {
    if (save_timer) window.clearTimeout(save_timer);
    save_timer = window.setTimeout(() => {
      suspend_external = true;
      if (suspend_timer) window.clearTimeout(suspend_timer);
      suspend_timer = window.setTimeout(() => (suspend_external = false), 120);
      layout_engine.update_preset(preset.id, { ...preset, root: new_root });
    }, delay);
  };

  const on_update_node = (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => {
    const new_root = set_node_at_path(root_node, path, node);
    root_node = new_root;
    if (!persist_only) rerender();
    persist(new_root, 50);
  };

  rerender();

  const unsubscribe = layout_engine.subscribe(() => {
    if (suspend_external) return;
    const latest = layout_engine.get_layout(preset.id);
    if (!latest) return;

    if (latest !== preset || latest.root !== root_node) {
      preset = latest;
      root_node = latest.root;
      rerender();
    }
  });

  return {
    el,
    update_preset(next: TLayoutPreset) {
      preset = next;
      root_node = next.root;
      rerender();
    },
    destroy() {
      unsubscribe();
      if (save_timer) window.clearTimeout(save_timer);
      if (suspend_timer) window.clearTimeout(suspend_timer);
      for (const r of current_splitters) r.destroy();
      for (const r of panel_store.values()) r.destroy();
      panel_store.clear();
      el.remove();
    },
  };
}
