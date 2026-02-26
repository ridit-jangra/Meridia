import { INode } from "../../../../shared/types/explorer.types";

export type FlatRow = {
  id: string;
  label: string;
  depth: number;
  node: INode;
  isRoot?: boolean;
};

export function sortNodes(nodes: INode[]): INode[] {
  return [...nodes].sort((a, b) => {
    const aIsFolder = a.type === "folder";
    const bIsFolder = b.type === "folder";

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

export function flattenTree(
  nodes: INode[],
  depth: number,
  openSet: Set<string>,
  out: FlatRow[] = [],
): FlatRow[] {
  const sorted = sortNodes(nodes);

  for (const n of sorted) {
    out.push({
      id: n.id,
      label: n.name,
      depth,
      node: n,
    });

    if (
      n.type === "folder" &&
      openSet.has(n.id) &&
      n.child_nodes &&
      n.child_nodes.length > 0
    ) {
      flattenTree(n.child_nodes, depth + 1, openSet, out);
    }
  }

  return out;
}

export function findNodeById(
  nodes: INode[],
  id: string,
): { node: INode; parent: INode | null } | null {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parent: null };
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      const result = findNodeInChildren(node.child_nodes, id, node);
      if (result) return result;
    }
  }
  return null;
}

function findNodeInChildren(
  nodes: INode[],
  id: string,
  parent: INode,
): { node: INode; parent: INode } | null {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parent };
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      const result = findNodeInChildren(node.child_nodes, id, node);
      if (result) return result;
    }
  }
  return null;
}

export function addNodeToParent(
  nodes: INode[],
  parentId: string,
  newNode: INode,
): boolean {
  const result = findNodeById(nodes, parentId);
  if (!result) return false;

  const { node: parent } = result;
  if (parent.type !== "folder") return false;

  if (!parent.child_nodes) {
    parent.child_nodes = [];
  }

  parent.child_nodes.push(newNode);
  return true;
}

export function removeNode(nodes: INode[], id: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      nodes.splice(i, 1);
      return true;
    }
    if (nodes[i].child_nodes && nodes[i].child_nodes!.length > 0) {
      if (removeNode(nodes[i].child_nodes!, id)) {
        return true;
      }
    }
  }
  return false;
}

export function renameNode(
  nodes: INode[],
  id: string,
  newName: string,
): boolean {
  const result = findNodeById(nodes, id);
  if (!result) return false;

  const { node } = result;
  node.name = newName;

  const oldPath = node.path;
  const pathParts = oldPath.split("/");
  pathParts[pathParts.length - 1] = newName;
  const newPath = pathParts.join("/");
  node.path = newPath;

  node.id = newPath === "/" ? newName : newPath;

  if (node.type === "folder" && node.child_nodes) {
    updateChildPaths(node.child_nodes, oldPath, newPath);
  }

  return true;
}

function updateChildPaths(
  nodes: INode[],
  oldParentPath: string,
  newParentPath: string,
) {
  for (const node of nodes) {
    node.path = node.path.replace(oldParentPath, newParentPath);
    node.id = node.path;

    if (node.type === "folder" && node.child_nodes) {
      updateChildPaths(node.child_nodes, oldParentPath, newParentPath);
    }
  }
}

export function generateNodeId(parentPath: string, name: string): string {
  const cleanPath = parentPath === "/" ? "" : parentPath;
  return `${cleanPath}/${name}`;
}

export function nameExistsInFolder(
  nodes: INode[],
  parentId: string,
  name: string,
): boolean {
  const result = findNodeById(nodes, parentId);
  if (!result || result.node.type !== "folder") return false;

  const children = result.node.child_nodes || [];
  return children.some((child) => child.name === name);
}

export function add_node(nodes: INode[], newNode: INode): boolean {
  const parts = newNode.path.split("/").filter(Boolean);
  parts.pop();
  const parentPath = parts.length === 0 ? "/" : "/" + parts.join("/");

  if (parentPath === "/") {
    nodes.push(newNode);
    return true;
  }

  return add_node_recursive(nodes, parentPath, newNode);
}

function add_node_recursive(
  nodes: INode[],
  parentPath: string,
  newNode: INode,
): boolean {
  for (const node of nodes) {
    if (node.path === parentPath) {
      if (node.type !== "folder") return false;
      if (!node.child_nodes) node.child_nodes = [];
      node.child_nodes.push(newNode);
      return true;
    }
    if (node.child_nodes && node.child_nodes.length > 0) {
      if (add_node_recursive(node.child_nodes, parentPath, newNode))
        return true;
    }
  }
  return false;
}

export function remove_node_by_path(nodes: INode[], path: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].path === path) {
      nodes.splice(i, 1);
      return true;
    }
    if (nodes[i].child_nodes && nodes[i].child_nodes!.length > 0) {
      if (remove_node_by_path(nodes[i].child_nodes!, path)) return true;
    }
  }
  return false;
}

export function rename_by_path(
  nodes: INode[],
  prevPath: string,
  nextPath: string,
): boolean {
  for (const node of nodes) {
    if (node.path === prevPath) {
      node.name = nextPath.split("/").filter(Boolean).pop() ?? nextPath;
      node.path = nextPath;
      node.id = nextPath;

      if (node.type === "folder" && node.child_nodes) {
        update_child_paths_by_prefix(node.child_nodes, prevPath, nextPath);
      }
      return true;
    }

    if (node.child_nodes && node.child_nodes.length > 0) {
      if (rename_by_path(node.child_nodes, prevPath, nextPath)) return true;
    }
  }
  return false;
}

function update_child_paths_by_prefix(
  nodes: INode[],
  oldPrefix: string,
  newPrefix: string,
): void {
  for (const node of nodes) {
    node.path = newPrefix + node.path.slice(oldPrefix.length);
    node.id = node.path;

    if (node.type === "folder" && node.child_nodes) {
      update_child_paths_by_prefix(node.child_nodes, oldPrefix, newPrefix);
    }
  }
}
