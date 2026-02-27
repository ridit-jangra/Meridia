import { INode } from "../../../../shared/types/explorer.types";
import {
  norm,
  get_drive,
  path_parts,
  join_path,
  generate_child_uri,
  get_basename,
  rebase_uri,
  uris_equal,
  is_descendant_of,
} from "../../../../shared/uri/generate";
import {
  close_editor_tab,
  update_editor_tab_status,
} from "../../../services/editor/editor.helper";

export type FlatRow = {
  id: string;
  label: string;
  depth: number;
  node: INode;
  isRoot?: boolean;
};

export function sort_nodes(nodes: INode[]): INode[] {
  return [...nodes].sort((a, b) => {
    const a_is_folder = a.type === "folder";
    const b_is_folder = b.type === "folder";

    if (a_is_folder && !b_is_folder) return -1;
    if (!a_is_folder && b_is_folder) return 1;

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

export function flatten_tree(
  nodes: INode[],
  depth: number,
  open_set: Set<string>,
  out: FlatRow[] = [],
): FlatRow[] {
  const sorted = sort_nodes(nodes);

  for (const n of sorted) {
    out.push({
      id: n.id,
      label: n.name,
      depth,
      node: n,
    });

    if (
      n.type === "folder" &&
      open_set.has(n.id) &&
      n.child_nodes &&
      n.child_nodes.length > 0
    ) {
      flatten_tree(n.child_nodes, depth + 1, open_set, out);
    }
  }

  return out;
}

export function find_node_by_id(
  nodes: INode[],
  id: string,
): { node: INode; parent: INode | null } | null {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parent: null };
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      const result = find_node_in_children(node.child_nodes, id, node);
      if (result) return result;
    }
  }
  return null;
}

function find_node_in_children(
  nodes: INode[],
  id: string,
  parent: INode,
): { node: INode; parent: INode } | null {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parent };
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      const result = find_node_in_children(node.child_nodes, id, node);
      if (result) return result;
    }
  }
  return null;
}

export function add_node_to_parent(
  nodes: INode[],
  parent_id: string,
  new_node: INode,
): boolean {
  const result = find_node_by_id(nodes, parent_id);
  if (!result) return false;

  const { node: parent } = result;
  if (parent.type !== "folder") return false;

  if (!parent.child_nodes) {
    parent.child_nodes = [];
  }

  parent.child_nodes.push(new_node);
  return true;
}

export function remove_node(nodes: INode[], id: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      nodes.splice(i, 1);
      return true;
    }
    if (nodes[i].child_nodes && nodes[i].child_nodes!.length > 0) {
      if (remove_node(nodes[i].child_nodes!, id)) {
        return true;
      }
    }
  }
  return false;
}

export function rename_node(
  nodes: INode[],
  id: string,
  new_name: string,
): boolean {
  const result = find_node_by_id(nodes, id);
  if (!result) return false;

  const { node } = result;
  node.name = new_name;

  const old_path = node.path;

  const parts = path_parts(old_path);
  parts[parts.length - 1] = new_name;
  const drive = get_drive(old_path);
  const rebuilt = join_path(drive, parts);

  node.path = rebuilt;
  node.id = rebuilt;

  if (node.type === "folder" && node.child_nodes) {
    update_child_paths(node.child_nodes, old_path, rebuilt);
  }

  return true;
}

function update_child_paths(
  nodes: INode[],
  old_parent_path: string,
  new_parent_path: string,
) {
  for (const node of nodes) {
    node.path = rebase_uri(node.path, old_parent_path, new_parent_path);
    node.id = node.path;

    if (node.type === "folder" && node.child_nodes) {
      update_child_paths(node.child_nodes, old_parent_path, new_parent_path);
    }
  }
}

export function generate_node_id(parent_path: string, name: string): string {
  return generate_child_uri(parent_path, name);
}

export function name_exists_in_folder(
  nodes: INode[],
  parent_id: string,
  name: string,
): boolean {
  const result = find_node_by_id(nodes, parent_id);
  if (!result || result.node.type !== "folder") return false;

  const children = result.node.child_nodes || [];
  return children.some((child) => child.name === name);
}

function find_node_by_path(nodes: INode[], path: string): INode | null {
  for (const node of nodes) {
    if (uris_equal(node.path, path)) return node;
    if (node.child_nodes?.length) {
      const found = find_node_by_path(node.child_nodes, path);
      if (found) return found;
    }
  }
  return null;
}

function ensure_parents(
  nodes: INode[],
  normalized_path: string,
  workspace_root?: string,
): void {
  const drive = get_drive(normalized_path);
  const parts = path_parts(normalized_path);
  parts.pop();

  // const root_parts = workspace_root ? path_parts(workspace_root) : [];

  for (let i = 1; i <= parts.length; i++) {
    const ancestor_path = join_path(drive, parts.slice(0, i));

    if (
      workspace_root &&
      (uris_equal(ancestor_path, workspace_root) ||
        !ancestor_path.startsWith(norm(workspace_root)))
    ) {
      continue;
    }

    if (!find_node_by_path(nodes, ancestor_path)) {
      const folder_node: INode = {
        id: ancestor_path,
        name: parts[i - 1],
        path: ancestor_path,
        type: "folder",
        child_nodes: [],
      };

      const grand_parent_parts = parts.slice(0, i - 1);
      if (
        grand_parent_parts.length === 0 ||
        uris_equal(join_path(drive, grand_parent_parts), workspace_root ?? "")
      ) {
        nodes.push(folder_node);
      } else {
        const grand_parent_path = join_path(drive, grand_parent_parts);
        add_node_recursive(nodes, grand_parent_path, folder_node);
      }
    }
  }
}

export function add_node(
  nodes: INode[],
  new_node: INode,
  workspace_path?: string,
): boolean {
  new_node.path = norm(new_node.path);
  new_node.id = norm(new_node.id);

  const drive = get_drive(new_node.path);
  const parts = path_parts(new_node.path);
  parts.pop();

  if (parts.length === 0) {
    nodes.push(new_node);
    return true;
  }

  const parent_path = norm(join_path(drive, parts));

  if (workspace_path && uris_equal(parent_path, norm(workspace_path))) {
    nodes.push(new_node);
    return true;
  }

  ensure_parents(
    nodes,
    new_node.path,
    workspace_path ? norm(workspace_path) : undefined,
  );

  return add_node_recursive(nodes, parent_path, new_node);
}

function add_node_recursive(
  nodes: INode[],
  parent_path: string,
  new_node: INode,
): boolean {
  for (const node of nodes) {
    if (uris_equal(node.path, parent_path)) {
      if (node.type !== "folder") return false;
      if (!node.child_nodes) node.child_nodes = [];
      node.child_nodes.push(new_node);
      return true;
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      if (add_node_recursive(node.child_nodes, parent_path, new_node))
        return true;
    }
  }
  return false;
}

export function remove_node_by_path(nodes: INode[], path: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (uris_equal(nodes[i].path, path)) {
      nodes.splice(i, 1);
      return true;
    }
    if (nodes[i].child_nodes && nodes[i].child_nodes!.length > 0) {
      if (remove_node_by_path(nodes[i].child_nodes!, path)) {
        update_editor_tab_status(path, "DELETED");
        return true;
      }
    }
  }
  return false;
}

export function rename_by_path(
  nodes: INode[],
  prev_path: string,
  next_path: string,
): boolean {
  const normalized_prev = norm(prev_path);
  const normalized_next = norm(next_path);

  for (const node of nodes) {
    if (uris_equal(node.path, normalized_prev)) {
      node.name = get_basename(normalized_next);
      node.path = normalized_next;
      node.id = normalized_next;

      if (node.type === "folder" && node.child_nodes) {
        update_child_paths_by_prefix(
          node.child_nodes,
          normalized_prev,
          normalized_next,
        );
      }
      return true;
    }

    if (node.child_nodes && node.child_nodes.length > 0) {
      if (rename_by_path(node.child_nodes, prev_path, next_path)) return true;
    }
  }
  return false;
}

function update_child_paths_by_prefix(
  nodes: INode[],
  old_prefix: string,
  new_prefix: string,
): void {
  for (const node of nodes) {
    node.path = rebase_uri(node.path, old_prefix, new_prefix);
    node.id = node.path;

    if (node.type === "folder" && node.child_nodes) {
      update_child_paths_by_prefix(node.child_nodes, old_prefix, new_prefix);
    }
  }
}

export { norm, uris_equal, is_descendant_of };
