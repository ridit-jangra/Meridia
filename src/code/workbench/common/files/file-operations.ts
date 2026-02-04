import { IFolderStructure } from "../../workbench.types.js";
import { getFileIcon } from "../utils.js";
import { getThemeIcon } from "../../browser/media/icons.js";

const path = window.path;
const fs = window.fs;

export class FileOperations {
  private _isRenamingInProgress = false;

  get isRenamingInProgress(): boolean {
    return this._isRenamingInProgress;
  }

  async createFile(uri: string): Promise<boolean> {
    try {
      fs.createFile(uri);
      return true;
    } catch (error) {
      console.error("Failed to create file:", error);
      return false;
    }
  }

  async createFolder(uri: string): Promise<boolean> {
    try {
      fs.createFolder(uri);
      return true;
    } catch (error) {
      console.error("Failed to create folder:", error);
      return false;
    }
  }

  async deleteFile(uri: string): Promise<boolean> {
    try {
      fs.deleteFile(uri);
      return true;
    } catch (error) {
      console.error("Failed to delete file:", error);
      return false;
    }
  }

  async deleteFolder(uri: string): Promise<boolean> {
    try {
      fs.deleteFolder(uri);
      return true;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      return false;
    }
  }

  async rename(oldUri: string, newUri: string): Promise<boolean> {
    this._isRenamingInProgress = true;

    try {
      fs.rename(oldUri, newUri);
      return true;
    } catch (error) {
      console.error("Failed to rename:", error);
      return false;
    } finally {
      setTimeout(() => {
        this._isRenamingInProgress = false;
      }, 100);
    }
  }

  startRename(
    nodeUri: string,
    nodeElement: HTMLElement,
    onComplete: (confirmed: boolean, newName?: string) => void
  ) {
    const nameSpan = nodeElement.querySelector(".name") as HTMLElement;
    if (!nameSpan) return;

    const originalName = nameSpan.textContent || "";

    const input = document.createElement("input");
    input.type = "text";
    input.value = originalName;
    input.className = "inline-editor-input";

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEdit = (confirmed: boolean) => {
      const newName = input.value.trim();
      input.replaceWith(nameSpan);

      if (confirmed && newName && newName !== originalName) {
        onComplete(true, newName);
      } else {
        onComplete(false);
      }
    };

    input.addEventListener("blur", () => finishEdit(false));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishEdit(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finishEdit(false);
      }
    });
  }

  startAddNode(
    parentUri: string,
    type: "file" | "folder",
    container: HTMLElement,
    depth: number,
    onComplete: (confirmed: boolean, name?: string) => void
  ) {
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.innerHTML =
      type === "file" ? getFileIcon("file.txt") : getThemeIcon("chevronRight");

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `New ${type}...`;
    input.className = "inline-editor-input";

    if (type === "file") {
      input.oninput = (event) => {
        icon.innerHTML = getFileIcon((event.target as HTMLInputElement).value);
      };
    }

    const tempNode = document.createElement("div");
    tempNode.className = "node temp-node";
    tempNode.appendChild(icon);
    tempNode.appendChild(input);
    tempNode.style.paddingLeft = `${depth * 1.4}rem`;

    container.insertBefore(tempNode, container.firstChild);
    input.focus();

    let isProcessing = false;

    const finishAdd = (confirmed: boolean) => {
      if (isProcessing) return;
      isProcessing = true;

      const name = input.value.trim();
      tempNode.remove();

      if (confirmed && name) {
        onComplete(true, name);
      } else {
        onComplete(false);
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishAdd(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finishAdd(false);
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => finishAdd(false), 100);
    });
  }

  createContextMenu(
    x: number,
    y: number,
    node: IFolderStructure,
    handlers: {
      onOpen: () => void;
      onRename: () => void;
      onNewFile: () => void;
      onNewFolder: () => void;
      onDelete: () => void;
    }
  ): HTMLElement {
    const contextMenu = document.createElement("div");
    contextMenu.className = "context-menu";
    contextMenu.style.position = "fixed";
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.display = "block";
    contextMenu.style.zIndex = "1000";

    const ul = document.createElement("ul");

    const items = [
      {
        text: "Open",
        className: "cm-open",
        show: node.type === "file",
        handler: handlers.onOpen,
      },
      {
        text: "Rename",
        className: "cm-rename",
        show: true,
        handler: handlers.onRename,
      },
      {
        text: "New File",
        className: "cm-new-file",
        show: node.type === "folder",
        handler: handlers.onNewFile,
      },
      {
        text: "New Folder",
        className: "cm-new-folder",
        show: node.type === "folder",
        handler: handlers.onNewFolder,
      },
      {
        text: "Delete",
        className: "cm-delete",
        show: true,
        handler: handlers.onDelete,
      },
    ];

    items.forEach((item) => {
      if (item.show) {
        const li = document.createElement("li");
        li.textContent = item.text;
        li.className = item.className;
        li.onclick = () => {
          item.handler();
          contextMenu.remove();
        };
        ul.appendChild(li);
      }
    });

    contextMenu.appendChild(ul);

    const closeHandler = (e: MouseEvent) => {
      if (!contextMenu.contains(e.target as Node)) {
        contextMenu.remove();
        document.removeEventListener("click", closeHandler);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", closeHandler);
    }, 0);

    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        contextMenu.remove();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);

    return contextMenu;
  }
}
