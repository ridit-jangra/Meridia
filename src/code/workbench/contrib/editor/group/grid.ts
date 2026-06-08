import { ITab } from "../../../../../types/editor.types";

export interface EditorGroup {
  id: string;
  tabs: ITab[];
}

export type GridNode =
  | { type: "leaf"; group_id: string }
  | {
      type: "split";
      dir: "row" | "col";
      sizes: number[];
      children: GridNode[];
    };

export type DockSide = "left" | "right" | "top" | "bottom";

let _group_seq = 0;
export function new_group_id(): string {
  _group_seq += 1;
  return `g${Date.now().toString(36)}_${_group_seq}`;
}

export function clone_grid<T>(v: T): T {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

export function grid_group_ids(node: GridNode): string[] {
  if (node.type === "leaf") return [node.group_id];
  return node.children.flatMap(grid_group_ids);
}

export function find_leaf_path(
  node: GridNode,
  group_id: string,
): number[] | null {
  if (node.type === "leaf") return node.group_id === group_id ? [] : null;
  for (let i = 0; i < node.children.length; i++) {
    const sub = find_leaf_path(node.children[i], group_id);
    if (sub) return [i, ...sub];
  }
  return null;
}

function map_at_path(
  node: GridNode,
  path: number[],
  fn: (n: GridNode) => GridNode,
): GridNode {
  if (path.length === 0) return fn(node);
  if (node.type !== "split") return node;
  const [head, ...rest] = path;
  return {
    ...node,
    children: node.children.map((c, i) =>
      i === head ? map_at_path(c, rest, fn) : c,
    ),
  };
}

export function split_grid(
  grid: GridNode,
  source_group_id: string,
  new_group_id: string,
  side: DockSide,
): GridNode {
  const path = find_leaf_path(grid, source_group_id);
  if (!path) return grid;

  const dir: "row" | "col" =
    side === "left" || side === "right" ? "row" : "col";
  const before = side === "left" || side === "top";

  return map_at_path(grid, path, (leaf) => {
    const new_leaf: GridNode = { type: "leaf", group_id: new_group_id };
    const children = before ? [new_leaf, leaf] : [leaf, new_leaf];
    return { type: "split", dir, sizes: [50, 50], children };
  });
}

export function remove_grid_group(
  grid: GridNode,
  group_id: string,
): GridNode | null {
  if (grid.type === "leaf") return grid.group_id === group_id ? null : grid;

  const kept: { node: GridNode; size: number }[] = [];
  grid.children.forEach((child, i) => {
    const next = remove_grid_group(child, group_id);
    if (next) kept.push({ node: next, size: grid.sizes[i] ?? 0 });
  });

  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0].node;

  const total = kept.reduce((a, b) => a + b.size, 0) || 1;
  return {
    type: "split",
    dir: grid.dir,
    sizes: kept.map((k) => (k.size / total) * 100),
    children: kept.map((k) => k.node),
  };
}

export function set_grid_sizes(
  grid: GridNode,
  path: number[],
  sizes: number[],
): GridNode {
  return map_at_path(grid, path, (n) =>
    n.type === "split" ? { ...n, sizes } : n,
  );
}
