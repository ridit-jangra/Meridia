import { _generateUUID } from "../common/workbench.files/workbench.files.utils.js";
import { dispatch } from "../common/workbench.store/workbench.store.js";
import { select } from "../common/workbench.store/workbench.store.selector.js";
import {
  update_editor_tabs,
  update_folder_structure,
} from "../common/workbench.store/workbench.store.slice.js";
import { getFileIcon } from "../common/workbench.utils.js";
import { IEditorTab, IFolderStructure } from "../workbench.types.js";
import { chevronRightIcon } from "./workbench.media/workbench.icons.js";
import { CoreEl } from "./workbench.parts/workbench.part.el.js";

const path = window.path;

export class Files extends CoreEl {
  private _structure: IFolderStructure;
  private _expandedFolders: Set<string> = new Set();
  private _loadedFolders: Set<string> = new Set();

  constructor() {
    super();
    this._structure = [] as any;
    const _expanded = window.storage.get("files-expanded-folder");
    let _structure = window.storage.get("files-structure");

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
        console.log("removing", data);
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

      this._refreshTree();
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
          window.storage.store("files-structure", this._structure);
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

    if (!this._structure || !this._structure.isRoot) {
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

    if (this._structure.children && this._structure.children.length > 0) {
      this._render(this._structure.children, _tree, 0);
    }
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

      const _nodeEl = document.createElement("div");
      _nodeEl.className = "node";
      _nodeEl.dataset.nodeId = _node.uri;

      _nodeEl.style.setProperty("--nesting-depth", depth.toString());

      const _icon = document.createElement("span");
      _icon.className = "icon";

      const nodeId = _node.uri;

      if (_node.type === "file") {
        _icon.innerHTML = getFileIcon(_node.name);
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
      _name.textContent = _node.name;
      _name.className = "name";

      if (_node.type === "folder") {
        _name.style.cursor = "pointer";
        _name.onclick = (e) => {
          e.stopPropagation();
          this._toggleFolder(nodeId, _nodeEl);
        };
      }

      _nodeEl.appendChild(_icon);
      _nodeEl.appendChild(_name);
      container.appendChild(_nodeEl);

      _nodeEl.onclick = (e) => {
        e.stopPropagation();
        if (_node.type === "folder") {
          this._toggleFolder(nodeId, _nodeEl);
        } else {
          this._open(_node.uri, _node.name);
        }
      };

      if (_node.type === "folder") {
        const _childrenContainer = document.createElement("div");
        _childrenContainer.className = "child-nodes";
        _childrenContainer.dataset.nodeId = nodeId;

        const isExpanded = this._expandedFolders.has(nodeId);

        if (isExpanded) {
          _childrenContainer.style.height = "auto";
          _childrenContainer.style.opacity = "1";
        } else {
          _childrenContainer.style.height = "0px";
          _childrenContainer.style.opacity = "0";
        }

        if (_node.children && _node.children.length > 0) {
          this._render(_node.children, _childrenContainer, depth + 1);
          this._loadedFolders.add(nodeId);
        }

        container.appendChild(_childrenContainer);
      }
    });
  }

  private async _load(folderUri: string, container: HTMLElement) {
    try {
      const result = await window.files.openChildFolder(folderUri);

      if (result && result.success) {
        this._structure = result.structure;
        window.storage.store("files-structure", this._structure);
        this._loadedFolders.add(folderUri);

        const updatedNode = this._findNodeByUri(this._structure, folderUri);

        if (updatedNode && updatedNode.children) {
          container.innerHTML = "";

          const currentDepth = this._calculateDepth(container);
          this._render(updatedNode.children, container, currentDepth);

          container.offsetHeight;
          container.style.height = "auto";
          container.style.opacity = "1";
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

    let _childrenContainer: HTMLElement | null = null;

    let nextSibling = nodeEl.nextElementSibling;
    while (nextSibling) {
      if (
        nextSibling.classList.contains("child-nodes") &&
        (nextSibling as HTMLElement).dataset.nodeId === nodeId
      ) {
        _childrenContainer = nextSibling as HTMLElement;
        break;
      }
      nextSibling = nextSibling.nextElementSibling;
    }

    if (!_childrenContainer) {
      _childrenContainer = nodeEl.parentElement?.querySelector(
        `.child-nodes[data-node-id="${nodeId}"]`
      ) as HTMLElement;
    }

    if (isExpanded) {
      this._expandedFolders.delete(nodeId);
      _icon.classList.remove("expanded");

      if (_childrenContainer) {
        const height = _childrenContainer.scrollHeight;
        _childrenContainer.style.height = height + "px";

        _childrenContainer.offsetHeight;

        _childrenContainer.style.transition =
          "height 0.25s ease, opacity 0.25s ease";
        _childrenContainer.style.height = "0px";
        _childrenContainer.style.opacity = "0";
        _childrenContainer.style.pointerEvents = "none";

        _childrenContainer.classList.remove("expanded");
      }
    } else {
      this._expandedFolders.add(nodeId);
      _icon.classList.add("expanded");

      if (_childrenContainer) {
        if (!this._loadedFolders.has(nodeId)) {
          await this._load(nodeId, _childrenContainer);
        }

        _childrenContainer.style.transition = "none";
        _childrenContainer.style.height = "0px";
        _childrenContainer.style.opacity = "0";
        _childrenContainer.style.pointerEvents = "none";

        _childrenContainer.offsetHeight;

        const height = _childrenContainer.scrollHeight;
        _childrenContainer.style.transition =
          "height 0.25s ease, opacity 0.25s ease";
        _childrenContainer.style.height = height + "px";
        _childrenContainer.style.opacity = "1";
        _childrenContainer.style.pointerEvents = "auto";

        setTimeout(() => {
          if (_childrenContainer && this._expandedFolders.has(nodeId)) {
            _childrenContainer.style.height = "auto";
            _childrenContainer.classList.add("expanded");
          }
        }, 250);
      }
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

    if (node.uri === targetUri) {
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

  private _refreshTree() {
    if (!this._el) {
      return;
    }

    this._el.innerHTML = "";

    if (
      !this._structure ||
      !this._structure.children ||
      this._structure.children.length === 0
    ) {
      this._createEmptyState();
    } else {
      this._createTreeView();
    }

    dispatch(update_folder_structure(this._structure));
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
        console.error(`Parent node not found: ${parentUri}`);

        this._forceFullRefresh();
        return false;
      }

      if (parentNode.type !== "folder") {
        console.error(`Parent is not a folder: ${parentUri}`);
        return false;
      }

      if (!parentNode.children) {
        parentNode.children = [];
      }

      const existingNode = parentNode.children.find(
        (child) => child.name === newNode.name || child.uri === newNode.uri
      );

      if (existingNode) {
        console.warn(
          `Node with name "${newNode.name}" or URI "${newNode.uri}" already exists in ${parentUri}`
        );

        if (this._shouldUpdateExistingNode(existingNode, newNode)) {
          Object.assign(existingNode, {
            ...newNode,
            uri: newNode.uri || path.join([parentUri, newNode.name]),
            type: newNode.type || "file",
            children: newNode.type === "folder" ? newNode.children || [] : [],
            isRoot: false,
          });

          this._sortChildren(parentNode);
          this._persistAndUpdate();
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
        console.error(`URI already exists in tree: ${nodeToAdd.uri}`);
        return false;
      }

      parentNode.children.push(nodeToAdd);
      this._sortChildren(parentNode);

      this._persistAndUpdate();

      console.log(`Successfully added node: ${nodeToAdd.name} to ${parentUri}`);
      return true;
    } catch (error) {
      console.error("Error adding node:", error);

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
      console.error(`Error creating safe URI for ${nodeName}:`, error);
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

  private _persistAndUpdate(): void {
    try {
      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
      }

      window.storage.store("files-structure", this._structure);

      dispatch(update_folder_structure(this._structure));

      this._refreshTimeout = setTimeout(() => {
        this._refreshTree();
        this._refreshTimeout = null;
      }, 50);
    } catch (error) {
      console.error("Error in persist and update:", error);
      this._forceFullRefresh();
    }
  }

  private _forceFullRefresh(): void {
    try {
      console.log("Forcing full tree refresh due to inconsistency");

      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
        this._refreshTimeout = null;
      }

      const storedStructure = window.storage.get("files-structure");
      if (storedStructure) {
        this._structure = this._deepClone(storedStructure);
        dispatch(update_folder_structure(this._structure));
      }

      this._refreshTree();
    } catch (error) {
      console.error("Error during forced refresh:", error);
    }
  }

  private _removeNode(nodeUri: string): boolean {
    try {
      this._structure = this._deepClone(this._structure);

      const result = this._removeNodeRecursively(this._structure, nodeUri);

      if (result) {
        this._persistAndUpdate();
        console.log(`Successfully removed node: ${nodeUri}`);
      } else {
        console.warn(`Node not found for removal: ${nodeUri}`);
      }

      return result;
    } catch (error) {
      console.error("Error removing node:", error);
      this._forceFullRefresh();
      return false;
    }
  }

  private _removeNodeRecursively(
    node: IFolderStructure,
    targetUri: string
  ): boolean {
    if (!node.children) return false;

    const index = node.children.findIndex((child) => child.uri === targetUri);

    if (index >= 0) {
      node.children.splice(index, 1);
      return true;
    }

    return node.children.some((child) =>
      this._removeNodeRecursively(child, targetUri)
    );
  }

  private _refreshTimeout: NodeJS.Timeout | null = null;

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

        this._cleanupNestedFolders(child);
      }
    });
  }
}
