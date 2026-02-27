import { INode } from "../../../../shared/types/explorer.types";
import { h } from "../../../core/dom/h";
import { cn } from "../../../core/utils/cn";
import { lucide } from "../icon";
import {
  rename_node,
  name_exists_in_folder,
  find_node_by_id,
} from "./virtual-tree.helpers";
import {
  generate_child_uri,
  get_parent_uri,
} from "../../../../shared/uri/generate";

export type rename_node_options = {
  nodeId: string;
  nodes: INode[];
  indent: number;
  depth: number;
  currentName: string;
  isFolder: boolean;
  onComplete: (old_path: string, new_path: string) => void;
  onCancel: () => void;
  get_icon?: (name: string) => string;
  icon_folder_name?: string;
};

export function create_rename_input(opts: rename_node_options): HTMLElement {
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
      "text-[13.5px] flex-1 min-w-0 px-1",
    ),
  }) as HTMLInputElement;

  input.spellcheck = false;

  let iconEl: HTMLElement;
  if (isFolder) {
    iconEl = h(
      "span",
      { class: "ml-2 inline-flex items-center [&_svg]:w-4 [&_svg]:h-4" },
      lucide("chevron-right"),
    );
  } else {
    iconEl = h("img", { class: "ml-2 w-4 h-4" }) as HTMLImageElement;
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

    const new_name = input.value.trim();

    if (!new_name || new_name === currentName) {
      onCancel();
      return;
    }

    const parent_uri = get_parent_uri(nodeId);
    const new_uri = generate_child_uri(parent_uri, new_name);

    const result = find_node_by_id(nodes, nodeId);

    if (result && result.parent) {
      if (name_exists_in_folder(nodes, result.parent.id, new_name)) {
        alert(
          `A ${isFolder ? "folder" : "file"} with the name "${new_name}" already exists.`,
        );
        onCancel();
        return;
      }
    }

    const success = rename_node(nodes, nodeId, new_name);

    if (success) {
      onComplete(nodeId, new_uri);
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
    }, 300);
  });

  setTimeout(() => {
    input.focus();
    if (!isFolder && currentName.includes(".")) {
      const dot_index = currentName.lastIndexOf(".");
      input.setSelectionRange(0, dot_index);
    } else {
      input.select();
    }
  }, 0);

  return container;
}
