// layout-renderer.ts
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

// import { Titlebar } from "../components/Titlebar";
// import { PanelComponent } from "../components/PanelComponent";
// import { TabsComponent } from "../components/TabsComponent";
// import { ActivityBarPanelComponent } from "../components/ActivitybarPanelComponent";

type RenderResult = { el: HTMLElement; destroy: () => void };

function isNodeEnabled(n: TLayoutNode): boolean {
  if (n.type === "panel") return n.enabled !== false;
  if (n.type === "tabs") return n.enabled !== false;
  if (n.type === "activity-bar-panel") return n.enabled !== false;
  if (n.type === "split") return isNodeEnabled(n.a) || isNodeEnabled(n.b);
  return true;
}

function renderNode(opts: {
  node: TLayoutNode;
  path: node_path;
  on_update_node: (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => void;
}): RenderResult | null {
  const { node, path, on_update_node } = opts;

  if (node.type === "split") {
    const aEnabled = isNodeEnabled(node.a);
    const bEnabled = isNodeEnabled(node.b);

    if (!aEnabled && bEnabled)
      return renderNode({ node: node.b, path: [...path, "b"], on_update_node });
    if (!bEnabled && aEnabled)
      return renderNode({ node: node.a, path: [...path, "a"], on_update_node });
    if (!aEnabled && !bEnabled) return null;

    const childA = renderNode({
      node: node.a,
      path: [...path, "a"],
      on_update_node,
    });
    const childB = renderNode({
      node: node.b,
      path: [...path, "b"],
      on_update_node,
    });

    if (!childA || !childB) return childA ?? childB;

    const dir = node.dir === "col" ? "vertical" : "horizontal";

    const paneA = h(
      "div",
      { class: "min-h-0 min-w-0 h-full w-full" },
      childA.el,
    );
    const paneB = h(
      "div",
      { class: "min-h-0 min-w-0 h-full w-full" },
      childB.el,
    );

    const container = h(
      "div",
      {
        class: cn(
          "min-h-0 min-w-0 h-full w-full flex",
          dir === "vertical" ? "flex-col" : "flex-row",
        ),
      },
      paneA,
      paneB,
    );

    const GUTTER_BASE =
      "bg-split-handle-foreground hover:bg-split-handle-hover-foreground active:bg-split-handle-active-foreground";

    const gutterClass =
      dir === "vertical"
        ? `${GUTTER_BASE} h-[6px] cursor-row-resize`
        : `${GUTTER_BASE} w-[2px] cursor-col-resize`;

    const sizeA = typeof node.size === "number" ? node.size : 50;
    const sizes = [sizeA, 100 - sizeA];

    const instance = Split([paneA, paneB], {
      direction: dir,
      sizes,
      minSize: 120,
      gutterSize: 1,
      gutter: () => {
        const g = document.createElement("div");
        g.className = gutterClass;
        return g;
      },
      onDrag: (s) => {
        on_update_node(path, { ...node, size: s[0] }, true);
      },
      onDragEnd: (s) => {
        on_update_node(path, { ...node, size: s[0] }, true);
      },
    });

    return {
      el: container,
      destroy() {
        try {
          instance.destroy();
        } catch {}
        childA.destroy();
        childB.destroy();
      },
    };
  }

  if (node.type === "panel") {
    if (node.enabled === false) return null;
    const el = PanelComponent({ id: node.id });
    return { el, destroy() {} };
  }

  if (node.type === "tabs") {
    if (node.enabled === false) return null;
    const el = TabsComponent({ node }).el;
    return { el, destroy() {} };
  }

  if (node.type === "activity-bar-panel") {
    if (node.enabled === false) return null;
    const view = ActivityBarPanelComponent({ node });
    return { el: view.el, destroy: view.destroy };
  }

  return null;
}

export function LayoutRenderer(opts: { layout_preset: TLayoutPreset }) {
  let preset = opts.layout_preset;
  let rootNode: TLayoutNode = preset.root;

  let saveTimer: number | null = null;
  let mounted: RenderResult | null = null;

  let suspend_external = false;
  let suspend_timer: number | null = null;

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
    mounted?.destroy();
    contentHost.innerHTML = "";

    const r = renderNode({
      node: rootNode,
      path: [],
      on_update_node,
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

  // initial render
  rerender();

  // ✅ rerender when engine updates this preset
  const unsubscribe = layout_engine.subscribe(() => {
    if (suspend_external) return;

    const latest = layout_engine.get_layout(preset.id);
    if (!latest) return;

    // If preset object changed, update reference
    const presetChanged = latest !== preset;

    // If root ref changed, update + rerender
    const rootChanged = latest.root !== rootNode;

    if (presetChanged || rootChanged) {
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
      mounted?.destroy();
      el.remove();
    },
  };
}
