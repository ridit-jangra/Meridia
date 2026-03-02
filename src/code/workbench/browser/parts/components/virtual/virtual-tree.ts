import {
  IFolderStructure,
  INode,
} from "../../../../../../../shared/types/explorer.types";
import { h } from "../../../../contrib/core/dom/h";
import { cn } from "../../../../contrib/core/utils/cn";
import { lucide } from "../icon";
import { Tooltip } from "../tooltip";
import { VirtualList } from "./virtual-list";
import { ContextMenu, ContextMenuItem } from "../context-menu";
import {
  FlatRow,
  flatten_tree,
  find_node_by_id,
  rename_by_path,
  remove_node_by_path,
  add_node,
} from "./virtual-tree.helpers";
import { create_add_node_input } from "./add-node.helpers";
import { create_rename_input } from "./rename-node.helpers";
import {
  norm,
  uris_equal,
  is_descendant_of,
  rebase_uri,
  get_parent_uri,
} from "../../../../../../../shared/uri/generate";

import { editors_registry } from "../../../../contrib/core/registry";
import { explorer } from "../../../../../platform/explorer/explorer.service";
import {
  get_file_extension,
  open_editor_tab,
} from "../../../../../editor/editor.helper";
import { ScrollArea } from "../scroll-area";

function deep_clone_nodes(nodes: INode[]): INode[] {
  return nodes.map((n) => ({
    ...n,
    id: norm(n.id),
    path: norm(n.path),
    child_nodes: n.child_nodes ? deep_clone_nodes(n.child_nodes) : [],
  }));
}

function update_node_in_structure(
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
      if (update_node_in_structure(node.child_nodes, id, child_nodes))
        return true;
    }
  }
  return false;
}

function inject_animations() {
  if (document.getElementById("vt-animations")) return;
  const style = document.createElement("style");
  style.id = "vt-animations";
  style.textContent = `
    @keyframes vt-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
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
  scrollViewport?: HTMLElement;
}) {
  inject_animations();

  const indent = opts.indent ?? 14;

  const open = new Set<string>();
  const selected = { id: "" };
  let editing_node_id: string | null = null;
  const loading = new Set<string>();
  const loaded = new Set<string>();

  const load_queue = new Map<string, Promise<void>>();

  let pending_caret_anim: { id: string; direction: "open" | "close" } | null =
    null;

  opts.folderStructure = {
    ...opts.folderStructure,
    structure: deep_clone_nodes(opts.folderStructure.structure),
  };

  const init_open = (n: INode) => {
    if (opts.initiallyOpenAll) open.add(n.id);
    (n.child_nodes ?? []).forEach(init_open);
  };
  opts.folderStructure.structure.forEach(init_open);

  let rows: FlatRow[] = [];
  const contextMenu = ContextMenu();

  const expand_to = async (id: string) => {
    const workspace = norm(opts.folderStructure.path);

    const ancestors: string[] = [];
    let current = get_parent_uri(norm(id));

    while (
      current &&
      !uris_equal(current, workspace) &&
      is_descendant_of(current, workspace)
    ) {
      ancestors.unshift(current);
      current = get_parent_uri(current);
    }

    for (const ancestor of ancestors) {
      open.add(ancestor);

      if (!loaded.has(ancestor)) {
        const result =
          find_node_by_id(opts.folderStructure.structure, ancestor) ??
          find_node_by_id(
            opts.folderStructure.structure,
            ancestor.replace(/\//g, "\\"),
          );

        if (result) {
          loading.add(ancestor);
          await load_children(result.node);
        }
      }
    }
  };

  const flush_caret_anim = () => {
    if (!pending_caret_anim) return;
    const { id, direction } = pending_caret_anim;
    pending_caret_anim = null;

    const row_el = list.layer.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(id)}"]`,
    );
    if (!row_el) return;

    const caret = row_el.querySelector<HTMLElement>("[data-caret]");
    if (!caret) return;

    caret.style.transition = "none";
    caret.style.transform =
      direction === "open" ? "rotate(0deg)" : "rotate(90deg)";

    requestAnimationFrame(() => {
      caret.style.transition = "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
      caret.style.transform =
        direction === "open" ? "rotate(90deg)" : "rotate(0deg)";
    });
  };

  const rebuild = () => {
    const out: FlatRow[] = [];

    const root_node = el.querySelector(".root-node");
    if (root_node) root_node.remove();

    const root_id = norm(opts.folderStructure.path);

    const root_label = h(
      "span",
      { class: "truncate font-normal" },
      opts.folderStructure.root.name,
    );

    const root_actions = h(
      "div",
      {
        class: "flex items-center gap-1",
      },
      h(
        "button",
        {
          class:
            "p-1 rounded hover:bg-explorer-item-hover-background cursor-pointer",
          title: "New File",
          on: {
            click: (e: MouseEvent) => {
              e.stopPropagation();
              selected.id = root_id;
              start_add_node(root_id, "file");
            },
          },
        },
        lucide("file-plus"),
      ),

      h(
        "button",
        {
          class:
            "p-1 rounded hover:bg-explorer-item-hover-background cursor-pointer",
          title: "New Folder",
          on: {
            click: (e: MouseEvent) => {
              e.stopPropagation();
              selected.id = root_id;
              start_add_node(root_id, "folder");
            },
          },
        },
        lucide("folder-plus"),
      ),
    );

    const node = h(
      "div",
      {
        class:
          "root-node group px-2 flex items-center justify-between text-explorer-foreground select-none",
      },
      root_label,
      root_actions,
    );

    el.prepend(node);

    flatten_tree(opts.folderStructure.structure, 0, open, out);
    rows = out;

    list.setItems(rows);
    requestAnimationFrame(() => {
      flush_caret_anim();
    });
  };

  const load_children = (folder_node: INode): Promise<void> => {
    if (loaded.has(folder_node.id)) return Promise.resolve();

    const existing = load_queue.get(folder_node.id);
    if (existing) return existing;

    const promise = new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          const raw = await explorer.actions.get_child_structure(folder_node);

          let result_id: string;
          let child_nodes: INode[];

          if (Array.isArray(raw)) {
            result_id = folder_node.id;
            child_nodes = deep_clone_nodes(raw);
          } else if (raw && typeof raw === "object") {
            result_id = raw.id;
            child_nodes = deep_clone_nodes(raw.child_nodes ?? []);
          } else {
            console.warn("[load_children] unexpected result:", raw);
            return;
          }

          if (uris_equal(result_id, opts.folderStructure.path)) {
            opts.folderStructure.structure = child_nodes;
          } else {
            update_node_in_structure(
              opts.folderStructure.structure,
              result_id,
              child_nodes,
            );
          }

          loaded.add(folder_node.id);
        } catch (e) {
          console.error("[load_children] error:", e);
        } finally {
          loading.delete(folder_node.id);
          load_queue.delete(folder_node.id);
          rebuild();
          resolve();
        }
      }, 0);
    });

    load_queue.set(folder_node.id, promise);
    return promise;
  };

  const handle_folder_click = (row: FlatRow) => {
    const id = row.id;
    selected.id = id;

    if (loading.has(id)) return;

    const direction: "open" | "close" = open.has(id) ? "close" : "open";

    pending_caret_anim = { id, direction };

    if (direction === "close") {
      open.delete(id);
      rebuild();
      return;
    }

    open.add(id);

    if (!loaded.has(id)) {
      loading.add(id);
      rebuild();
      load_children(row.node);
    } else {
      rebuild();
    }
  };

  const scroll_to_id = (id: string) => {
    const index = rows.findIndex((r) => uris_equal(r.id, id));
    if (index === -1) return;

    const scroll_el = opts.scrollViewport ?? list.viewport;
    const item_top = index * opts.rowHeight;
    const item_bottom = item_top + opts.rowHeight;
    const view_top = scroll_el.scrollTop;
    const view_bottom = view_top + scroll_el.clientHeight;

    if (item_top < view_top) {
      scroll_el.scrollTop = item_top;
    } else if (item_bottom > view_bottom) {
      scroll_el.scrollTop = item_bottom - scroll_el.clientHeight;
    }
  };

  const start_add_node = (parent_id: string, type: "file" | "folder") => {
    open.add(parent_id);
    editing_node_id = `__adding_${type}_${parent_id}`;

    const result = find_node_by_id(opts.folderStructure.structure, parent_id);
    if (!result) return;

    const parent_depth = rows.find((r) => r.id === parent_id)?.depth ?? 0;
    const parent_index = rows.findIndex((r) => r.id === parent_id);

    if (parent_index === -1) {
      rebuild();
      return;
    }

    const temp_row: FlatRow = {
      id: editing_node_id,
      label: "",
      depth: parent_depth + 1,
      node: { id: editing_node_id, type, name: "", path: "" } as INode,
    };

    const new_rows = [...rows];
    new_rows.splice(parent_index + 1, 0, temp_row);
    rows = new_rows;
    list.setItems(rows);
  };

  const start_rename = (node_id: string) => {
    editing_node_id = `__renaming_${node_id}`;

    setTimeout(() => {
      rebuild();
    }, 100);
  };

  const delete_node = async (node_id: string) => {
    const result = find_node_by_id(opts.folderStructure.structure, node_id);
    if (!result) return;

    const type = result.node.type === "folder" ? "folder" : "file";
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      if (type === "file") await explorer.actions.delete_file(result.node.path);
      else await explorer.actions.delete_file(result.node.path);
    } catch {}
  };

  const get_context_menu_items = (row: FlatRow): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (row.node.type === "file") {
      items.push(
        {
          type: "item",
          label: "Open in editor",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
            open_editor_tab(row.node.path);
          },
        },
        {
          type: "separator",
        },
      );
    }

    if (row.node.type === "folder") {
      items.push(
        {
          type: "item",
          label: "Highlight in tree",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
            const tree = explorer.tree.tree;
            if (!tree) return;

            tree.highlight(row.node.id);
          },
        },
        {
          type: "separator",
        },
      );
      items.push(
        {
          type: "item",
          label: "New File",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
            start_add_node(row.id, "file");
          },
        },
        {
          type: "item",
          label: "New Folder",
          onClick: () => {
            selected.id = row.id;
            list.refresh();
            start_add_node(row.id, "folder");
          },
        },
        { type: "separator" },
      );
    }

    items.push(
      {
        type: "item",
        label: "Rename",
        onClick: () => {
          selected.id = row.id;
          list.refresh();
          start_rename(row.id);
        },
        command_id: "F2",
      },
      {
        type: "item",
        label: "Delete",
        onClick: () => {
          selected.id = row.id;
          list.refresh();
          delete_node(row.id);
        },
        command_id: "Delete",
      },
    );

    return items;
  };

  const is_active = (id: string) => uris_equal(id, selected.id);

  const scroll = ScrollArea({
    class: "flex flex-col overflow-hidden h-full",
  });
  const el = scroll.el;

  const is_typing_target = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if ((el as any).isContentEditable) return true;
    return false;
  };

  const is_context_menu_open = () => {
    const cm = contextMenu.el as HTMLElement;
    return cm && cm.style.display !== "none";
  };

  const click_selected = () => {
    const id = selected.id;
    if (!id) return;

    const row = rows.find((r) => uris_equal(r.id, id));
    if (!row) return;

    if (row.node.type === "folder") {
      handle_folder_click(row);
      return;
    }

    opts.onSelect?.(row.id, row.node);
    list.refresh();
  };

  const rename_selected = () => {
    const id = selected.id;
    if (!id) return;

    const row = rows.find((r) => uris_equal(r.id, id));
    if (!row) return;

    start_rename(row.id);
  };

  const delete_selected = () => {
    const id = selected.id;
    if (!id) return;

    const row = rows.find((r) => uris_equal(r.id, id));
    if (!row) return;

    delete_node(row.id);
  };

  const on_local_key = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (is_typing_target(e.target)) return;
    if (is_context_menu_open()) return;

    if (e.key === "F2") {
      e.preventDefault();
      rename_selected();
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      delete_selected();
      return;
    }

    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      click_selected();
      return;
    }
  };

  el.tabIndex = 0;

  el.addEventListener("keydown", on_local_key, true);

  el.addEventListener(
    "mousedown",
    () => {
      // if (document.activeElement !== el) el.focus();
    },
    true,
  );

  const list = VirtualList<FlatRow>({
    items: rows,
    itemHeight: opts.rowHeight,
    height: opts.height,
    class: cn("min-h-0 min-w-0 overflow-hidden", opts.class),
    overscan: 8,
    cache: false,
    scrollViewport: scroll.viewport,
    key: (r) =>
      `${r.id}:${open.has(r.id)}:${loading.has(r.id)}:${is_active(r.id)}:${editing_node_id === `__renaming_${r.id}`}`,
    render: (row) => {
      if (
        editing_node_id &&
        editing_node_id.startsWith("__adding_") &&
        row.id === editing_node_id
      ) {
        const type = editing_node_id.includes("_file_") ? "file" : "folder";
        const parent_id = editing_node_id.replace(`__adding_${type}_`, "");
        const result = find_node_by_id(
          opts.folderStructure.structure,
          parent_id,
        );

        if (result) {
          return create_add_node_input({
            type,
            parentId: parent_id,
            parentPath: result.node.path,
            name: row.node.name,
            nodes: opts.folderStructure.structure,
            indent,
            depth: row.depth,
            onComplete: async (new_node) => {
              editing_node_id = null;

              if (type === "file") {
                selected.id = new_node.id;
                opts.onSelect?.(new_node.id, new_node);

                try {
                  await explorer.actions.create_file(new_node.path, "");
                } catch {}
              } else {
                try {
                  await explorer.actions.create_dir(new_node.path);
                } catch {}
              }
            },
            onCancel: () => {
              editing_node_id = null;
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
          onComplete: async (old_uri: string, new_uri: string) => {
            editing_node_id = null;
            rebuild();

            try {
              await explorer.actions.rename(old_uri, new_uri);

              const editor = editors_registry[get_file_extension(new_uri)];
              if (!editor) return;

              editor.update_model_uri(old_uri, new_uri);
            } catch (e) {
              console.error("[rename] failed:", e);
            }
          },
          onCancel: () => {
            editing_node_id = null;
            rebuild();
          },
        });
      }

      const is_loading = loading.has(row.id);
      const is_open = open.has(row.id);
      const active = is_active(row.id);

      const caret =
        row.node.type === "folder" &&
        (() => {
          const span = h("span", {
            class:
              "mr-1 opacity-70 inline-flex items-center [&_svg]:w-4 [&_svg]:h-4",
            "data-caret": "1",
            style: `display:inline-flex;align-items:center;transform:rotate(${is_open ? "90deg" : "0deg"});`,
          });

          if (is_loading) {
            span.style.animation = "vt-spin 1s linear infinite";
            span.style.transition = "none";
          }

          span.appendChild(lucide("chevron-right"));
          return span;
        })();

      const file_icon =
        row.node.type !== "folder" && h("img", { class: "w-4 h-4 mr-1" });
      if (file_icon && opts.get_icon && opts.icon_folder_name)
        file_icon.src = `./${opts.icon_folder_name}/${opts.get_icon(row.id)}`;

      const left = h(
        "div",
        { class: "ml-2 flex items-center min-w-0" },
        caret,
        file_icon,
        h("span", { class: "truncate font-normal" }, row.label),
      );

      const right = opts.renderRight ? opts.renderRight(row) : null;

      const row_el = h(
        "div",
        {
          "data-row-id": row.id,
          class: cn(
            "px-2 flex items-center justify-between select-none cursor-pointer text-[13px]",
            active
              ? "bg-explorer-item-active-background text-explorer-item-active-foreground"
              : "text-explorer-foreground hover:bg-explorer-item-hover-background hover:text-explorer-item-hover-foreground",
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
          tooltip: {
            text: norm(row.node.path),
            delay: 200,
          },
        },
        left,
        right ?? "",
      );

      contextMenu.bind(row_el, () => get_context_menu_items(row));

      return row_el;
    },
  });

  let rebuild_raf = 0;
  const rebuild_debounced = () => {
    if (rebuild_raf) cancelAnimationFrame(rebuild_raf);
    rebuild_raf = requestAnimationFrame(() => {
      rebuild_raf = 0;
      rebuild();
    });
  };

  const fix_set = (set: Set<string>, path: string, next_path?: string) => {
    for (const id of [...set]) {
      if (uris_equal(id, path) || is_descendant_of(id, path)) {
        set.delete(id);
        if (next_path) {
          set.add(rebase_uri(id, path, next_path));
        }
      }
    }
  };

  const root_id = norm(opts.folderStructure.path);

  contextMenu.bind(el, () => [
    {
      type: "item",
      label: "New File",
      onClick: () => start_add_node(root_id, "file"),
    },
    {
      type: "item",
      label: "New Folder",
      onClick: () => start_add_node(root_id, "folder"),
    },
  ]);

  el.appendChild(list.el);
  rebuild();

  return {
    el,
    setFolderStructure(next: IFolderStructure) {
      opts.folderStructure = {
        ...next,
        structure: deep_clone_nodes(next.structure),
      };
      loaded.clear();
      load_queue.clear();
      open.clear();
      pending_caret_anim = null;
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
    select: async (id: string) => {
      selected.id = norm(id);
      await expand_to(id);
      rebuild();

      requestAnimationFrame(() => scroll_to_id(norm(id)));
    },
    highlight: async (id: string) => {
      selected.id = norm(id);
      await expand_to(id);
      rebuild();
      requestAnimationFrame(() => scroll_to_id(norm(id)));
    },
    clear_highlight() {
      selected.id = "";
      list.refresh();
    },
    mutate(fn: (nodes: INode[]) => void) {
      fn(opts.folderStructure.structure);
      rebuild();
    },
    add(node: INode) {
      add_node(opts.folderStructure.structure, node, opts.folderStructure.path);
      rebuild_debounced();
    },
    remove(path: string) {
      remove_node_by_path(opts.folderStructure.structure, path);

      fix_set(open, path);
      fix_set(loaded, path);

      load_queue.forEach((_, key) => {
        if (uris_equal(key, path) || is_descendant_of(key, path)) {
          load_queue.delete(key);
        }
      });

      if (
        uris_equal(selected.id, path) ||
        is_descendant_of(selected.id, path)
      ) {
        selected.id = "";
      }

      rebuild_debounced();
    },
    rename(prev_path: string, next_path: string) {
      rename_by_path(opts.folderStructure.structure, prev_path, next_path);

      fix_set(open, prev_path, next_path);
      fix_set(loaded, prev_path, next_path);

      if (
        uris_equal(selected.id, prev_path) ||
        is_descendant_of(selected.id, prev_path)
      ) {
        selected.id = rebase_uri(selected.id, prev_path, next_path);
      }

      rebuild_debounced();
    },
    destroy() {
      list.destroy();
      contextMenu.destroy();
      el.removeEventListener("keydown", on_local_key, true);
    },
  };
}
