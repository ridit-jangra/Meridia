import Split from "split.js";
import { h } from "../../core/dom/h";
import { set_node_at_path } from "./layout.helper";
import { layout_engine } from "./layout.engine";
import type { TLayoutNode, TLayoutPreset } from "./presets/preset.types";
import type { node_path } from "./layout.types";
import { cn } from "../../ui";
import { Titlebar } from "../../workbench/titlebar/titlebar";
import { PanelComponent } from "../../workbench/panels/panel-component";
import { ActivityBarPanelComponent } from "../../workbench/activitybar/activitybar-panel-component";
import { TabsComponent } from "../../workbench/tabs/tabs-component";

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

    // Clean up disabled branches
    node.children.forEach((_, i) => {
      if (!enabledIndices.find((e) => e.i === i)) {
        cleanupCacheBranch(cache, [...path, i]);
      }
    });

    if (enabledIndices.length === 0) return null;

    // If only one child is enabled, render it directly (no split wrapper needed)
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

    const panes = renderedChildren.map(({ result }) =>
      h("div", { class: "min-h-0 min-w-0 h-full w-full" }, result.el),
    );

    const container = h(
      "div",
      {
        class: cn(
          "min-h-0 min-w-0 h-full w-full flex",
          dir === "vertical" ? "flex-col" : "flex-row",
        ),
      },
      ...panes,
    );

    const GUTTER_BASE =
      "bg-split-handle-foreground hover:bg-split-handle-hover-foreground active:bg-split-handle-active-foreground transition-all duration-150";

    const gutterSize = dir === "vertical" ? 1 : 0.5;
    const gutterClass =
      dir === "vertical"
        ? `${GUTTER_BASE} cursor-row-resize relative`
        : `${GUTTER_BASE} cursor-col-resize relative`;

    // Use stored sizes for the enabled children; fall back to equal split
    const totalEnabled = renderedChildren.length;
    const rawSizes = renderedChildren.map(
      ({ i }) => node.sizes?.[i] ?? 100 / totalEnabled,
    );
    const rawTotal = rawSizes.reduce((a, b) => a + b, 0);
    const sizes = rawSizes.map((s) => (s / rawTotal) * 100);

    const instance = Split(panes, {
      direction: dir,
      sizes,
      minSize: 120,
      gutterSize,
      gutter: () => {
        const g = document.createElement("div");
        g.className = gutterClass;

        const inner = document.createElement("div");
        inner.className =
          "absolute inset-0 bg-split-handle-foreground hover:bg-split-handle-hover-foreground active:bg-split-handle-active-foreground transition-all duration-150";

        if (dir === "vertical") {
          inner.style.top = "50%";
          inner.style.transform = "translateY(-50%)";
          inner.style.height = `${gutterSize}px`;
          inner.style.width = "100%";
          g.addEventListener("mouseenter", () => {
            inner.style.height = "6px";
          });
          g.addEventListener("mouseleave", () => {
            inner.style.height = `${gutterSize}px`;
          });
        } else {
          inner.style.left = "50%";
          inner.style.transform = "translateX(-50%)";
          inner.style.width = `${gutterSize}px`;
          inner.style.height = "100%";
          g.addEventListener("mouseenter", () => {
            inner.style.width = "5px";
          });
          g.addEventListener("mouseleave", () => {
            inner.style.width = `${gutterSize}px`;
          });
        }

        g.appendChild(inner);
        return g;
      },
      onDrag: (newSizes) => {
        // Map the dragged sizes back onto the full sizes array
        const updatedSizes = [
          ...(node.sizes ??
            node.children.map(() => 100 / node.children.length)),
        ];
        renderedChildren.forEach(({ i }, idx) => {
          updatedSizes[i] = newSizes[idx];
        });
        on_update_node(path, { ...node, sizes: updatedSizes }, true);
      },
      onDragEnd: (newSizes) => {
        const updatedSizes = [
          ...(node.sizes ??
            node.children.map(() => 100 / node.children.length)),
        ];
        renderedChildren.forEach(({ i }, idx) => {
          updatedSizes[i] = newSizes[idx];
        });
        on_update_node(path, { ...node, sizes: updatedSizes }, true);
      },
    });

    const result: RenderResult = {
      el: container,
      destroy() {
        try {
          instance.destroy();
        } catch {}
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
    const view = ActivityBarPanelComponent({ node });
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

  const contentHost = h("div", {
    class: "min-h-0 min-w-0 h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)]",
  });

  const titlebar = Titlebar();

  const el = h(
    "div",
    { class: "h-screen w-screen min-h-0 min-w-0" },
    titlebar,
    contentHost,
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

  const rerender = () => {
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
      return;
    }

    mounted = r;
    contentHost.appendChild(r.el);
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
