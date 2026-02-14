import { TLayoutNode, TLayoutPreset } from "./presets/preset.types";

export interface ILayoutRendererProps {
  layout_preset: TLayoutPreset;
}

export type node_path = ("a" | "b")[];

export interface IRenderNodeProps {
  node: TLayoutNode;
  path: node_path;
  on_update_node: (
    path: node_path,
    node: TLayoutNode,
    persist_only?: boolean,
  ) => void;
}
