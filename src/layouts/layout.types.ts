import { layout_node, layout_preset } from "./presets/preset.types";

export interface ILayoutRendererProps {
  layout_preset: layout_preset;
}

export type node_path = ("a" | "b")[];

export interface IRenderNodeProps {
  node: layout_node;
  path: node_path;
  on_update_node: (
    path: node_path,
    node: layout_node,
    persist_only?: boolean,
  ) => void;
}
