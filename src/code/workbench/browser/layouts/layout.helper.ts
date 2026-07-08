import { layout_engine } from "./layout.engine";
import { TLayoutNode, TSplitNode } from "../../../../types/preset.types";
import { store } from "../../common/state/store";
import { debounce } from "../../contrib/core/utils/utils";

function active_root(): TSplitNode | null {
  const state = store.getState();
  const preset = layout_engine.get_layout(state.layout.active_layout_id);
  if (!preset || preset.root.type !== "split") return null;
  return preset.root;
}

/**
 * The primary side bar (activity bar + panels) is a direct child of the root
 * split. `ui_sidebar_position` reorders the root children, so its index is not
 * fixed — resolve it by node type instead of assuming [0].
 */
export function primary_sidebar_path(): number[] {
  const root = active_root();
  if (!root) return [0];
  const idx = root.children.findIndex((c) => c.type === "activity-bar-panel");
  return [idx === -1 ? 0 : idx];
}

/** The secondary side bar is the standalone panel sharing the root row. */
export function secondary_sidebar_path(): number[] {
  const root = active_root();
  if (!root) return [2];
  const idx = root.children.findIndex((c) => c.type === "panel");
  return [idx === -1 ? 2 : idx];
}

/** The bottom panel lives at index 1 inside the editor split (the row split). */
export function bottom_panel_path(): number[] {
  const root = active_root();
  if (!root) return [1, 1];
  const idx = root.children.findIndex((c) => c.type === "split");
  return [idx === -1 ? 1 : idx, 1];
}

/** True when the primary side bar sits to the right of the editor. */
export function is_primary_sidebar_on_right(): boolean {
  const root = active_root();
  if (!root) return false;
  const ab = root.children.findIndex((c) => c.type === "activity-bar-panel");
  const ed = root.children.findIndex((c) => c.type === "split");
  return ab !== -1 && ed !== -1 && ab > ed;
}

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
