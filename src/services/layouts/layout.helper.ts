import { layout_engine } from "./layout.engine";
import { TLayoutNode } from "./presets/preset.types";
import { store } from "../store/store";
import { debounce } from "../../core/utils/utils";

export function set_node_at_path(
  root: TLayoutNode,
  path: ("a" | "b")[],
  next: TLayoutNode,
): TLayoutNode {
  if (path.length === 0) return next;

  if (root.type !== "split") return root;

  const [head, ...rest] = path;

  if (head === "a") {
    return { ...root, a: set_node_at_path(root.a, rest, next) };
  }

  return { ...root, b: set_node_at_path(root.b, rest, next) };
}

export function toggle_node_at_path(
  root: TLayoutNode,
  path: ("a" | "b")[],
): TLayoutNode {
  if (path.length === 0) {
    // Toggle the node at this path
    if (
      root.type === "panel" ||
      root.type === "tabs" ||
      root.type === "activity-bar-panel"
    ) {
      return { ...root, enabled: root.enabled === false ? true : false };
    }
    return root;
  }

  if (root.type !== "split") return root;

  const [head, ...rest] = path;

  if (head === "a") {
    return { ...root, a: toggle_node_at_path(root.a, rest) };
  }

  return { ...root, b: toggle_node_at_path(root.b, rest) };
}

export function enable_node_at_path(
  root: TLayoutNode,
  path: ("a" | "b")[],
): TLayoutNode {
  if (path.length === 0) {
    // Enable the node at this path
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

  if (head === "a") {
    return { ...root, a: enable_node_at_path(root.a, rest) };
  }

  return { ...root, b: enable_node_at_path(root.b, rest) };
}

export function disable_node_at_path(
  root: TLayoutNode,
  path: ("a" | "b")[],
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

  if (head === "a") {
    return { ...root, a: disable_node_at_path(root.a, rest) };
  }

  return { ...root, b: disable_node_at_path(root.b, rest) };
}

export function is_node_enabled_at_path(
  root: TLayoutNode,
  path: ("a" | "b")[],
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
      return (
        is_node_enabled_at_path(root, ["a"]) ||
        is_node_enabled_at_path(root, ["b"])
      );
    }
    return true;
  }

  if (root.type !== "split") return false;

  const [head, ...rest] = path;

  if (head === "a") {
    return is_node_enabled_at_path(root.a, rest);
  }

  return is_node_enabled_at_path(root.b, rest);
}

export function is_node_enabled_at_path_active_preset(
  path: ("a" | "b")[],
): boolean {
  const state = store.getState();
  const active_layout_id = state.layout.active_layout_id;
  const preset = layout_engine.get_layout(active_layout_id);

  if (!preset) return false;

  const root = preset.root;

  if (path.length === 0) {
    if (
      root.type === "panel" ||
      root.type === "tabs" ||
      root.type === "activity-bar-panel"
    ) {
      return root.enabled !== false;
    }
    if (root.type === "split") {
      return (
        is_node_enabled_at_path(root, ["a"]) ||
        is_node_enabled_at_path(root, ["b"])
      );
    }
    return true;
  }

  if (root.type !== "split") return false;

  const [head, ...rest] = path;

  if (head === "a") {
    return is_node_enabled_at_path(root.a, rest);
  }

  return is_node_enabled_at_path(root.b, rest);
}

export const update_layout = (
  pathToNode: ("a" | "b")[],
  updateFn: (root: any, path: ("a" | "b")[]) => any,
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
