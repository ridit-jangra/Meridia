import {
  ILayoutRendererProps,
  IRenderNodeProps,
  node_path,
} from "./layout.types";
import { useEffect, useRef, useState } from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { PanelComponent } from "../components/PanelComponent";
import { layout_node } from "./presets/preset.types";
import { set_node_at_path } from "../shared/layout.helper";
import { layout_engine } from "./layout.engine";

function renderNode({
  node,
  path,
  on_update_node,
}: IRenderNodeProps): React.ReactNode {
  if (node.type === "split") {
    // Recursively check if a node or its children are all disabled
    const isNodeEnabled = (n: layout_node): boolean => {
      if (n.type === "panel") return n.enabled !== false;
      if (n.type === "tabs") return n.enabled !== false;
      if (n.type === "split") return isNodeEnabled(n.a) || isNodeEnabled(n.b);
      return true;
    };

    const is_a_enabled = isNodeEnabled(node.a);
    const _is_b_disabled = isNodeEnabled(node.b);

    if (!is_a_enabled && _is_b_disabled) {
      return renderNode({ node: node.b, path: [...path, "b"], on_update_node });
    }
    if (!_is_b_disabled && is_a_enabled) {
      return renderNode({ node: node.a, path: [...path, "a"], on_update_node });
    }
    if (!is_a_enabled && !_is_b_disabled) {
      return null;
    }

    return (
      <ResizablePrimitive.Group
        orientation={node.dir === "col" ? "vertical" : "horizontal"}
        className="h-full w-full"
      >
        <ResizablePrimitive.Panel
          defaultSize={`${node.size ?? "50"}%`}
          minSize={10}
          onResize={(size) => {
            on_update_node(path, { ...node, size: size.asPercentage }, true);
          }}
        >
          {renderNode({ node: node.a, path: [...path, "a"], on_update_node })}
        </ResizablePrimitive.Panel>

        <ResizablePrimitive.Separator
          className={
            node.dir === "col" ? "h-1 bg-neutral-700" : "w-1 bg-neutral-700"
          }
        />

        <ResizablePrimitive.Panel minSize={"10%"}>
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
    return <div className="h-full w-full bg-white">tabs</div>;
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
    node: layout_node,
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
      {renderNode({ node: root, path: [], on_update_node })}
    </div>
  );
}
