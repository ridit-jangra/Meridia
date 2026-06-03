import { settings_service } from "./settings.service";
import { store } from "../../workbench/common/state/store";
import { layout_engine } from "../../workbench/browser/layouts/layout.engine";
import { TLayoutNode, TSplitNode } from "../../../types/preset.types";

function is_activity_bar(node: TLayoutNode): boolean {
  return node.type === "activity-bar-panel";
}

function apply_sidebar_position(position: "left" | "right") {
  const active_layout_id = store.getState().layout.active_layout_id;
  const preset = layout_engine.get_layout(active_layout_id);
  if (!preset || preset.root.type !== "split") return;

  const root = preset.root as TSplitNode;
  const ab_idx = root.children.findIndex(is_activity_bar);
  const editor_idx = root.children.findIndex(
    (c, i) => i !== ab_idx && c.type === "split",
  );
  if (ab_idx === -1 || editor_idx === -1) return;

  const sidebar_is_left = ab_idx < editor_idx;
  const want_left = position === "left";
  if (sidebar_is_left === want_left) return;

  const children = [...root.children];
  const sizes = [...root.sizes];
  [children[ab_idx], children[editor_idx]] = [
    children[editor_idx],
    children[ab_idx],
  ];
  [sizes[ab_idx], sizes[editor_idx]] = [sizes[editor_idx], sizes[ab_idx]];

  layout_engine.update_preset(active_layout_id, {
    ...preset,
    root: { ...root, children, sizes },
  });
}

let last_position: "left" | "right" | null = null;

export function init_settings_apply() {
  const apply = () => {
    const { ui_sidebar_position } = settings_service.get();
    if (ui_sidebar_position === last_position) return;
    last_position = ui_sidebar_position;
    apply_sidebar_position(ui_sidebar_position);
  };

  apply();
  settings_service.subscribe(apply);
}
