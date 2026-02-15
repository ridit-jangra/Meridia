import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { VirtualList } from "./virtual-list";

export type TreeNode = {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
  defaultOpen?: boolean;
};

type FlatRow = {
  id: string;
  label: string;
  depth: number;
  isFolder: boolean;
  icon?: string;
  node: TreeNode;
};

export function VirtualTree(opts: {
  roots: TreeNode[];
  rowHeight: number;
  class?: string;
  height?: number | string;
  indent?: number;
  initiallyOpenAll?: boolean;
  onSelect?: (id: string, node: TreeNode) => void;
  renderRight?: (row: FlatRow) => HTMLElement | null;
}) {
  const indent = opts.indent ?? 14;

  const open = new Set<string>();
  const selected = { id: "" };

  const initOpen = (n: TreeNode) => {
    if (opts.initiallyOpenAll || n.defaultOpen) open.add(n.id);
    (n.children ?? []).forEach(initOpen);
  };
  opts.roots.forEach(initOpen);

  const flatten = (nodes: TreeNode[], depth: number, out: FlatRow[]) => {
    for (const n of nodes) {
      const isFolder = !!(n.children && n.children.length);
      out.push({
        id: n.id,
        label: n.label,
        depth,
        isFolder,
        icon: n.icon,
        node: n,
      });
      if (isFolder && open.has(n.id)) flatten(n.children!, depth + 1, out);
    }
  };

  let rows: FlatRow[] = [];
  const rebuild = () => {
    const out: FlatRow[] = [];
    flatten(opts.roots, 0, out);
    rows = out;
    list.setItems(rows);
  };

  const toggle = (id: string) => {
    if (open.has(id)) open.delete(id);
    else open.add(id);
    rebuild();
  };

  const list = VirtualList<FlatRow>({
    items: rows,
    itemHeight: opts.rowHeight,
    height: opts.height,
    class: cn("min-h-0 min-w-0", opts.class),
    overscan: 8,
    key: (r) => r.id,
    render: (row) => {
      const isSel = row.id === selected.id;

      const caret = row.isFolder
        ? h(
            "span",
            { class: cn("mr-1 opacity-70", open.has(row.id) ? "" : "") },
            open.has(row.id) ? "▾" : "▸",
          )
        : h("span", { class: "mr-1 opacity-30" }, "•");

      const icon = row.icon
        ? h("span", { class: cn("codicon", `codicon-${row.icon}`, "mr-2") })
        : h("span", { class: "mr-2 w-[14px]" }, "");

      const left = h(
        "div",
        { class: "flex items-center min-w-0" },
        caret,
        icon,
        h("span", { class: "truncate" }, row.label),
      );

      const right = opts.renderRight ? opts.renderRight(row) : null;

      const el = h(
        "div",
        {
          class: cn(
            "px-2 flex items-center justify-between select-none",
            "text-[13px] rounded-[7px] mx-1",
            isSel
              ? "bg-explorer-item-active-background text-explorer-item-active-foreground"
              : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-foreground",
          ),
          style: `padding-left:${6 + row.depth * indent}px;`,
          on: {
            mousedown: (e: Event) => {
              e.preventDefault();
              selected.id = row.id;
              if (row.isFolder) toggle(row.id);
              opts.onSelect?.(row.id, row.node);
              list.setItems(rows);
            },
          },
        },
        left,
        right ?? "",
      );

      return el;
    },
  });

  rebuild();

  return {
    el: list.el,
    setRoots(next: TreeNode[]) {
      opts.roots = next;
      rebuild();
    },
    open(id: string) {
      open.add(id);
      rebuild();
    },
    close(id: string) {
      open.delete(id);
      rebuild();
    },
    toggle(id: string) {
      toggle(id);
    },
    select(id: string) {
      selected.id = id;
      list.setItems(rows);
    },
    destroy() {
      list.destroy();
    },
  };
}
