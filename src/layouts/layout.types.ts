import { layout_node, layout_preset } from "./presets/presets.type";

export interface ILayoutRendererProps {
  layout_preset: layout_preset;
}

export interface IRenderNodeProps {
  node: layout_node;
}
