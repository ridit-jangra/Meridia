import { IFolderStructure } from "../../workbench.types.js";
import { getFileIcon } from "../utils.js";
import { getThemeIcon } from "../../browser/media/icons.js";
import { Tooltip } from "../../browser/parts/tooltip/tooltip.js";

const path = window.path;

export class FileRenderer {
  _renderedNodes: Map<string, HTMLElement> = new Map();
  private _renderedChildContainers: Map<string, HTMLElement> = new Map();
  private _gitStatus: Map<string, "untracked" | "modified" | "ignored"> =
    new Map();
  private _folderStatus: Map<
    string,
    Set<"untracked" | "modified" | "ignored">
  > = new Map();
  _activeNodeUri: string | null = null;

  constructor(
    private onToggleFolder: (uri: string, nodeEl: HTMLElement) => void,
    private onOpenFile: (uri: string, name: string) => void,
    private onContextMenu: (
      x: number,
      y: number,
      node: IFolderStructure,
    ) => void,
  ) {}

  clear() {
    this._renderedNodes.clear();
    this._renderedChildContainers.clear();
    this._activeNodeUri = null;
  }

  renderTree(
    nodes: IFolderStructure[],
    container: HTMLElement,
    depth: number,
    expandedFolders: Set<string>,
    loadedFolders: Set<string>,
  ) {
    if (!Array.isArray(nodes)) return;

    nodes.forEach((node) => {
      if (!node || !node.name || !node.uri) return;

      const nodeElement = this.createNodeElement(node, depth, expandedFolders);
      container.appendChild(nodeElement);
      this._renderedNodes.set(node.uri, nodeElement);

      if (node.type === "folder") {
        const childContainer = this.createChildContainer(
          node.uri,
          expandedFolders,
        );
        container.appendChild(childContainer);
        this._renderedChildContainers.set(node.uri, childContainer);

        if (node.children && node.children.length > 0) {
          this.renderTree(
            node.children,
            childContainer,
            depth + 1,
            expandedFolders,
            loadedFolders,
          );
        }
      }
    });
  }

  getNodeState(
    node: HTMLElement,
  ): "modified" | "ignored" | "untracked" | "default" {
    if (node.classList.contains("modified")) return "modified";
    if (node.classList.contains("ignored")) return "ignored";
    if (node.classList.contains("untracked")) return "untracked";
    return "default";
  }

  createNodeElement(
    node: IFolderStructure,
    depth: number,
    expandedFolders: Set<string>,
  ): HTMLElement {
    const nodeEl = document.createElement("div");
    nodeEl.className = "node";
    nodeEl.dataset.nodeId = node.uri;
    nodeEl.dataset.nodeType = node.type;
    nodeEl.dataset.depth = depth.toString();
    nodeEl.style.setProperty("--nesting-depth", depth.toString());
    nodeEl.style.paddingLeft = `${depth * 1.4}rem`;

    const icon = document.createElement("span");
    icon.className = "icon";

    if (node.type === "file") {
      icon.innerHTML = getFileIcon(node.name);
    } else {
      const isExpanded = expandedFolders.has(node.uri);
      icon.innerHTML = getThemeIcon("chevronRight");
      icon.style.cursor = "pointer";
      icon.classList.add("toggle");

      if (isExpanded) {
        icon.classList.add("expanded");
      }

      icon.onclick = (e) => {
        e.stopPropagation();
        this.setActiveNode(node.uri);
        this.onToggleFolder(node.uri, nodeEl);
      };
    }

    const name = new Tooltip()._getEl(
      document.createElement("span"),
      () => `${node.uri} • ${this.getNodeState(nodeEl)}`,
      "bottom",
      500,
    );
    name.textContent = node.name;
    name.className = "name";

    if (node.type === "folder") {
      name.style.cursor = "pointer";
      name.onclick = (e) => {
        e.stopPropagation();
        this.setActiveNode(node.uri);
        this.onToggleFolder(node.uri, nodeEl);
      };
    }

    nodeEl.appendChild(icon);
    nodeEl.appendChild(name);

    nodeEl.onclick = (e) => {
      e.stopPropagation();
      this.setActiveNode(node.uri);
      if (node.type === "folder") {
        this.onToggleFolder(node.uri, nodeEl);
      } else {
        this.onOpenFile(node.uri, node.name);
      }
    };

    nodeEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.setActiveNode(node.uri);
      this.onContextMenu(e.clientX, e.clientY, node);
    });

    const normalizePath = (path: string) => path.replace(/\\\\/g, "\\");
    const normalizedUri = normalizePath(node.uri);

    if (node.type === "file") {
      const status = this._gitStatus.get(normalizedUri);
      if (status) {
        nodeEl.classList.add(status);
      }
    } else if (node.type === "folder") {
      const folderStatuses = this._folderStatus.get(normalizedUri);
      if (folderStatuses) {
        folderStatuses.forEach((status) => {
          nodeEl.classList.add(status);
        });
      }
    }

    return nodeEl;
  }

  createChildContainer(
    nodeId: string,
    expandedFolders: Set<string>,
  ): HTMLElement {
    const container = document.createElement("div");
    container.className = "child-nodes";
    container.dataset.nodeId = nodeId;

    const isExpanded = expandedFolders.has(nodeId);

    if (isExpanded) {
      this.showChildContainer(container);
    } else {
      this.hideChildContainer(container);
    }

    return container;
  }

  showChildContainer(container: HTMLElement) {
    container.style.height = "auto";
    container.style.opacity = "1";
    container.style.pointerEvents = "auto";
    container.style.visibility = "visible";
    container.classList.add("expanded");
  }

  hideChildContainer(container: HTMLElement) {
    container.style.height = "0px";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    container.style.visibility = "hidden";
    container.classList.remove("expanded");
  }

  getNodeElement(uri: string): HTMLElement | undefined {
    return this._renderedNodes.get(uri);
  }

  getChildContainer(uri: string): HTMLElement | undefined {
    return this._renderedChildContainers.get(uri);
  }

  updateNodeName(uri: string, newName: string) {
    const nodeElement = this._renderedNodes.get(uri);
    if (nodeElement) {
      const nameSpan = nodeElement.querySelector(".name") as HTMLElement;
      if (nameSpan) {
        nameSpan.textContent = newName;
      }
    }
  }

  updateNodeUri(oldUri: string, newUri: string) {
    const nodeElement = this._renderedNodes.get(oldUri);
    if (nodeElement) {
      nodeElement.dataset.nodeId = newUri;
      this._renderedNodes.delete(oldUri);
      this._renderedNodes.set(newUri, nodeElement);
    }

    const childContainer = this._renderedChildContainers.get(oldUri);
    if (childContainer) {
      childContainer.dataset.nodeId = newUri;
      this._renderedChildContainers.delete(oldUri);
      this._renderedChildContainers.set(newUri, childContainer);
    }

    // Update active node URI if it was the renamed node
    if (this._activeNodeUri === oldUri) {
      this._activeNodeUri = newUri;
    }
  }

  removeNode(uri: string) {
    const nodeElement = this._renderedNodes.get(uri);
    if (nodeElement) {
      nodeElement.remove();
      this._renderedNodes.delete(uri);
    }

    const childContainer = this._renderedChildContainers.get(uri);
    if (childContainer) {
      childContainer.remove();
      this._renderedChildContainers.delete(uri);
    }

    // Clear active node if it was the removed node
    if (this._activeNodeUri === uri) {
      this._activeNodeUri = null;
    }
  }

  addNodeToContainer(
    node: IFolderStructure,
    container: HTMLElement,
    depth: number,
    expandedFolders: Set<string>,
  ): HTMLElement {
    const nodeElement = this.createNodeElement(node, depth, expandedFolders);

    const insertPosition = this.findInsertPositionAlphabetically(
      container,
      node,
    );

    if (insertPosition) {
      container.insertBefore(nodeElement, insertPosition);
    } else {
      container.appendChild(nodeElement);
    }

    this._renderedNodes.set(node.uri, nodeElement);

    if (node.type === "folder") {
      const childContainer = this.createChildContainer(
        node.uri,
        expandedFolders,
      );

      if (nodeElement.nextSibling) {
        container.insertBefore(childContainer, nodeElement.nextSibling);
      } else {
        container.appendChild(childContainer);
      }

      this._renderedChildContainers.set(node.uri, childContainer);
    }

    return nodeElement;
  }

  findInsertPositionAlphabetically(
    container: HTMLElement,
    newNode: IFolderStructure,
  ): HTMLElement | null {
    const children = Array.from(container.children);
    const newNodeName = newNode.name.toLowerCase();
    const newNodeType = newNode.type;

    for (const child of children) {
      const element = child as HTMLElement;

      if (!element.classList.contains("node")) {
        continue;
      }

      const elementType = element.dataset.nodeType;
      const nameSpan = element.querySelector(".name") as HTMLElement;
      const elementName = nameSpan?.textContent?.toLowerCase() || "";

      if (newNodeType === "folder") {
        if (elementType === "file") {
          return element;
        }
        if (elementType === "folder" && elementName > newNodeName) {
          return element;
        }
      }

      if (newNodeType === "file" && elementType === "file") {
        if (elementName > newNodeName) {
          return element;
        }
      }
    }

    return null;
  }

  calculateDepth(container: HTMLElement): number {
    if (container.classList.contains("tree")) return 0;

    const prevSibling = container.previousElementSibling;
    if (
      prevSibling instanceof HTMLElement &&
      prevSibling.classList.contains("node")
    ) {
      const parentDepth = prevSibling.dataset.depth;
      if (parentDepth !== undefined) {
        return parseInt(parentDepth, 10) + 1;
      }
    }

    let parent: HTMLElement | null = container.parentElement;
    while (parent !== null && !parent.classList.contains("tree")) {
      if (parent.classList.contains("node")) {
        const parentDepth = parent.dataset.depth;
        if (parentDepth !== undefined) {
          return parseInt(parentDepth, 10) + 1;
        }
      }
      parent = parent.parentElement;
    }

    return 0;
  }

  animateToggle(
    container: HTMLElement,
    isExpanding: boolean,
    onComplete?: () => void,
  ) {
    if (isExpanding) {
      container.style.transition = "none";
      container.style.height = "0px";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      container.style.visibility = "hidden";

      container.offsetHeight;

      const height = container.scrollHeight;
      container.style.transition = "height 0.25s ease, opacity 0.25s ease";
      container.style.height = height + "px";
      container.style.opacity = "1";
      container.style.pointerEvents = "auto";
      container.style.visibility = "visible";

      setTimeout(() => {
        if (container) {
          container.style.height = "auto";
          container.classList.add("expanded");
        }
        onComplete?.();
      }, 250);
    } else {
      const height = container.scrollHeight;
      container.style.height = height + "px";

      container.offsetHeight;

      container.style.transition = "height 0.25s ease, opacity 0.25s ease";
      container.style.height = "0px";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      container.style.visibility = "hidden";

      container.classList.remove("expanded");

      setTimeout(() => {
        onComplete?.();
      }, 250);
    }
  }

  updateIconState(nodeElement: HTMLElement, isExpanded: boolean) {
    const icon = nodeElement.querySelector(".icon") as HTMLElement;
    if (icon) {
      if (isExpanded) {
        icon.classList.add("expanded");
      } else {
        icon.classList.remove("expanded");
      }
    }
  }

  /**
   * Set the active node by URI. Only one node can be active at a time.
   * Adds "active" class to the node element and removes it from the previously active node.
   */
  setActiveNode(uri: string) {
    // Remove active class from previously active node
    if (this._activeNodeUri !== null) {
      const previousActiveNode = this._renderedNodes.get(this._activeNodeUri);
      if (previousActiveNode) {
        previousActiveNode.classList.remove("active");
      }
    }

    // Set new active node
    this._activeNodeUri = uri;
    const newActiveNode = this._renderedNodes.get(uri);
    if (newActiveNode) {
      newActiveNode.classList.add("active");
    }
  }

  /**
   * Clear the active node state
   */
  clearActiveNode() {
    if (this._activeNodeUri !== null) {
      const activeNode = this._renderedNodes.get(this._activeNodeUri);
      if (activeNode) {
        activeNode.classList.remove("active");
      }
      this._activeNodeUri = null;
    }
  }

  /**
   * Get the URI of the currently active node
   */
  getActiveNodeUri(): string | null {
    return this._activeNodeUri;
  }

  private buildFolderStatusMap(
    notAdded: string[],
    modified: string[],
    ignored: string[],
  ) {
    const normalizePath = (path: string) => path.replace(/\\\\/g, "\\");
    this._folderStatus.clear();

    notAdded.forEach((filePath) => {
      const normalizedPath = normalizePath(filePath);
      const parts = normalizedPath.split("\\");

      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i + 1).join("\\");

        if (!this._folderStatus.has(folderPath)) {
          this._folderStatus.set(folderPath, new Set());
        }
        this._folderStatus.get(folderPath)!.add("untracked");
      }
    });

    modified.forEach((filePath) => {
      const normalizedPath = normalizePath(filePath);
      const parts = normalizedPath.split("\\");

      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i + 1).join("\\");

        if (!this._folderStatus.has(folderPath)) {
          this._folderStatus.set(folderPath, new Set());
        }
        this._folderStatus.get(folderPath)!.add("modified");
      }
    });

    ignored.forEach((filePath) => {
      const normalizedPath = normalizePath(filePath);
      const parts = normalizedPath.split("\\");

      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i + 1).join("\\");

        if (!this._folderStatus.has(folderPath)) {
          this._folderStatus.set(folderPath, new Set());
        }
        this._folderStatus.get(folderPath)!.add("ignored");
      }
    });
  }

  updateGitStatus(notAdded: string[], modified: string[], ignored: string[]) {
    const normalizePath = (path: string) => path.replace(/\\\\/g, "\\");

    this._gitStatus.clear();

    notAdded.forEach((path) => {
      this._gitStatus.set(normalizePath(path), "untracked");
    });

    modified.forEach((path) => {
      this._gitStatus.set(normalizePath(path), "modified");
    });

    ignored.forEach((path) => {
      this._gitStatus.set(normalizePath(path), "ignored");
    });

    this.buildFolderStatusMap(notAdded, modified, ignored);

    this.applyGitStatusToRenderedNodes();
  }

  private applyGitStatusToRenderedNodes() {
    const normalizePath = (path: string) => path.replace(/\\\\/g, "\\");

    this._renderedNodes.forEach((nodeElement, uri) => {
      const normalizedUri = normalizePath(uri);
      const nodeType = nodeElement.dataset.nodeType;

      nodeElement.classList.remove("untracked", "modified", "ignored");

      if (nodeType === "file") {
        const status = this._gitStatus.get(normalizedUri);
        if (status) {
          nodeElement.classList.add(status);
        }
      } else if (nodeType === "folder") {
        const folderStatuses = this._folderStatus.get(normalizedUri);
        if (folderStatuses) {
          folderStatuses.forEach((status) => {
            nodeElement.classList.add(status);
          });
        }
      }
    });
  }

  clearGitStatus() {
    this._gitStatus.clear();
    this._folderStatus.clear();
    this.applyGitStatusToRenderedNodes();
  }
}
