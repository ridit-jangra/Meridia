import { INode } from "../../../../shared/types/explorer.types";
import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";
import { lucide } from "../icon";
import {
  renameNode,
  nameExistsInFolder,
  findNodeById,
} from "./virtual-tree.helpers";

export type RenameNodeOptions = {
  nodeId: string;
  nodes: INode[];
  indent: number;
  depth: number;
  currentName: string;
  isFolder: boolean;
  onComplete: (newName: string) => void;
  onCancel: () => void;
  get_icon?: (name: string) => string;
  icon_folder_name?: string;
};

export function create_rename_input(opts: RenameNodeOptions): HTMLElement {
  const {
    nodeId,
    nodes,
    indent,
    depth,
    currentName,
    isFolder,
    onComplete,
    onCancel,
    get_icon,
    icon_folder_name,
  } = opts;

  let submitted = false;

  const input = h("input", {
    type: "text",
    value: currentName,
    class: cn(
      "bg-transparent text-explorer-foreground outline-none border-none",
      "text-[12.5px] flex-1 min-w-0 px-1",
    ),
  }) as HTMLInputElement;

  let iconEl: HTMLElement;
  if (isFolder) {
    iconEl = h("span", { class: "opacity-70 mr-1" }, lucide("folder"));
  } else {
    iconEl = h("img", { class: "w-4 h-4 mr-1" }) as HTMLImageElement;
    if (get_icon && icon_folder_name) {
      (iconEl as HTMLImageElement).src =
        `./${icon_folder_name}/${get_icon(nodeId)}`;
    }
  }

  const container = h(
    "div",
    {
      class: cn(
        "px-2 flex items-center",
        "bg-explorer-item-active-background text-explorer-item-active-foreground",
      ),
      style: `padding-left:${6 + depth * indent}px;`,
    },
    iconEl,
    input,
  );

  const submit = () => {
    if (submitted) return;
    submitted = true;

    const newName = input.value.trim();
    if (!newName || newName === currentName) {
      onCancel();
      return;
    }

    const result = findNodeById(nodes, nodeId);
    if (result && result.parent) {
      if (nameExistsInFolder(nodes, result.parent.id, newName)) {
        alert(
          `A ${isFolder ? "folder" : "file"} with the name "${newName}" already exists.`,
        );
        onCancel();
        return;
      }
    }

    const success = renameNode(nodes, nodeId, newName);
    if (success) {
      onComplete(newName);
    } else {
      onCancel();
    }
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

  setTimeout(() => {
    input.focus();
    if (!isFolder && currentName.includes(".")) {
      const dotIndex = currentName.lastIndexOf(".");
      input.setSelectionRange(0, dotIndex);
    } else {
      input.select();
    }
  }, 0);

  return container;
}
