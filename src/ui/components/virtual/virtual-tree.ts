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
import { createAddNodeInput } from "./add-node.helpers";
import { createRenameInput } from "./rename-node.helpers";

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
  let editingNodeId: string | null = null;

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

  const toggle = (id: string) => {
    if (open.has(id)) open.delete(id);
    else open.add(id);
    rebuild();
  };

  const startAddNode = (parentId: string, type: "file" | "folder") => {
    open.add(parentId);
    editingNodeId = `__adding_${type}_${parentId}`;

    const result = findNodeById(opts.folderStructure.structure, parentId);
    if (!result) return;

    const parentDepth = rows.find((r) => r.id === parentId)?.depth ?? 0;

    const parentIndex = rows.findIndex((r) => r.id === parentId);
    if (parentIndex === -1) {
      rebuild();
      return;
    }

    const tempRow: FlatRow = {
      id: editingNodeId,
      label: "",
      depth: parentDepth + 1,
      isFolder: type === "folder",
      node: { id: editingNodeId, type, name: "", path: "" } as INode,
    };

    const newRows = [...rows];
    newRows.splice(parentIndex + 1, 0, tempRow);
    rows = newRows;
    list.setItems(rows);
  };

  const startRename = (nodeId: string) => {
    editingNodeId = `__renaming_${nodeId}`;
    rebuild();
  };

  const deleteNode = (nodeId: string) => {
    const result = findNodeById(opts.folderStructure.structure, nodeId);
    if (!result) return;

    const type = result.node.type === "folder" ? "folder" : "file";
    const confirmMsg = `Are you sure you want to delete this ${type}?`;

    if (!confirm(confirmMsg)) return;

    const success = removeNode(opts.folderStructure.structure, nodeId);
    if (success) {
      if (selected.id === nodeId) {
        selected.id = "";
      }
      open.delete(nodeId);
      editingNodeId = null;
      rebuild();
    }
  };

  const getContextMenuItems = (row: FlatRow): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (row.isFolder) {
      items.push(
        {
          type: "item",
          label: "New File",
          onClick: () => startAddNode(row.id, "file"),
        },
        {
          type: "item",
          label: "New Folder",
          onClick: () => startAddNode(row.id, "folder"),
        },
        { type: "separator" },
      );
    }

    items.push(
      {
        type: "item",
        label: "Rename",
        onClick: () => startRename(row.id),
      },
      {
        type: "item",
        label: "Delete",
        onClick: () => deleteNode(row.id),
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
    key: (r) => r.id,
    render: (row) => {
      if (
        editingNodeId &&
        editingNodeId.startsWith("__adding_") &&
        row.id === editingNodeId
      ) {
        const type = editingNodeId.includes("_file_") ? "file" : "folder";
        const parentId = editingNodeId.replace(`__adding_${type}_`, "");
        const result = findNodeById(opts.folderStructure.structure, parentId);

        if (result) {
          return createAddNodeInput({
            type,
            parentId,
            parentPath: result.node.path,
            nodes: opts.folderStructure.structure,
            indent,
            depth: row.depth,
            onComplete: (newNode) => {
              editingNodeId = null;
              rebuild();
              if (type === "file") {
                selected.id = newNode.id;
                opts.onSelect?.(newNode.id, newNode);
              }
            },
            onCancel: () => {
              editingNodeId = null;
              rebuild();
            },
          });
        }
      }

      if (editingNodeId === `__renaming_${row.id}`) {
        return createRenameInput({
          nodeId: row.id,
          nodes: opts.folderStructure.structure,
          indent,
          depth: row.depth,
          currentName: row.label,
          isFolder: row.isFolder,
          get_icon: opts.get_icon,
          icon_folder_name: opts.icon_folder_name,
          onComplete: () => {
            editingNodeId = null;
            rebuild();
          },
          onCancel: () => {
            editingNodeId = null;
            rebuild();
          },
        });
      }

      const isSel = row.id === selected.id;

      let caretIcon: HTMLElement | null = null;
      const caret =
        row.isFolder &&
        (() => {
          const span = h("span", {
            class: "mr-1 opacity-70",
            style: open.has(row.id) ? "transform: rotate(90deg)" : "",
          });
          caretIcon = lucide("chevron-right");
          span.appendChild(caretIcon);
          return span;
        })();

      const icon = !row.isFolder && h("img", { class: "w-4 h-4 mr-1" });
      if (icon && opts.get_icon && opts.icon_folder_name)
        icon.src = `./${opts.icon_folder_name}/${opts.get_icon(row.id)}`;

      const left = h(
        "div",
        { class: "ml-2 flex items-center min-w-0" },
        caret,
        icon,
        h("span", { class: "truncate font-normal" }, row.label),
      );

      const right = opts.renderRight ? opts.renderRight(row) : null;

      const el = h(
        "div",
        {
          class: cn(
            "px-2 flex items-center justify-between select-none cursor-pointer",
            "text-[13px]",
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

      contextMenu.bind(el, () => getContextMenuItems(row));

      Tooltip({ child: el, text: row.id, delay: 200 });

      return el;
    },
  });

  el.appendChild(list.el);

  rebuild();

  return {
    el,
    setFolderStructure(next: IFolderStructure) {
      opts.folderStructure = next;
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
      contextMenu.destroy();
    },
  };
}
