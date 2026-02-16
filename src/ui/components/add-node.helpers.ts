import { INode } from "../../../shared/types/explorer.types";
import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import { lucide } from "./icon";
import {
  addNodeToParent,
  generateNodeId,
  nameExistsInFolder,
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

export function createAddNodeInput(opts: AddNodeOptions): HTMLElement {
  const {
    type,
    parentId,
    parentPath,
    nodes,
    indent,
    depth,
    onComplete,
    onCancel,
  } = opts;

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

  const submit = () => {
    if (submitted) return;
    submitted = true;

    const name = input.value.trim();
    if (!name) {
      onCancel();
      return;
    }

    // Check if name already exists
    if (nameExistsInFolder(nodes, parentId, name)) {
      alert(`A ${type} with the name "${name}" already exists.`);
      onCancel();
      return;
    }

    const newId = generateNodeId(parentPath, name);
    const newNode: INode = {
      id: newId,
      type,
      name,
      path: newId,
      child_nodes: type === "folder" ? [] : [],
    };

    const success = addNodeToParent(nodes, parentId, newNode);
    if (success) {
      onComplete(newNode);
    } else {
      onCancel();
    }
  };

  const cancel = () => {
    if (submitted) return;
    submitted = true;
    onCancel();
  };

  // Handle input events
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
    // Small delay to allow click events to fire first
    setTimeout(() => {
      if (!submitted) cancel();
    }, 150);
  });

  // Focus the input immediately
  setTimeout(() => input.focus(), 0);

  return container;
}

export function addFile(
  nodes: INode[],
  parentId: string,
  parentPath: string,
  fileName: string,
): INode | null {
  if (nameExistsInFolder(nodes, parentId, fileName)) {
    return null;
  }

  const newId = generateNodeId(parentPath, fileName);
  const newNode: INode = {
    id: newId,
    type: "file",
    name: fileName,
    path: newId,
    child_nodes: [],
  };

  const success = addNodeToParent(nodes, parentId, newNode);
  return success ? newNode : null;
}

export function addFolder(
  nodes: INode[],
  parentId: string,
  parentPath: string,
  folderName: string,
): INode | null {
  if (nameExistsInFolder(nodes, parentId, folderName)) {
    return null;
  }

  const newId = generateNodeId(parentPath, folderName);
  const newNode: INode = {
    id: newId,
    type: "folder",
    name: folderName,
    path: newId,
    child_nodes: [],
  };

  const success = addNodeToParent(nodes, parentId, newNode);
  return success ? newNode : null;
}
