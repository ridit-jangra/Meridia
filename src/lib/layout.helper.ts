import { TLayoutNode } from "../layouts/presets/preset.types";

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
