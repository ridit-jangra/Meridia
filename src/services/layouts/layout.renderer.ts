import { h } from "../../core/dom/h";
import { set_node_at_path } from "./layout.helper";
import { layout_engine } from "./layout.engine";
import type { TLayoutNode, TLayoutPreset } from "./presets/preset.types";
import type { node_path } from "./layout.types";
import { Titlebar } from "../../workbench/titlebar/titlebar";
import { PanelComponent } from "../../workbench/panels/panel-component";
import { ActivityBarPanelComponent } from "../../workbench/activitybar/activitybar-panel-component";
import { TabsComponent } from "../../workbench/tabs/tabs-component";
import { Statusbar } from "../../workbench/statusbar/statusbar";
import { Splitter } from "../../ui/components/splitter/splitter";
import { terminal } from "../terminal/terminal.service";

type RenderResult = { el: HTMLElement; destroy: () => void };

type CacheEntry = {
  node: TLayoutNode;
  result: RenderResult;
};

function isNodeEnabled(n: TLayoutNode): boolean {
  if (n.type === "panel") return n.enabled !== false;
  if (n.type === "tabs") return n.enabled !== false;
  if (n.type === "activity-bar-panel") return n.enabled !== false;
  if (n.type === "split") return n.children.some(isNodeEnabled);
  return true;
}

function pathToKey(path: node_path): string {
  return path.join(".");
}

function nodesEqual(a: TLayoutNode, b: TLayoutNode): boolean {
  if (a.type !== b.type) return false;

  if (a.type === "panel" && b.type === "panel") {
    return a.id === b.id && a.enabled === b.enabled;
  }
  if (a.type === "tabs" && b.type === "tabs") {
    return (
      a.id === b.id &&
      a.active === b.active &&
      a.enabled === b.enabled &&
      JSON.stringify(a.tabs) === JSON.stringify(b.tabs)
    );
  }
  if (a.type === "activity-bar-panel" && b.type === "activity-bar-panel") {
    return (
      a.id === b.id &&
      a.enabled === b.enabled &&
      JSON.stringify(a.panels) === JSON.stringify(b.panels)
    );
  }
  if (a.type === "split" && b.type === "split") {
    return (
      a.dir === b.dir &&
      JSON.stringify(a.sizes) === JSON.stringify(b.sizes) &&
      a.children.length === b.children.length &&
      a.children.every((child, i) => nodesEqual(child, b.children[i]))
    );
  }
  return false;
}

function renderNode(opts: {
  node: TLayoutNode;
  path: node_path;
  on_update_node: (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => void;
  cache: Map<string, CacheEntry>;
}): RenderResult | null {
  const { node, path, on_update_node, cache } = opts;

  const cacheKey = pathToKey(path);
  const cached = cache.get(cacheKey);

  if (cached && nodesEqual(cached.node, node)) {
    if (node.type === "split" && cached.node.type === "split") {
      const allChildrenUnchanged = node.children.every((child, i) => {
        const childCached = cache.get(pathToKey([...path, i]));
        return childCached && nodesEqual(childCached.node, child);
      });
      if (allChildrenUnchanged) return cached.result;
    } else {
      return cached.result;
    }
  }

  if (node.type === "split") {
    const enabledIndices = node.children
      .map((child, i) => ({ child, i }))
      .filter(({ child }) => isNodeEnabled(child));

    node.children.forEach((_, i) => {
      if (!enabledIndices.find((e) => e.i === i)) {
        cleanupCacheBranch(cache, [...path, i]);
      }
    });

    if (enabledIndices.length === 0) return null;

    if (enabledIndices.length === 1) {
      const { child, i } = enabledIndices[0];
      return renderNode({
        node: child,
        path: [...path, i],
        on_update_node,
        cache,
      });
    }

    const renderedChildren = enabledIndices
      .map(({ child, i }) => ({
        i,
        result: renderNode({
          node: child,
          path: [...path, i],
          on_update_node,
          cache,
        })!,
      }))
      .filter((r) => r.result != null);

    if (renderedChildren.length === 0) return null;
    if (renderedChildren.length === 1) return renderedChildren[0].result;

    const dir = node.dir === "col" ? "vertical" : "horizontal";
    const totalEnabled = renderedChildren.length;

    const rawSizes = renderedChildren.map(
      ({ i }) => node.sizes?.[i] ?? 100 / totalEnabled,
    );
    const rawTotal = rawSizes.reduce((a, b) => a + b, 0);
    const normSizes = rawSizes.map((s) => (s / rawTotal) * 100);

    const splitter = Splitter({
      direction: dir,
      gutterSize: dir === "vertical" ? 9 : 7,
      panels: renderedChildren.map(({ result }, idx) => ({
        id: String(renderedChildren[idx].i),
        size: normSizes[idx],
        minSize: 80,
        el: result.el,
      })),
      onResize: (sizes) => {
        const updatedSizes = [
          ...(node.sizes ??
            node.children.map(() => 100 / node.children.length)),
        ];
        sizes.forEach(({ id, size }) => {
          updatedSizes[Number(id)] = size;
        });
        on_update_node(path, { ...node, sizes: updatedSizes }, true);
      },
      onResizeEnd: (sizes) => {
        const updatedSizes = [
          ...(node.sizes ??
            node.children.map(() => 100 / node.children.length)),
        ];
        sizes.forEach(({ id, size }) => {
          updatedSizes[Number(id)] = size;
        });
        on_update_node(path, { ...node, sizes: updatedSizes }, true);
      },
    });

    const result: RenderResult = {
      el: splitter.el,
      destroy() {
        splitter.destroy();
        renderedChildren.forEach(({ result: r }) => r.destroy());
      },
    };

    cache.set(cacheKey, { node, result });
    return result;
  }

  if (node.type === "panel") {
    if (node.enabled === false) return null;
    const el = PanelComponent({ id: node.id });
    const result: RenderResult = { el, destroy() {} };
    cache.set(cacheKey, { node, result });
    return result;
  }

  if (node.type === "tabs") {
    if (node.enabled === false) return null;
    const component = TabsComponent({ node });
    const result: RenderResult = { el: component.el, destroy() {} };
    cache.set(cacheKey, { node, result });
    return result;
  }

  if (node.type === "activity-bar-panel") {
    if (node.enabled === false) return null;
    const view = ActivityBarPanelComponent({ node, id: node.id });
    const result: RenderResult = { el: view.el, destroy: view.destroy };
    cache.set(cacheKey, { node, result });
    return result;
  }

  return null;
}

function cleanupCacheBranch(cache: Map<string, CacheEntry>, path: node_path) {
  const prefix = pathToKey(path);
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key === prefix || key.startsWith(prefix + ".")) {
      cache.get(key)?.result.destroy();
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) cache.delete(key);
}

export function LayoutRenderer(opts: { layout_preset: TLayoutPreset }) {
  let preset = opts.layout_preset;
  let rootNode: TLayoutNode = preset.root;

  let saveTimer: number | null = null;
  let mounted: RenderResult | null = null;

  let suspend_external = false;
  let suspend_timer: number | null = null;

  const nodeCache = new Map<string, CacheEntry>();

  const scrollEls = new Map<HTMLElement, number>();

  const isScrollable = (el: HTMLElement) => {
    const s = getComputedStyle(el);
    const oy = s.overflowY;
    if (oy !== "auto" && oy !== "scroll") return false;
    return el.scrollHeight > el.clientHeight + 1;
  };

  const collectScrollables = (root: HTMLElement) => {
    const out: HTMLElement[] = [];
    const walk = (el: HTMLElement) => {
      if (isScrollable(el)) out.push(el);
      for (const c of Array.from(el.children)) walk(c as HTMLElement);
    };
    walk(root);
    return out;
  };

  const captureScroll = () => {
    scrollEls.clear();
    for (const entry of nodeCache.values()) {
      if (!entry.result.el.isConnected) continue;
      for (const el of collectScrollables(entry.result.el)) {
        scrollEls.set(el, el.scrollTop);
      }
    }
  };

  const restoreScroll = () => {
    for (const [el, top] of scrollEls) {
      if (el.isConnected) el.scrollTop = top;
    }
  };

  const rerender = () => {
    captureScroll();

    contentHost.style.visibility = "hidden";

    if (mounted && mounted.el.parentElement) mounted.el.remove();
    contentHost.innerHTML = "";

    const r = renderNode({
      node: rootNode,
      path: [],
      on_update_node,
      cache: nodeCache,
    });
    if (!r) {
      mounted = null;
      contentHost.style.visibility = "";
      return;
    }

    mounted = r;
    contentHost.appendChild(r.el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreScroll();
        requestAnimationFrame(() => {
          contentHost.style.visibility = "";
          terminal.refresh_active();
        });
      });
    });
  };

  const contentHost = h("div", {
    class: "min-h-0 min-w-0 h-[calc(100vh-4.7rem)] overflow-hidden",
  });

  const titlebar = Titlebar();
  const statusbar = Statusbar();

  const el = h(
    "div",
    {
      class:
        "h-screen w-screen min-h-0 min-w-0 overflow-hidden bg-background p-2",
    },
    titlebar,
    contentHost,
    statusbar,
  );

  const persist = (newRoot: TLayoutNode, delay = 50) => {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      suspend_external = true;
      if (suspend_timer) window.clearTimeout(suspend_timer);
      suspend_timer = window.setTimeout(() => (suspend_external = false), 120);
      layout_engine.update_preset(preset.id, { ...preset, root: newRoot });
    }, delay);
  };

  const on_update_node = (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => {
    const newRoot = set_node_at_path(rootNode, path, node);
    rootNode = newRoot;
    if (!persist_only) rerender();
    persist(newRoot, 50);
  };

  rerender();

  const unsubscribe = layout_engine.subscribe(() => {
    if (suspend_external) return;
    const latest = layout_engine.get_layout(preset.id);
    if (!latest) return;

    if (latest !== preset || latest.root !== rootNode) {
      preset = latest;
      rootNode = latest.root;
      rerender();
    }
  });

  return {
    el,
    updatePreset(next: TLayoutPreset) {
      preset = next;
      rootNode = next.root;
      rerender();
    },
    destroy() {
      unsubscribe();
      if (saveTimer) window.clearTimeout(saveTimer);
      if (suspend_timer) window.clearTimeout(suspend_timer);
      for (const entry of nodeCache.values()) entry.result.destroy();
      nodeCache.clear();
      mounted?.destroy();
      el.remove();
    },
  };
}
