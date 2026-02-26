import { INode } from "../../../../shared/types/explorer.types";
import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";
import { lucide } from "../icon";
import {
  add_node_to_parent,
  generate_node_id,
  name_exists_in_folder,
} from "./virtual-tree.helpers";

export type AddNodeOptions = {
  type: "file" | "folder";
  parentId: string;
  parentPath: string;
  nodes: INode[];
  indent: number;
  depth: number;
  onComplete: (newNode: INode) => void;
  onCancel: () => void;
};

export function create_add_node_input(opts: AddNodeOptions): HTMLElement {
  const { type, parentPath, indent, depth, onComplete, onCancel } = opts;

  let submitted = false;

  const placeholder = type === "folder" ? "New folder..." : "New file...";

  const input = h("input", {
    type: "text",
    placeholder,
    class: cn(
      "bg-transparent text-explorer-foreground outline-none border-none",
      "text-[12.5px] flex-1 min-w-0 px-1",
    ),
  }) as HTMLInputElement;

  const icon = h(
    "span",
    { class: "opacity-70 mr-1" },
    type === "folder" ? lucide("folder") : lucide("file"),
  );

  const container = h(
    "div",
    {
      class: cn(
        "px-2 flex items-center",
        "bg-explorer-item-active-background text-explorer-item-active-foreground",
      ),
      style: `padding-left:${6 + depth * indent}px;`,
    },
    icon,
    input,
  );

  // add-node.helpers.ts
  const submit = () => {
    if (submitted) return;
    submitted = true;

    const name = input.value.trim();
    if (!name) {
      onCancel();
      return;
    }

    const newId = generate_node_id(parentPath, name);
    const newNode: INode = {
      id: newId,
      type,
      name,
      path: newId,
      child_nodes: [],
    };

    onComplete(newNode);
  };

  const cancel = () => {
    if (submitted) return;
    submitted = true;
    onCancel();
  };

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!submitted) cancel();
    }, 150);
  });

  setTimeout(() => input.focus(), 0);

  return container;
}

export function add_file(
  nodes: INode[],
  parentId: string,
  parentPath: string,
  fileName: string,
): INode | null {
  if (name_exists_in_folder(nodes, parentId, fileName)) {
    return null;
  }

  const newId = generate_node_id(parentPath, fileName);
  const newNode: INode = {
    id: newId,
    type: "file",
    name: fileName,
    path: newId,
    child_nodes: [],
  };

  const success = add_node_to_parent(nodes, parentId, newNode);
  return success ? newNode : null;
}

export function addFolder(
  nodes: INode[],
  parentId: string,
  parentPath: string,
  folderName: string,
): INode | null {
  if (name_exists_in_folder(nodes, parentId, folderName)) {
    return null;
  }

  const newId = generate_node_id(parentPath, folderName);
  const newNode: INode = {
    id: newId,
    type: "folder",
    name: folderName,
    path: newId,
    child_nodes: [],
  };

  const success = add_node_to_parent(nodes, parentId, newNode);
  return success ? newNode : null;
}
