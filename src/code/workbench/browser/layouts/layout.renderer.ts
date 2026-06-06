import { set_node_at_path } from "./layout.helper";
import { layout_engine } from "./layout.engine";
import type {
  TLayoutNode,
  TLayoutPreset,
  TSplitNode,
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

type RenderResult = { el: HTMLElement; destroy: () => void };

function path_key(path: node_path, idx: number) {
  return [...path, idx].join(".");
}

function path_str(p: node_path): string {
  return p.join(".");
}

function collect_leaf_states(node: TLayoutNode): Map<string, boolean> {
  const states = new Map<string, boolean>();
  function walk(n: TLayoutNode, path: number[]) {
    if (n.type === "split") {
      n.children.forEach((child, i) => walk(child, [...path, i]));
    } else {
      states.set(path.join("."), n.enabled !== false);
    }
  }
  walk(node, []);
  return states;
}

function tree_structure_changed(a: TLayoutNode, b: TLayoutNode): boolean {
  if (a.type !== b.type) return true;
  if (a.type === "split") {
    const sa = a as TSplitNode;
    const sb = b as TSplitNode;
    if (sa.dir !== sb.dir || sa.children.length !== sb.children.length)
      return true;
    return sa.children.some((c, i) =>
      tree_structure_changed(c, sb.children[i]),
    );
  }
  return (a as any).id !== (b as any).id;
}

function compute_sizes(
  children: TLayoutNode[],
  raw_sizes: number[],
  path: node_path,
  saved_sizes: Map<string, number>,
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

export function LayoutRenderer(opts: { layout_preset: TLayoutPreset }) {
  const panel_store = new Map<string, RenderResult>();
  const saved_sizes = new Map<string, number>();
  const splitter_map = new Map<string, ReturnType<typeof Splitter>>();
  const prev_leaf_states = new Map<string, boolean>();

  let preset = opts.layout_preset;
  let root_node: TLayoutNode = preset.root;

  let save_timer: number | null = null;
  let current_splitters: RenderResult[] = [];

  let suspend_external = false;
  let suspend_timer: number | null = null;

  let has_rendered_once = false;

  let rendered_root: TLayoutNode | null = null;

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

  function apply_enabled_changes(new_states: Map<string, boolean>) {
    for (const [key, is_enabled] of new_states) {
      const prev = prev_leaf_states.get(key);
      if (prev === is_enabled) continue;

      const parts = key.split(".").map(Number);
      const child_index = parts[parts.length - 1];
      const parent_split_path = parts.slice(0, -1);
      const splitter_key = parent_split_path.join(".");

      const splitter = splitter_map.get(splitter_key);
      if (!splitter) continue;

      const panelId = String(child_index);

      if (is_enabled) {
        const sizes = splitter.getSizes();
        const idx = sizes.findIndex((s) => s.id === panelId);
        if (idx === -1 || sizes[idx].size > 0) continue;

        const neighborIdx = idx > 0 ? idx - 1 : idx + 1;
        const restore = saved_sizes.get(key) ?? 20;
        const actual = Math.min(restore, sizes[neighborIdx].size);
        sizes[idx].size = actual;
        sizes[neighborIdx].size -= actual;
        splitter.setSizes(sizes);
      } else {
        const sizes = splitter.getSizes();
        const idx = sizes.findIndex((s) => s.id === panelId);
        if (idx === -1 || sizes[idx].size === 0) continue;

        saved_sizes.set(key, sizes[idx].size);

        const neighborIdx = idx > 0 ? idx - 1 : idx + 1;
        sizes[neighborIdx].size += sizes[idx].size;
        sizes[idx].size = 0;
        splitter.setSizes(sizes);
      }
    }
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
      return get_or_create_leaf(node);
    }

    const dir = node.dir === "col" ? "vertical" : "horizontal";
    const total = node.children.length;
    const raw_sizes = node.sizes ?? node.children.map(() => 100 / total);
    const display_sizes = compute_sizes(
      node.children,
      raw_sizes,
      path,
      saved_sizes,
    );

    const panels = node.children.map((child, i) => {
      const result = render_node(child, [...path, i], on_update_node);
      return {
        id: String(i),
        size: display_sizes[i],
        minSize: 80,
        collapsible: true,
        el: result?.el ?? h("div", {}),
      };
    });

    const splitter = Splitter({
      direction: dir,
      gutterSize: 2,
      panels,
      onResize: (sizes) => {
        const updated_sizes = [...raw_sizes];
        sizes.forEach(({ id, size }) => {
          updated_sizes[Number(id)] = size;
        });
        on_update_node(path, { ...node, sizes: updated_sizes }, true);
      },
      onResizeEnd: (sizes) => {
        const updated_sizes = [...raw_sizes];
        sizes.forEach(({ id, size }) => {
          updated_sizes[Number(id)] = size;
        });
        on_update_node(path, { ...node, sizes: updated_sizes }, true);
      },
    });

    splitter_map.set(path_str(path), splitter);

    return {
      el: splitter.el,
      destroy() {
        splitter.destroy();
      },
    };
  }

  const do_rerender = (old_root: TLayoutNode) => {
    if (!rendered_root) {
      const r = render_node(root_node, [], on_update_node);
      if (r) {
        current_splitters.push(r);
        content_host.appendChild(r.el);
      }
      rendered_root = root_node;
      collect_leaf_states(root_node).forEach((v, k) =>
        prev_leaf_states.set(k, v),
      );
      return;
    }

    const new_states = collect_leaf_states(root_node);

    if (!tree_structure_changed(old_root, root_node)) {
      apply_enabled_changes(new_states);
      rendered_root = root_node;
      prev_leaf_states.clear();
      new_states.forEach((v, k) => prev_leaf_states.set(k, v));
      return;
    }

    capture_scroll();
    for (const [, splitter] of splitter_map) splitter.destroy();
    splitter_map.clear();
    for (const s of current_splitters) s.destroy();
    current_splitters = [];

    const r = render_node(root_node, [], on_update_node);
    if (!r) return;
    current_splitters.push(r);
    content_host.innerHTML = "";
    content_host.appendChild(r.el);

    rendered_root = root_node;
    prev_leaf_states.clear();
    new_states.forEach((v, k) => prev_leaf_states.set(k, v));
    restore_scroll();
    requestAnimationFrame(() => terminal.refresh_active());
  };

  const content_host = h("div", {
    class: "min-h-0 min-w-0 h-[calc(100vh-4.15rem)] overflow-hidden",
  });

  const titlebar = Titlebar();
  const statusbar = Statusbar();

  const el = h(
    "div",
    {
      class: "h-screen w-screen min-h-0 min-w-0 overflow-hidden bg-background",
    },
    titlebar,
    content_host,
    statusbar,
  );

  const persist = (new_root: TLayoutNode, delay = 50) => {
    if (save_timer) window.clearTimeout(save_timer);
    save_timer = window.setTimeout(() => {
      if (has_rendered_once) {
        suspend_external = true;
        if (suspend_timer) window.clearTimeout(suspend_timer);
        suspend_timer = window.setTimeout(
          () => (suspend_external = false),
          200,
        );
      }
      layout_engine.update_preset(preset.id, { ...preset, root: new_root });
    }, delay);
  };

  const on_update_node = (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => {
    const new_root = set_node_at_path(root_node, path, node);
    const old_root = root_node;
    root_node = new_root;
    if (!persist_only) do_rerender(old_root);
    persist(new_root, 50);
  };

  do_rerender(root_node);
  has_rendered_once = true;

  const unsubscribe = layout_engine.subscribe(() => {
    if (suspend_external) return;
    const latest = layout_engine.get_layout(preset.id);
    if (!latest) return;

    if (latest !== preset || latest.root !== root_node) {
      const old_root = root_node;
      preset = latest;
      root_node = latest.root;
      do_rerender(old_root);
    }
  });

  return {
    el,
    update_preset(next: TLayoutPreset) {
      const old_root = root_node;
      preset = next;
      root_node = next.root;
      do_rerender(old_root);
    },
    destroy() {
      unsubscribe();
      if (save_timer) window.clearTimeout(save_timer);
      if (suspend_timer) window.clearTimeout(suspend_timer);
      for (const r of current_splitters) r.destroy();
      for (const r of panel_store.values()) r.destroy();
      for (const [, splitter] of splitter_map) splitter.destroy();
      panel_store.clear();
      splitter_map.clear();
      prev_leaf_states.clear();
      rendered_root = null;
      el.remove();
    },
  };
}
