import { _generateUUID } from "../common/files/utils.js";
import { dispatch } from "../common/store/store.js";
import { select } from "../common/store/selector.js";
import {
  update_editor_tabs,
  update_folder_structure,
} from "../common/store/slice.js";
import { getFileIcon } from "../common/utils.js";
import { IEditorTab, IFolderStructure } from "../types.js";
import { chevronRightIcon } from "./media/icons.js";
import { CoreEl } from "./parts/el.js";

const path = window.path;

export class Files extends CoreEl {
  private _structure: IFolderStructure;
  private _expandedFolders: Set<string> = new Set();
  private _loadedFolders: Set<string> = new Set();
  private _renderedNodes: Map<string, HTMLElement> = new Map();
  private _renderedChildContainers: Map<string, HTMLElement> = new Map();
  private _lastStructureHash: string = "";
  private _refreshTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this._structure = [] as any;
    const _expanded = window.storage.get("files-expanded-folder");
    let _structure = window.storage.get("workbench.workspace.folder.structure");

    dispatch(update_folder_structure(_structure));

    if (_structure) {
      this._structure = this._deepClone(_structure);
    }

    if (_expanded && Array.isArray(_expanded)) {
      this._expandedFolders = new Set(_expanded);
    } else if (
      _expanded &&
      typeof _expanded === "object" &&
      _expanded.constructor === Object
    ) {
      const keys = Object.keys(_expanded);
      if (keys.length > 0) {
        this._expandedFolders = new Set(keys);
      }
    }

    this._createEl();
    this._restore();
    this._setupListener();
  }

  private _setupListener() {
    const ipcRender = window.ipc;

    ipcRender.on(
      "files-node-added",
      (
        _: any,
        data: {
          parentUri: string;
          nodeName: string;
          nodeType: "file" | "folder";
        }
      ) => {
        const _node: IFolderStructure = {
          name: data.nodeName,
          isRoot: false,
          type: data.nodeType,
          children: [],
          uri: path.join([data.parentUri, data.nodeName]),
        };

        this._addNode(data.parentUri, _node);
      }
    );

    ipcRender.on(
      "files-node-removed",
      (
        _: any,
        data: {
          nodeUri: string;
        }
      ) => {
        this._removeNode(data.nodeUri);
      }
    );
  }

  private async _restore() {
    if (
      this._expandedFolders.size > 0 &&
      this._structure &&
      this._structure.children
    ) {
      const expandedFolders = Array.from(this._expandedFolders);

      for (const folderUri of expandedFolders) {
        await this._loadIfNeeded(folderUri);
      }

      this._updateTreeIncremental();
    }
  }

  private async _loadIfNeeded(folderUri: string) {
    const node = this._findNodeByUri(this._structure, folderUri);
    if (node && node.type === "folder" && !this._loadedFolders.has(folderUri)) {
      try {
        const result = await window.files.openChildFolder(folderUri);

        if (result && result.success) {
          this._structure = result.structure;
          this._loadedFolders.add(folderUri);
          window.storage.store(
            "workbench.workspace.folder.structure",
            this._structure
          );
        }
      } catch (error) {
        this._expandedFolders.delete(folderUri);
        window.storage.store(
          "files-expanded-folder",
          Array.from(this._expandedFolders)
        );
      }
    }
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "files scrollbar-container x-disable";

    if (!this._structure) {
      this._createEmptyState();
    } else {
      this._createTreeView();
    }
  }

  private _createEmptyState() {
    const _emptyContainer = document.createElement("div");
    _emptyContainer.className = "empty-state";

    const _openFolderLabel = document.createElement("p");
    _openFolderLabel.textContent = "No folder selected, Please open a folder.";

    const _openFolderBtn = document.createElement("button");
    _openFolderBtn.textContent = "Open Folder";
    _openFolderBtn.className = "open-folder";

    _openFolderBtn.onclick = () => {
      this._handleOpenFolder();
    };

    _emptyContainer.appendChild(_openFolderLabel);
    _emptyContainer.appendChild(_openFolderBtn);
    this._el!.appendChild(_emptyContainer);
  }

  private _createTreeView() {
    const _tree = document.createElement("div");
    _tree.className = "tree";

    this._render(this._structure.children, _tree, 0);

    this._el!.appendChild(_tree);
  }

  private _handleOpenFolder() {
    window.files.openFolder();
  }

  private _open(_path: string, _name: string) {
    const stateValue = select((s) => s.main.editor_tabs);
    const _uri = path.normalize(_path);

    let currentTabs: IEditorTab[] = [];

    if (Array.isArray(stateValue)) {
      currentTabs = stateValue;
    } else if (stateValue && typeof stateValue === "object") {
      currentTabs = Object.values(stateValue);
    }

    const existingTabIndex = currentTabs.findIndex((tab) => tab.uri === _uri);

    if (existingTabIndex !== -1) {
      const updatedTabs = currentTabs.map((tab, index) => ({
        ...tab,
        active: index === existingTabIndex,
      }));

      dispatch(update_editor_tabs(updatedTabs));
    } else {
      const newTab: IEditorTab = {
        name: _name,
        uri: _uri,
        active: true,
        is_touched: false,
      };

      const updatedTabs = [
        ...currentTabs.map((tab) => ({
          ...tab,
          active: false,
        })),
        newTab,
      ];

      dispatch(update_editor_tabs(updatedTabs));
    }
  }

  private _render(
    nodes: IFolderStructure[],
    container: HTMLElement,
    depth: number = 0
  ) {
    if (!Array.isArray(nodes)) {
      return;
    }

    nodes.forEach((_node) => {
      if (!_node || !_node.name || !_node.uri) {
        return;
      }

      const nodeElement = this._createNodeElement(_node, depth);
      container.appendChild(nodeElement);
      this._renderedNodes.set(_node.uri, nodeElement);

      if (_node.type === "folder") {
        const childContainer = this._createChildContainer(_node.uri);
        container.appendChild(childContainer);
        this._renderedChildContainers.set(_node.uri, childContainer);

        if (_node.children && _node.children.length > 0) {
          this._render(_node.children, childContainer, depth + 1);
          this._loadedFolders.add(_node.uri);
        }
      }
    });
  }

  private _createNodeElement(
    node: IFolderStructure,
    depth: number
  ): HTMLElement {
    const _nodeEl = document.createElement("div");
    _nodeEl.className = "node";
    _nodeEl.dataset.nodeId = node.uri;
    _nodeEl.style.setProperty("--nesting-depth", depth.toString());

    const _icon = document.createElement("span");
    _icon.className = "icon";

    const nodeId = node.uri;

    if (node.type === "file") {
      _icon.innerHTML = getFileIcon(node.name);
    } else {
      const isExpanded = this._expandedFolders.has(nodeId);
      _icon.innerHTML = chevronRightIcon;
      _icon.style.cursor = "pointer";

      if (isExpanded) {
        _icon.classList.add("expanded");
      }

      _icon.onclick = (e) => {
        e.stopPropagation();
        this._toggleFolder(nodeId, _nodeEl);
      };
    }

    const _name = document.createElement("span");
    _name.textContent = node.name;
    _name.className = "name";

    if (node.type === "folder") {
      _name.style.cursor = "pointer";
      _name.onclick = (e) => {
        e.stopPropagation();
        this._toggleFolder(nodeId, _nodeEl);
      };
    }

    _nodeEl.appendChild(_icon);
    _nodeEl.appendChild(_name);

    _nodeEl.onclick = (e) => {
      e.stopPropagation();
      if (node.type === "folder") {
        this._toggleFolder(nodeId, _nodeEl);
      } else {
        this._open(node.uri, node.name);
      }
    };

    return _nodeEl;
  }

  private _createChildContainer(nodeId: string): HTMLElement {
    const _childrenContainer = document.createElement("div");
    _childrenContainer.className = "child-nodes";
    _childrenContainer.dataset.nodeId = nodeId;

    const isExpanded = this._expandedFolders.has(nodeId);

    if (isExpanded) {
      this._showChildContainer(_childrenContainer);
    } else {
      this._hideChildContainer(_childrenContainer);
    }

    return _childrenContainer;
  }

  // Helper methods for consistent container visibility handling
  private _showChildContainer(container: HTMLElement) {
    container.style.height = "auto";
    container.style.opacity = "1";
    container.style.pointerEvents = "auto";
    container.style.visibility = "visible";
    container.classList.add("expanded");
  }

  private _hideChildContainer(container: HTMLElement) {
    container.style.height = "0px";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    container.style.visibility = "hidden";
    container.classList.remove("expanded");
  }

  private async _load(folderUri: string, container: HTMLElement) {
    try {
      const result = await window.files.openChildFolder(folderUri);

      if (result && result.success) {
        this._structure = result.structure;
        window.storage.store(
          "workbench.workspace.folder.structure",
          this._structure
        );
        this._loadedFolders.add(folderUri);

        const updatedNode = this._findNodeByUri(this._structure, folderUri);

        if (updatedNode && updatedNode.children) {
          container.innerHTML = "";

          const currentDepth = this._calculateDepth(container);
          this._render(updatedNode.children, container, currentDepth);

          container.offsetHeight;
          this._showChildContainer(container);
        }

        dispatch(update_folder_structure(this._structure));
      }
    } catch (error) {}
  }

  private _calculateDepth(container: HTMLElement): number {
    let depth = 0;
    let parent = container.parentElement;

    while (parent && !parent.classList.contains("tree")) {
      if (parent.classList.contains("child-nodes")) {
        depth++;
      }
      parent = parent.parentElement;
    }

    return depth;
  }

  private async _toggleFolder(nodeId: string, nodeEl: HTMLElement) {
    const isExpanded = this._expandedFolders.has(nodeId);
    const _icon = nodeEl.querySelector(".icon") as HTMLElement;

    const _childrenContainer = this._renderedChildContainers.get(nodeId);

    if (!_childrenContainer) {
      return;
    }

    if (isExpanded) {
      // Collapse
      this._expandedFolders.delete(nodeId);
      _icon.classList.remove("expanded");

      const height = _childrenContainer.scrollHeight;
      _childrenContainer.style.height = height + "px";

      _childrenContainer.offsetHeight;

      _childrenContainer.style.transition =
        "height 0.25s ease, opacity 0.25s ease";
      _childrenContainer.style.height = "0px";
      _childrenContainer.style.opacity = "0";
      _childrenContainer.style.pointerEvents = "none";
      _childrenContainer.style.visibility = "hidden";

      _childrenContainer.classList.remove("expanded");
    } else {
      // Expand
      this._expandedFolders.add(nodeId);
      _icon.classList.add("expanded");

      if (!this._loadedFolders.has(nodeId)) {
        await this._load(nodeId, _childrenContainer);
      }

      _childrenContainer.style.transition = "none";
      _childrenContainer.style.height = "0px";
      _childrenContainer.style.opacity = "0";
      _childrenContainer.style.pointerEvents = "none";
      _childrenContainer.style.visibility = "hidden";

      _childrenContainer.offsetHeight;

      const height = _childrenContainer.scrollHeight;
      _childrenContainer.style.transition =
        "height 0.25s ease, opacity 0.25s ease";
      _childrenContainer.style.height = height + "px";
      _childrenContainer.style.opacity = "1";
      _childrenContainer.style.pointerEvents = "auto";
      _childrenContainer.style.visibility = "visible";

      setTimeout(() => {
        if (_childrenContainer && this._expandedFolders.has(nodeId)) {
          _childrenContainer.style.height = "auto";
          _childrenContainer.classList.add("expanded");
        }
      }, 250);
    }

    window.storage.store(
      "files-expanded-folder",
      Array.from(this._expandedFolders)
    );
  }

  private _findNodeByUri(
    node: IFolderStructure,
    targetUri: string
  ): IFolderStructure | null {
    if (!node || !targetUri) {
      return null;
    }

    const normalize = (uri: string) => uri.replace(/\\/g, "/");

    if (normalize(node.uri) === normalize(targetUri)) {
      return node;
    }

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = this._findNodeByUri(child, targetUri);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  private _updateTreeIncremental(changedNodes?: Set<string>) {
    if (!this._el) {
      return;
    }

    if (!this._structure) {
      this._el.innerHTML = "";
      this._renderedNodes.clear();
      this._renderedChildContainers.clear();
      this._createEmptyState();
      return;
    }

    const currentHash = this._generateStructureHash(this._structure);
    const needsFullRefresh =
      this._lastStructureHash === "" ||
      this._el.querySelector(".tree") === null;

    if (needsFullRefresh) {
      this._el.innerHTML = "";
      this._renderedNodes.clear();
      this._renderedChildContainers.clear();
      this._createTreeView();
      this._lastStructureHash = currentHash;
      return;
    }

    const treeContainer = this._el.querySelector(".tree") as HTMLElement;
    if (treeContainer && this._structure.children) {
      this._updateNodesIncremental(
        this._structure.children,
        treeContainer,
        0,
        changedNodes
      );
    }

    this._lastStructureHash = currentHash;
    dispatch(update_folder_structure(this._structure));
  }

  private _updateNodesIncremental(
    nodes: IFolderStructure[],
    container: HTMLElement,
    depth: number,
    changedNodes?: Set<string>
  ) {
    if (!Array.isArray(nodes)) return;

    const existingNodes = new Map<string, HTMLElement>();
    const existingChildContainers = new Map<string, HTMLElement>();

    Array.from(container.children).forEach((child) => {
      const element = child as HTMLElement;
      const nodeId = element.dataset.nodeId;

      if (nodeId) {
        if (element.classList.contains("node")) {
          existingNodes.set(nodeId, element);
        } else if (element.classList.contains("child-nodes")) {
          existingChildContainers.set(nodeId, element);
        }
      }
    });

    const shouldExist = new Set(nodes.map((node) => node.uri));

    existingNodes.forEach((element, nodeId) => {
      if (!shouldExist.has(nodeId)) {
        element.remove();
        existingChildContainers.get(nodeId)?.remove();
        this._renderedNodes.delete(nodeId);
        this._renderedChildContainers.delete(nodeId);
      }
    });

    nodes.forEach((node, index) => {
      if (!node || !node.name || !node.uri) return;

      const nodeId = node.uri;
      const existingElement = existingNodes.get(nodeId);

      const needsUpdate =
        !existingElement ||
        changedNodes?.has(nodeId) ||
        this._hasNodeChanged(node, existingElement);

      if (needsUpdate) {
        if (existingElement) {
          this._updateExistingNode(node, existingElement, depth);
        } else {
          const newElement = this._createNodeElement(node, depth);
          const insertPosition = this._findInsertPosition(
            container,
            index,
            "node"
          );

          if (insertPosition.nextSibling) {
            container.insertBefore(newElement, insertPosition.nextSibling);
          } else {
            container.appendChild(newElement);
          }

          this._renderedNodes.set(nodeId, newElement);

          if (node.type === "folder") {
            const childContainer = this._createChildContainer(nodeId);
            const childInsertPos = this._findInsertPosition(
              container,
              index,
              "child-nodes"
            );

            if (childInsertPos.nextSibling) {
              container.insertBefore(
                childContainer,
                childInsertPos.nextSibling
              );
            } else {
              container.appendChild(childContainer);
            }

            this._renderedChildContainers.set(nodeId, childContainer);
          }
        }
      }

      if (node.type === "folder" && node.children) {
        const childContainer =
          existingChildContainers.get(nodeId) ||
          this._renderedChildContainers.get(nodeId);
        if (childContainer) {
          this._updateNodesIncremental(
            node.children,
            childContainer,
            depth + 1,
            changedNodes
          );

          const isExpanded = this._expandedFolders.has(nodeId);
          this._updateChildContainerVisibility(childContainer, isExpanded);
        }
      }
    });
  }

  private _updateExistingNode(
    node: IFolderStructure,
    element: HTMLElement,
    depth: number
  ) {
    element.style.setProperty("--nesting-depth", depth.toString());

    const nameSpan = element.querySelector(".name") as HTMLElement;
    if (nameSpan && nameSpan.textContent !== node.name) {
      nameSpan.textContent = node.name;
    }

    const iconSpan = element.querySelector(".icon") as HTMLElement;
    if (node.type === "file") {
      const newIcon = getFileIcon(node.name);
      if (iconSpan.innerHTML !== newIcon) {
        iconSpan.innerHTML = newIcon;
      }
    } else {
      const isExpanded = this._expandedFolders.has(node.uri);
      if (isExpanded && !iconSpan.classList.contains("expanded")) {
        iconSpan.classList.add("expanded");
      } else if (!isExpanded && iconSpan.classList.contains("expanded")) {
        iconSpan.classList.remove("expanded");
      }
    }
  }

  private _updateChildContainerVisibility(
    container: HTMLElement,
    isExpanded: boolean
  ) {
    if (isExpanded) {
      this._showChildContainer(container);
    } else {
      this._hideChildContainer(container);
    }
  }

  private _hasNodeChanged(
    node: IFolderStructure,
    element: HTMLElement
  ): boolean {
    const nameSpan = element.querySelector(".name") as HTMLElement;
    return nameSpan?.textContent !== node.name;
  }

  private _findInsertPosition(
    container: HTMLElement,
    index: number,
    type: "node" | "child-nodes"
  ): { nextSibling: Element | null } {
    const children = Array.from(container.children);
    let nodeCount = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child!.classList.contains("node")) {
        if (nodeCount === index) {
          if (type === "node") {
            return { nextSibling: child! };
          } else {
            return { nextSibling: children[i + 1] || null };
          }
        }
        nodeCount++;
      }
    }

    return { nextSibling: null };
  }

  private _generateStructureHash(structure: IFolderStructure): string {
    return JSON.stringify(structure, ["name", "uri", "type", "children"]);
  }

  private _deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this._deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    return cloned;
  }

  private _addNode(parentUri: string, newNode: IFolderStructure): boolean {
    try {
      this._structure = this._deepClone(this._structure);

      const parentNode = this._findNodeByUri(this._structure, parentUri);

      if (!parentNode) {
        this._forceFullRefresh();
        return false;
      }

      if (parentNode.type !== "folder") {
        return false;
      }

      if (!parentNode.children) {
        parentNode.children = [];
      }

      const existingNode = parentNode.children.find(
        (child) => child.name === newNode.name || child.uri === newNode.uri
      );

      if (existingNode) {
        if (this._shouldUpdateExistingNode(existingNode, newNode)) {
          Object.assign(existingNode, {
            ...newNode,
            uri: newNode.uri || path.join([parentUri, newNode.name]),
            type: newNode.type || "file",
            children: newNode.type === "folder" ? newNode.children || [] : [],
            isRoot: false,
          });

          this._sortChildren(parentNode);
          this._persistAndUpdateIncremental([parentUri]);
          return true;
        }

        return false;
      }

      const nodeToAdd: IFolderStructure = {
        name: newNode.name,
        uri: newNode.uri || this._createSafeUri(parentUri, newNode.name),
        type: newNode.type || "file",
        children: newNode.type === "folder" ? newNode.children || [] : [],
        isRoot: false,
      };

      if (this._isUriDuplicate(this._structure, nodeToAdd.uri)) {
        return false;
      }

      parentNode.children.push(nodeToAdd);
      this._sortChildren(parentNode);

      this._persistAndUpdateIncremental([parentUri]);

      return true;
    } catch (error) {
      this._forceFullRefresh();
      return false;
    }
  }

  private _shouldUpdateExistingNode(
    existing: IFolderStructure,
    newNode: IFolderStructure
  ): boolean {
    return (
      existing.type !== newNode.type ||
      (newNode.type === "folder" &&
        JSON.stringify(existing.children) !== JSON.stringify(newNode.children))
    );
  }

  private _createSafeUri(parentUri: string, nodeName: string): string {
    try {
      const normalizedParent = path.normalize(parentUri);
      const normalizedName = path.normalize(nodeName);

      if (
        normalizedName.includes("..") ||
        normalizedName.includes("/") ||
        normalizedName.includes("\\")
      ) {
        throw new Error(`Invalid node name: ${nodeName}`);
      }

      return path.join([normalizedParent, normalizedName]).replace(/\\/g, "/");
    } catch (error) {
      return path.join([parentUri, nodeName]).replace(/\\/g, "/");
    }
  }

  private _isUriDuplicate(node: IFolderStructure, targetUri: string): boolean {
    if (node.uri === targetUri) {
      return true;
    }

    if (node.children) {
      return node.children.some((child) =>
        this._isUriDuplicate(child, targetUri)
      );
    }

    return false;
  }

  private _sortChildren(parentNode: IFolderStructure): void {
    if (!parentNode.children) return;

    parentNode.children.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;

      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  private _persistAndUpdateIncremental(changedNodeUris: string[]): void {
    try {
      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
      }

      window.storage.store(
        "workbench.workspace.folder.structure",
        this._structure
      );
      dispatch(update_folder_structure(this._structure));

      this._refreshTimeout = setTimeout(() => {
        const changedNodes = new Set(changedNodeUris);
        this._updateTreeIncremental(changedNodes);
        this._refreshTimeout = null;
      }, 10);
    } catch (error) {
      this._forceFullRefresh();
    }
  }

  private _forceFullRefresh(): void {
    try {
      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
        this._refreshTimeout = null;
      }

      this._renderedNodes.clear();
      this._renderedChildContainers.clear();
      this._lastStructureHash = "";

      const storedStructure = window.storage.get(
        "workbench.workspace.folder.structure"
      );
      if (storedStructure) {
        this._structure = this._deepClone(storedStructure);
        dispatch(update_folder_structure(this._structure));
      }

      this._updateTreeIncremental();
    } catch (error) {}
  }

  private _removeNode(nodeUri: string): boolean {
    try {
      this._structure = this._deepClone(this._structure);

      const parentNode = this._findParentNode(this._structure, nodeUri);
      const result = this._removeNodeRecursively(this._structure, nodeUri);

      if (result) {
        this._cleanupRemovedNode(nodeUri);

        const changedUris = parentNode ? [parentNode.uri] : [];
        this._persistAndUpdateIncremental(changedUris);
      } else {
      }

      return result;
    } catch (error) {
      this._forceFullRefresh();
      return false;
    }
  }

  private _removeNodeRecursively(
    node: IFolderStructure,
    targetUri: string
  ): boolean {
    if (!node.children) return false;

    const normalize = (uri: string) => uri.replace(/\\/g, "/");

    const index = node.children.findIndex(
      (child) => normalize(child.uri) === normalize(targetUri)
    );

    if (index >= 0) {
      node.children.splice(index, 1);
      return true;
    }

    return node.children.some((child) =>
      this._removeNodeRecursively(child, targetUri)
    );
  }

  private _cleanupRemovedNode(nodeUri: string): void {
    this._renderedNodes.delete(nodeUri);
    this._renderedChildContainers.delete(nodeUri);
    this._expandedFolders.delete(nodeUri);
    this._loadedFolders.delete(nodeUri);

    const nodeToRemove = this._findNodeByUri(this._structure, nodeUri);
    if (nodeToRemove) {
      this._cleanupNestedFolders(nodeToRemove);
    }
  }

  private _findParentNode(
    node: IFolderStructure,
    targetUri: string
  ): IFolderStructure | null {
    if (!node.children || node.children.length === 0) {
      return null;
    }

    const hasChild = node.children.some((child) => child.uri === targetUri);
    if (hasChild) {
      return node;
    }

    for (const child of node.children) {
      const found = this._findParentNode(child, targetUri);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private _cleanupNestedFolders(node: IFolderStructure): void {
    if (!node.children) {
      return;
    }

    node.children.forEach((child) => {
      if (child.type === "folder") {
        this._expandedFolders.delete(child.uri);
        this._loadedFolders.delete(child.uri);
        this._renderedNodes.delete(child.uri);
        this._renderedChildContainers.delete(child.uri);

        this._cleanupNestedFolders(child);
      }
    });
  }
}
