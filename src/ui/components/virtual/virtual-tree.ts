import {
  IFolderStructure,
  INode,
} from "../../../../shared/types/explorer.types";
import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";
import { lucide } from "../icon";
import { Tooltip } from "../tooltip";
import { VirtualList } from "./virtual-list";
import { ContextMenu, ContextMenuItem } from "../context-menu";
import {
  FlatRow,
  flattenTree,
  removeNode,
  findNodeById,
} from "./virtual-tree.helpers";
import { create_add_node_input } from "./add-node.helpers";
import { create_rename_input } from "./rename-node.helpers";

function deepCloneNodes(nodes: INode[]): INode[] {
  return nodes.map((n) => ({
    ...n,
    child_nodes: n.child_nodes ? deepCloneNodes(n.child_nodes) : [],
  }));
}

function updateNodeInStructure(
  nodes: INode[],
  id: string,
  child_nodes: INode[],
): boolean {
  for (const node of nodes) {
    if (node.id === id) {
      node.child_nodes = child_nodes;
      return true;
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      if (updateNodeInStructure(node.child_nodes, id, child_nodes)) return true;
    }
  }
  return false;
}

export function VirtualTree(opts: {
  folderStructure: IFolderStructure;
  rowHeight: number;
  class?: string;
  height?: number | string;
  indent?: number;
  initiallyOpenAll?: boolean;
  onSelect?: (id: string, node: INode) => void;
  renderRight?: (row: FlatRow) => HTMLElement | null;
  get_icon?: (name: string) => string;
  icon_folder_name?: string;
}) {
  const indent = opts.indent ?? 14;

  const open = new Set<string>();
  const selected = { id: "" };
  let editing_node_id: string | null = null;
  const loading = new Set<string>();
  const loaded = new Set<string>();

  // Queue of pending folder loads — runs them without blocking each other
  const load_queue = new Map<string, Promise<void>>();

  opts.folderStructure = {
    ...opts.folderStructure,
    structure: deepCloneNodes(opts.folderStructure.structure),
  };

  const initOpen = (n: INode) => {
    if (opts.initiallyOpenAll) open.add(n.id);
    (n.child_nodes ?? []).forEach(initOpen);
  };
  opts.folderStructure.structure.forEach(initOpen);

  let rows: FlatRow[] = [];
  const contextMenu = ContextMenu();

  const rebuild = () => {
    const out: FlatRow[] = [];

    const root_node = el.querySelector(".root-node");
    if (root_node) root_node.remove();

    const node = h(
      "span",
      { class: "root-node px-2 text-explorer-foreground" },
      opts.folderStructure.root.name,
    );

    el.prepend(node);

    flattenTree(opts.folderStructure.structure, 0, open, out);
    rows = out;
    list.setItems(rows);
  };

  const load_children = (folderNode: INode): Promise<void> => {
    if (loaded.has(folderNode.id)) return Promise.resolve();

    // Return existing promise if already loading — callers share the same promise
    const existing = load_queue.get(folderNode.id);
    if (existing) return existing;

    const promise = new Promise<void>((resolve) => {
      // Use setTimeout to yield to the browser before starting the IPC call
      // This lets the spinner render before the potential freeze
      setTimeout(async () => {
        try {
          const raw = await window.explorer.get_child_structure(folderNode);

          let result_id: string;
          let child_nodes: INode[];

          if (Array.isArray(raw)) {
            result_id = folderNode.id;
            child_nodes = deepCloneNodes(raw);
          } else if (raw && typeof raw === "object") {
            result_id = raw.id;
            child_nodes = deepCloneNodes(raw.child_nodes ?? []);
          } else {
            console.warn("[load_children] unexpected result:", raw);
            return;
          }

          if (result_id === opts.folderStructure.path) {
            opts.folderStructure.structure = child_nodes;
          } else {
            updateNodeInStructure(
              opts.folderStructure.structure,
              result_id,
              child_nodes,
            );
          }

          loaded.add(folderNode.id);
        } catch (e) {
          console.error("[load_children] error:", e);
        } finally {
          loading.delete(folderNode.id);
          load_queue.delete(folderNode.id);
          // Rebuild after load completes
          rebuild();
          resolve();
        }
      }, 0);
    });

    load_queue.set(folderNode.id, promise);
    return promise;
  };

  const handle_folder_click = (row: FlatRow) => {
    const id = row.id;

    if (loading.has(id)) return; // Don't allow toggling while loading

    if (open.has(id)) {
      open.delete(id);
      rebuild();
      return;
    }

    // Open immediately and rebuild so caret rotates right away
    open.add(id);

    if (!loaded.has(id)) {
      loading.add(id);
      rebuild(); // Renders with open=true (rotated caret) + spinner
      load_children(row.node); // Fire and forget — rebuild called inside when done
    } else {
      rebuild();
    }
  };

  const start_add_node = (parentId: string, type: "file" | "folder") => {
    open.add(parentId);
    editing_node_id = `__adding_${type}_${parentId}`;

    const result = findNodeById(opts.folderStructure.structure, parentId);
    if (!result) return;

    const parentDepth = rows.find((r) => r.id === parentId)?.depth ?? 0;
    const parentIndex = rows.findIndex((r) => r.id === parentId);

    if (parentIndex === -1) {
      rebuild();
      return;
    }

    const tempRow: FlatRow = {
      id: editing_node_id,
      label: "",
      depth: parentDepth + 1,
      node: { id: editing_node_id, type, name: "", path: "" } as INode,
    };

    const newRows = [...rows];
    newRows.splice(parentIndex + 1, 0, tempRow);
    rows = newRows;
    list.setItems(rows);
  };

  const start_rename = (nodeId: string) => {
    editing_node_id = `__renaming_${nodeId}`;
    rebuild();
  };

  const delete_node = (nodeId: string) => {
    const result = findNodeById(opts.folderStructure.structure, nodeId);
    if (!result) return;

    const type = result.node.type === "folder" ? "folder" : "file";
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    const success = removeNode(opts.folderStructure.structure, nodeId);
    if (success) {
      if (selected.id === nodeId) selected.id = "";
      open.delete(nodeId);
      loaded.delete(nodeId);
      load_queue.delete(nodeId);
      editing_node_id = null;
      rebuild();
    }
  };

  const getContextMenuItems = (row: FlatRow): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (row.node.type === "folder") {
      items.push(
        {
          type: "item",
          label: "New File",
          onClick: () => start_add_node(row.id, "file"),
        },
        {
          type: "item",
          label: "New Folder",
          onClick: () => start_add_node(row.id, "folder"),
        },
        { type: "separator" },
      );
    }

    items.push(
      {
        type: "item",
        label: "Rename",
        onClick: () => start_rename(row.id),
      },
      {
        type: "item",
        label: "Delete",
        onClick: () => delete_node(row.id),
      },
    );

    return items;
  };

  const el = h("div", { class: "flex flex-col gap-2 overflow-hidden" });

  const list = VirtualList<FlatRow>({
    items: rows,
    itemHeight: opts.rowHeight,
    height: opts.height,
    class: cn("min-h-0 min-w-0", opts.class),
    overscan: 8,
    cache: false,
    key: (r) => r.id,
    render: (row) => {
      if (
        editing_node_id &&
        editing_node_id.startsWith("__adding_") &&
        row.id === editing_node_id
      ) {
        const type = editing_node_id.includes("_file_") ? "file" : "folder";
        const parentId = editing_node_id.replace(`__adding_${type}_`, "");
        const result = findNodeById(opts.folderStructure.structure, parentId);

        if (result) {
          return create_add_node_input({
            type,
            parentId,
            parentPath: result.node.path,
            nodes: opts.folderStructure.structure,
            indent,
            depth: row.depth,
            onComplete: (newNode) => {
              editing_node_id = null;
              rebuild();
              if (type === "file") {
                selected.id = newNode.id;
                opts.onSelect?.(newNode.id, newNode);
              }
            },
            onCancel: () => {
              editing_node_id = null;
              rebuild();
            },
          });
        }
      }

      if (editing_node_id === `__renaming_${row.id}`) {
        return create_rename_input({
          nodeId: row.id,
          nodes: opts.folderStructure.structure,
          indent,
          depth: row.depth,
          currentName: row.label,
          isFolder: row.node.type === "folder",
          get_icon: opts.get_icon,
          icon_folder_name: opts.icon_folder_name,
          onComplete: () => {
            editing_node_id = null;
            rebuild();
          },
          onCancel: () => {
            editing_node_id = null;
            rebuild();
          },
        });
      }

      const isSel = row.id === selected.id;
      const isLoading = loading.has(row.id);
      const isOpen = open.has(row.id);

      const caret =
        row.node.type === "folder" &&
        (() => {
          const span = h("span", {
            class:
              "mr-1 opacity-70 inline-flex items-center [&_svg]:w-4 [&_svg]:h-4",
            style: `transform: rotate(${isOpen ? "90deg" : "0deg"}); transition: transform 0.15s ease; display: inline-flex; align-items: center;`,
          });
          span.appendChild(
            isLoading ? lucide("loader-circle") : lucide("chevron-right"),
          );
          return span;
        })();

      const fileIcon =
        row.node.type !== "folder" && h("img", { class: "w-4 h-4 mr-1" });
      if (fileIcon && opts.get_icon && opts.icon_folder_name)
        fileIcon.src = `./${opts.icon_folder_name}/${opts.get_icon(row.id)}`;

      const left = h(
        "div",
        { class: "ml-2 flex items-center min-w-0" },
        caret,
        fileIcon,
        h("span", { class: "truncate font-normal" }, row.label),
      );

      const right = opts.renderRight ? opts.renderRight(row) : null;

      const rowEl = h(
        "div",
        {
          class: cn(
            "px-2 flex items-center justify-between select-none cursor-pointer text-[13px]",
            isSel
              ? "bg-explorer-item-active-background text-explorer-item-active-foreground"
              : "hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground text-explorer-foreground",
          ),
          style: `padding-left:${6 + row.depth * indent}px;`,
          on: {
            click: (e: MouseEvent) => {
              if (e.button !== 0) return;
              if (row.node.type === "folder") {
                handle_folder_click(row);
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

      contextMenu.bind(rowEl, () => getContextMenuItems(row));
      Tooltip({ child: rowEl, text: row.id, delay: 200 });

      return rowEl;
    },
  });

  el.appendChild(list.el);
  rebuild();

  return {
    el,
    setFolderStructure(next: IFolderStructure) {
      opts.folderStructure = {
        ...next,
        structure: deepCloneNodes(next.structure),
      };
      loaded.clear();
      load_queue.clear();
      open.clear();
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
      const row = rows.find((r) => r.id === id);
      if (row) handle_folder_click(row);
    },
    select(id: string) {
      selected.id = id;
      list.setItems(rows);
    },
    destroy() {
      list.destroy();
      contextMenu.destroy();
    },
  };
}
