import {
  ILayoutRendererProps,
  IRenderNodeProps,
  node_path,
} from "./layout.types";
import { useEffect, useRef, useState } from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { PanelComponent } from "../components/PanelComponent";
import { TLayoutNode } from "./presets/preset.types";
import { set_node_at_path } from "../lib/layout.helper";
import { layout_engine } from "./layout.engine";
import { TabsComponent } from "../components/TabsComponent";
import { ActivityBarPanelComponent } from "../components/ActivitybarPanelComponent";
import { Titlebar } from "../components/Titlebar";

function renderNode({
  node,
  path,
  on_update_node,
}: IRenderNodeProps): React.ReactNode {
  if (node.type === "split") {
    const isNodeEnabled = (n: TLayoutNode): boolean => {
      if (n.type === "panel") return n.enabled !== false;
      if (n.type === "tabs") return n.enabled !== false;
      if (n.type === "activity-bar-panel") return n.enabled !== false;
      if (n.type === "split") return isNodeEnabled(n.a) || isNodeEnabled(n.b);
      return true;
    };

    const is_a_enabled = isNodeEnabled(node.a);
    const is_b_enabled = isNodeEnabled(node.b);

    if (!is_a_enabled && is_b_enabled) {
      return renderNode({ node: node.b, path: [...path, "b"], on_update_node });
    }
    if (!is_b_enabled && is_a_enabled) {
      return renderNode({ node: node.a, path: [...path, "a"], on_update_node });
    }
    if (!is_a_enabled && !is_b_enabled) {
      return null;
    }

    return (
      <ResizablePrimitive.Group
        orientation={node.dir === "col" ? "vertical" : "horizontal"}
        className="h-full w-full"
      >
        <ResizablePrimitive.Panel
          defaultSize={`${node.size ?? "50"}%`}
          minSize={"15%"}
          onResize={(size) => {
            on_update_node(path, { ...node, size: size.asPercentage }, true);
          }}
        >
          {renderNode({ node: node.a, path: [...path, "a"], on_update_node })}
        </ResizablePrimitive.Panel>

        <ResizablePrimitive.Separator
          className={`bg-split-handle-foreground focus-visible:ring-split-handle-active-foreground ring-offset-background relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90`}
        />

        <ResizablePrimitive.Panel minSize={"15%"}>
          {renderNode({ node: node.b, path: [...path, "b"], on_update_node })}
        </ResizablePrimitive.Panel>
      </ResizablePrimitive.Group>
    );
  }

  if (node.type === "panel") {
    if (node.enabled === false) return null;
    return <PanelComponent id={node.id} />;
  }

  if (node.type === "tabs") {
    if (node.enabled === false) return null;
    return <TabsComponent tabs={node.tabs} default_active_id={node.active} />;
  }

  if (node.type === "activity-bar-panel") {
    if (node.enabled === false) return null;
    return <ActivityBarPanelComponent panels={node.panels} />;
  }

  return null;
}

export function LayoutRenderer({ layout_preset }: ILayoutRendererProps) {
  const [root, setRoot] = useState(layout_preset.root);
  const prevPresetId = useRef(layout_preset.id);

  useEffect(() => {
    if (prevPresetId.current !== layout_preset.id) {
      setRoot(layout_preset.root);
      prevPresetId.current = layout_preset.id;
    }
  }, [layout_preset.id, layout_preset.root]);

  const save_timer = useRef<number | null>(null);

  const on_update_node = (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => {
    const new_layout = set_node_at_path(root, path, node);

    if (!persist_only) setRoot(new_layout);

    if (save_timer.current) window.clearTimeout(save_timer.current);
    save_timer.current = window.setTimeout(async () => {
      layout_engine.update_preset(layout_preset.id, {
        ...layout_preset,
        root: new_layout,
      });
    }, 50);
  };

  useEffect(() => {
    if (save_timer.current) window.clearTimeout(save_timer.current);

    save_timer.current = window.setTimeout(() => {
      layout_engine.update_preset(layout_preset.id, { ...layout_preset, root });
    }, 250);

    return () => {
      if (save_timer.current) window.clearTimeout(save_timer.current);
    };
  }, [root]);

  return (
    <div className="h-screen w-screen">
      <Titlebar />
      <div className="h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)]">
        {renderNode({ node: root, path: [], on_update_node })}
      </div>
    </div>
  );
}
