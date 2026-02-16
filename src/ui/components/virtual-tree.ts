import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { lucide } from "./icon";
import { Tooltip } from "./tooltip";
import { VirtualList } from "./virtual-list";

export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
  defaultOpen?: boolean;
};

type FlatRow = {
  id: string;
  label: string;
  depth: number;
  isFolder: boolean;
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
  get_icon?: (name: string) => string;
  icon_folder_name?: string;
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
        node: n,
      });
      if (isFolder && open.has(n.id)) flatten(n.children!, depth + 1, out);
    }
  };

  let rows: FlatRow[] = [];

  const toggle = (id: string) => {
    if (open.has(id)) open.delete(id);
    else open.add(id);

    const out: FlatRow[] = [];
    flatten(opts.roots, 0, out);

    rows = out;
    list.updateItems(rows);
  };

  const rebuild = () => {
    const out: FlatRow[] = [];
    flatten(opts.roots, 0, out);
    rows = out;
    list.setItems(rows);
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

      let caretIcon: HTMLElement | null = null;
      const caret =
        row.isFolder &&
        (() => {
          const span = h("span", {
            class: "mr-1 opacity-70 transition-transform duration-150",
            style: open.has(row.id) ? "transform: rotate(90deg)" : "",
          });
          caretIcon = lucide("chevron-right");
          span.appendChild(caretIcon);
          return span;
        })();

      const icon = !row.isFolder && h("img", { class: "w-4 h-4 mr-1" });
      if (icon)
        icon.src = `./${opts.icon_folder_name}/${opts.get_icon!(row.id)}`;

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
            "px-2 flex items-center justify-between select-none cursor-pointer",
            "text-[12.5px]",
            isSel
              ? "bg-explorer-item-active-background text-explorer-item-active-foreground"
              : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-foreground",
          ),
          style: `padding-left:${6 + row.depth * indent}px;`,
          on: {
            click: (e: MouseEvent) => {
              if (e.button !== 0) return;

              if (row.isFolder) {
                if (caret) {
                  const isOpen = open.has(row.id);
                  caret.style.transform = isOpen ? "" : "rotate(90deg)";
                }
                toggle(row.id);
              } else {
                selected.id = row.id;
                opts.onSelect?.(row.id, row.node);
                list.refresh();
              }
            },
          },
        },
        left,
        right ?? "",
      );

      Tooltip({ child: el, text: row.id, delay: 200 });

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
