import { layout_engine } from "./layout.engine";
import { TLayoutNode } from "../../../../types/preset.types";
import { store } from "../../common/state/store";
import { debounce } from "../../contrib/core/utils/utils";

export function set_node_at_path(
  root: TLayoutNode,
  path: number[],
  next: TLayoutNode,
): TLayoutNode {
  if (path.length === 0) return next;
  if (root.type !== "split") return root;

  const [head, ...rest] = path;
  const newChildren = root.children.map((child, i) =>
    i === head ? set_node_at_path(child, rest, next) : child,
  );
  return { ...root, children: newChildren };
}

export function toggle_node_at_path(
  root: TLayoutNode,
  path: number[],
): TLayoutNode {
  if (path.length === 0) {
    if (
      root.type === "panel" ||
      root.type === "tabs" ||
      root.type === "activity-bar-panel"
    ) {
      return { ...root, enabled: root.enabled !== false ? false : true };
    }
    return root;
  }
  if (root.type !== "split") return root;

  const [head, ...rest] = path;
  const newChildren = root.children.map((child, i) =>
    i === head ? toggle_node_at_path(child, rest) : child,
  );
  return { ...root, children: newChildren };
}

export function enable_node_at_path(
  root: TLayoutNode,
  path: number[],
): TLayoutNode {
  if (path.length === 0) {
    if (
      root.type === "panel" ||
      root.type === "tabs" ||
      root.type === "activity-bar-panel"
    ) {
      return { ...root, enabled: true };
    }
    return root;
  }
  if (root.type !== "split") return root;

  const [head, ...rest] = path;
  const newChildren = root.children.map((child, i) =>
    i === head ? enable_node_at_path(child, rest) : child,
  );
  return { ...root, children: newChildren };
}

export function disable_node_at_path(
  root: TLayoutNode,
  path: number[],
): TLayoutNode {
  if (path.length === 0) {
    if (
      root.type === "panel" ||
      root.type === "tabs" ||
      root.type === "activity-bar-panel"
    ) {
      return { ...root, enabled: false };
    }
    return root;
  }
  if (root.type !== "split") return root;

  const [head, ...rest] = path;
  const newChildren = root.children.map((child, i) =>
    i === head ? disable_node_at_path(child, rest) : child,
  );
  return { ...root, children: newChildren };
}

export function is_node_enabled_at_path(
  root: TLayoutNode,
  path: number[],
): boolean {
  if (path.length === 0) {
    if (
      root.type === "panel" ||
      root.type === "tabs" ||
      root.type === "activity-bar-panel"
    ) {
      return root.enabled !== false;
    }
    if (root.type === "split") {
      return root.children.some((_, i) => is_node_enabled_at_path(root, [i]));
    }
    return true;
  }

  if (root.type !== "split") return false;

  const [head, ...rest] = path;
  const child = root.children[head];
  if (!child) return false;
  return is_node_enabled_at_path(child, rest);
}

export function is_node_enabled_at_path_active_preset(path: number[]): boolean {
  const state = store.getState();
  const active_layout_id = state.layout.active_layout_id;
  const preset = layout_engine.get_layout(active_layout_id);
  if (!preset) return false;
  return is_node_enabled_at_path(preset.root, path);
}

export const update_layout = (
  pathToNode: number[],
  updateFn: (root: TLayoutNode, path: number[]) => TLayoutNode,
) => {
  debounce(() => {
    const state = store.getState();
    const active_layout_id = state.layout.active_layout_id;
    const preset = layout_engine.get_layout(active_layout_id);
    if (!preset) return;

    const new_root = updateFn(preset.root, pathToNode);
    layout_engine.update_preset(active_layout_id, {
      ...preset,
      root: new_root,
    });
  });
};
