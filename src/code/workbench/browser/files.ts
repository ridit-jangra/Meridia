import { _generateUUID } from "../common/files/utils.js";
import { dispatch } from "../common/store/store.js";
import { select } from "../common/store/selector.js";
import {
  update_editor_tabs,
  update_folder_structure,
} from "../common/store/slice.js";
import { getFileIcon } from "../common/utils.js";
import { IEditorTab, IFolderStructure } from "../workbench.types.js";
import { getThemeIcon } from "./media/icons.js";
import { CoreEl } from "./parts/core.js";

const path = window.path;
const fs = window.fs;

export class Files extends CoreEl {
  private _structure: IFolderStructure;
  private _expandedFolders: Set<string> = new Set();
  private _loadedFolders: Set<string> = new Set();
  private _renderedNodes: Map<string, HTMLElement> = new Map();
  private _renderedChildContainers: Map<string, HTMLElement> = new Map();
  private _lastStructureHash: string = "";
  private _contextMenuEl: HTMLElement | null = null;
  private _isRenamingInProgress = false;

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
    this._createContextMenu();
    this._restore();
    this._setupListener();
  }

  private _createContextMenu() {
    this._contextMenuEl = document.createElement("div");
    this._contextMenuEl.className = "context-menu";
    this._contextMenuEl.style.position = "fixed";
    this._contextMenuEl.style.display = "none";
    this._contextMenuEl.style.zIndex = "1000";

    const ul = document.createElement("ul");

    const openLi = document.createElement("li");
    openLi.textContent = "Open";
    openLi.className = "cm-open";
    ul.appendChild(openLi);

    const renameLi = document.createElement("li");
    renameLi.textContent = "Rename";
    renameLi.className = "cm-rename";
    ul.appendChild(renameLi);

    const newFileLi = document.createElement("li");
    newFileLi.textContent = "New File";
    newFileLi.className = "cm-new-file";
    ul.appendChild(newFileLi);

    const newFolderLi = document.createElement("li");
    newFolderLi.textContent = "New Folder";
    newFolderLi.className = "cm-new-folder";
    ul.appendChild(newFolderLi);

    const deleteLi = document.createElement("li");
    deleteLi.textContent = "Delete";
    deleteLi.className = "cm-delete";
    ul.appendChild(deleteLi);

    this._contextMenuEl.appendChild(ul);
    document.body.appendChild(this._contextMenuEl);

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this._contextMenuEl?.style.display === "block"
      ) {
        this._closeContextMenu();
      }
    });

    document.addEventListener("click", (e) => {
      if (
        this._contextMenuEl?.style.display === "block" &&
        !this._contextMenuEl.contains(e.target as Node)
      ) {
        this._closeContextMenu();
      }
    });
  }

  private _closeContextMenu() {
    if (this._contextMenuEl) {
      this._contextMenuEl.style.display = "none";
    }
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

    ipcRender.on(
      "files-node-renamed",
      (
        _: any,
        data: {
          oldUri: string;
          newUri: string;
          newName: string;
        }
      ) => {
        this._renameNode(data.oldUri, data.newName);
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
    this._el.className = "files";

    if (!this._structure.isRoot) {
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
    const _root = document.createElement("div");
    _root.className = "root";

    const _title = document.createElement("span");
    _title.className = "title";
    _title.textContent = path.basename(this._structure.uri);

    const _options = document.createElement("div");
    _options.className = "options";

    const _addFile = document.createElement("span");
    _addFile.innerHTML = getThemeIcon("addFile");

    _addFile.onclick = () => {
      this._startAddNode(this._structure.uri, "file");
    };

    const _addFolder = document.createElement("span");
    _addFolder.innerHTML = getThemeIcon("addDirectory");

    _addFolder.onclick = () => {
      this._startAddNode(this._structure.uri, "folder");
    };

    const _refresh = document.createElement("span");
    _refresh.innerHTML = getThemeIcon("refresh");

    _refresh.onclick = () => {
      this._refresh();
    };

    _options.appendChild(_addFile);
    _options.appendChild(_addFolder);
    _options.appendChild(_refresh);

    _root.appendChild(_title);
    _root.appendChild(_options);

    const _treeContainer = document.createElement("div");
    _treeContainer.className = "tree-container scrollbar-container x-disable";

    const _tree = document.createElement("div");
    _tree.className = "tree";

    this._render(this._structure.children, _tree, 0);

    _treeContainer.appendChild(_tree);

    this._el!.appendChild(_root);
    this._el!.appendChild(_treeContainer);
  }

  private async _refresh() {
    this._expandedFolders.clear();
    this._loadedFolders.clear();
    this._renderedNodes.clear();
    this._renderedChildContainers.clear();
    this._lastStructureHash = "";
    this._el!.innerHTML = "";
    this._structure = await path.walkdir(this._structure.uri);
    this._createTreeView();
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
    _nodeEl.dataset.nodeType = node.type;

    _nodeEl.dataset.depth = depth.toString();
    _nodeEl.style.setProperty("--nesting-depth", depth.toString());

    _nodeEl.style.paddingLeft = `${depth * 1.4}rem`;

    const _icon = document.createElement("span");
    _icon.className = "icon";

    if (node.type === "file") {
      _icon.innerHTML = getFileIcon(node.name);
    } else {
      const isExpanded = this._expandedFolders.has(node.uri);
      _icon.innerHTML = getThemeIcon("chevronRight");
      _icon.style.cursor = "pointer";
      _icon.classList.add("toggle");

      if (isExpanded) {
        _icon.classList.add("expanded");
      }

      _icon.onclick = (e) => {
        e.stopPropagation();
        this._toggleFolder(node.uri, _nodeEl);
      };
    }

    const _name = document.createElement("span");
    _name.textContent = node.name;
    _name.className = "name";

    if (node.type === "folder") {
      _name.style.cursor = "pointer";
      _name.onclick = (e) => {
        e.stopPropagation();
        this._toggleFolder(node.uri, _nodeEl);
      };
    }

    _nodeEl.appendChild(_icon);
    _nodeEl.appendChild(_name);

    _nodeEl.onclick = (e) => {
      e.stopPropagation();
      if (node.type === "folder") {
        this._toggleFolder(node.uri, _nodeEl);
      } else {
        this._open(node.uri, node.name);
      }
    };

    _nodeEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this._showContextMenu(e.clientX, e.clientY, node);
    });

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
    let parent = container.previousElementSibling as HTMLDivElement;

    if (parent && parent.classList.contains("node")) {
      const parentDepth = parent.dataset.depth;
      if (parentDepth) {
        const depth = parseInt(parentDepth) + 1;
        return depth;
      }
    }

    parent = container.parentElement as HTMLDivElement;
    while (parent && !parent.classList.contains("tree")) {
      if (parent.classList.contains("node")) {
        const parentDepth = parent.dataset.depth;
        if (parentDepth) {
          const depth = parseInt(parentDepth) + 1;
          return depth;
        }
      }
      parent = parent.parentElement as HTMLDivElement;
    }

    return 0;
  }

  private async _toggleFolder(nodeId: string, nodeEl: HTMLElement) {
    const isExpanded = this._expandedFolders.has(nodeId);
    const _icon = nodeEl.querySelector(".icon") as HTMLElement;

    const _childrenContainer = this._renderedChildContainers.get(nodeId);

    if (!_childrenContainer) {
      return;
    }

    if (isExpanded) {
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

  private _showContextMenu(x: number, y: number, node: IFolderStructure) {
    if (!this._contextMenuEl) return;

    this._contextMenuEl.style.top = `${y}px`;
    this._contextMenuEl.style.left = `${x}px`;
    this._contextMenuEl.style.display = "block";

    const openItem = this._contextMenuEl.querySelector(
      ".cm-open"
    ) as HTMLElement;
    const renameItem = this._contextMenuEl.querySelector(
      ".cm-rename"
    ) as HTMLElement;
    const newFileItem = this._contextMenuEl.querySelector(
      ".cm-new-file"
    ) as HTMLElement;
    const newFolderItem = this._contextMenuEl.querySelector(
      ".cm-new-folder"
    ) as HTMLElement;
    const deleteItem = this._contextMenuEl.querySelector(
      ".cm-delete"
    ) as HTMLElement;

    if (node.type === "file") {
      if (openItem) openItem.style.display = "block";
      if (newFileItem) newFileItem.style.display = "none";
      if (newFolderItem) newFolderItem.style.display = "none";
      if (renameItem) renameItem.style.display = "block";
      if (deleteItem) deleteItem.style.display = "block";
    } else if (node.type === "folder") {
      if (openItem) openItem.style.display = "none";
      if (newFileItem) newFileItem.style.display = "block";
      if (newFolderItem) newFolderItem.style.display = "block";
      if (renameItem) renameItem.style.display = "block";
      if (deleteItem) deleteItem.style.display = "block";
    }

    const openHandler = () => {
      this._open(node.uri, node.name);
      this._contextMenuEl!.style.display = "none";
    };

    const renameHandler = () => {
      this._startRename(node.uri);
      this._contextMenuEl!.style.display = "none";
    };

    const newFileHandler = () => {
      this._startAddNode(node.uri, "file");
      this._contextMenuEl!.style.display = "none";
    };

    const newFolderHandler = () => {
      this._startAddNode(node.uri, "folder");
      this._contextMenuEl!.style.display = "none";
    };

    const deleteHandler = () => {
      this._removeNode(node.uri);
      this._contextMenuEl!.style.display = "none";
    };

    if (openItem) {
      const newOpenItem = openItem.cloneNode(true) as HTMLElement;
      openItem.replaceWith(newOpenItem);
      newOpenItem.addEventListener("click", openHandler);
    }

    if (renameItem) {
      const newRenameItem = renameItem.cloneNode(true) as HTMLElement;
      renameItem.replaceWith(newRenameItem);
      newRenameItem.addEventListener("click", renameHandler);
    }

    if (newFileItem) {
      const newNewFileItem = newFileItem.cloneNode(true) as HTMLElement;
      newFileItem.replaceWith(newNewFileItem);
      newNewFileItem.addEventListener("click", newFileHandler);
    }

    if (newFolderItem) {
      const newNewFolderItem = newFolderItem.cloneNode(true) as HTMLElement;
      newFolderItem.replaceWith(newNewFolderItem);
      newNewFolderItem.addEventListener("click", newFolderHandler);
    }

    if (deleteItem) {
      const newDeleteItem = deleteItem.cloneNode(true) as HTMLElement;
      deleteItem.replaceWith(newDeleteItem);
      newDeleteItem.addEventListener("click", deleteHandler);
    }
  }

  private _startRename(nodeUri: string) {
    const nodeElement = this._renderedNodes.get(nodeUri);
    if (!nodeElement) return;

    nodeElement.classList.add("rename");

    const nameSpan = nodeElement.querySelector(".name") as HTMLElement;
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
      if (confirmed && newName && newName !== originalName) {
        this._performRename(nodeUri, newName);
      }

      input.replaceWith(nameSpan);
    };

    input.addEventListener("blur", () => finishEdit(false));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finishEdit(true);
      if (e.key === "Escape") finishEdit(false);
    });
  }

  private _startAddNode(parentUri: string, type: "file" | "folder") {
    let childContainer = this._renderedChildContainers.get(parentUri);

    if (!childContainer) {
      if (parentUri === this._structure.uri)
        childContainer = this._el!.querySelector(".tree") as HTMLDivElement;
      if (!childContainer) {
        return;
      }
    }

    const icon = document.createElement("span");
    icon.innerHTML =
      type === "file" ? getFileIcon("file.txt") : getThemeIcon("chevronRight");

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `New ${type}...`;
    input.className = "inline-editor-input";

    if (type === "file") {
      input.oninput = (_event) => {
        icon.innerHTML = getFileIcon((_event.target as HTMLInputElement).value);
      };
    }

    const tempLi = document.createElement("div");
    tempLi.className = "node temp-node";
    tempLi.appendChild(icon);
    tempLi.appendChild(input);

    const depth = this._calculateDepth(childContainer);
    tempLi.style.paddingLeft = `${depth * 1.4}rem`;
    childContainer.insertBefore(tempLi, childContainer.firstChild);

    input.focus();

    let isProcessing = false;

    const finishAdd = (confirmed: boolean) => {
      if (isProcessing) return;
      isProcessing = true;

      const name = input.value.trim();
      if (confirmed && name) {
        const uri = path.join([parentUri, name]);

        if (this._isDuplicateInParent(parentUri, name)) {
          alert(`A ${type} named "${name}" already exists in this location.`);
          isProcessing = false;
          input.focus();
          input.select();
          return;
        }

        if (type === "file") fs.createFile(uri);
        else fs.createFolder(uri);
      }
      tempLi.remove();
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

  private _isDuplicateInParent(parentUri: string, name: string): boolean {
    const normalizedParentUri = this._normalizeUri(parentUri);
    const parentNode = this._findNodeByUri(
      this._structure,
      normalizedParentUri
    );

    if (!parentNode || !parentNode.children) {
      return false;
    }

    return parentNode.children.some(
      (child) => child.name.toLowerCase() === name.toLowerCase()
    );
  }

  private async _performRename(nodeUri: string, newName: string) {
    const oldUri = nodeUri;
    const parentDir = path.dirname(oldUri);
    const newUri = path.join([parentDir, newName]);

    if (this._isUriDuplicate(this._structure, newUri)) {
      alert("A file or folder with that name already exists.");
      return;
    }

    fs.rename(nodeUri, newUri);

    const _newStructure = await path.walkdir(this._structure.uri);
    this._structure = _newStructure;
  }

  private _updateChildUris(
    node: IFolderStructure,
    oldParentUri: string,
    newParentUri: string
  ) {
    if (node.children) {
      node.children.forEach((child) => {
        const newChildUri = child.uri.replace(oldParentUri, newParentUri);
        child.uri = newChildUri;
        if (child.type === "folder") {
          this._updateChildUris(child, oldParentUri, newParentUri);
        }
      });
    }
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
    element.dataset.depth = depth.toString();
    element.style.setProperty("--nesting-depth", depth.toString());
    element.style.paddingLeft = `${depth * 1.4}rem`;

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

  private _normalizeUri(uri: string): string {
    return uri.replace(/\\/g, "/");
  }

  private async _renameNode(nodeUri: string, newName: string) {
    const node = this._findNodeByUri(this._structure, nodeUri);
    if (!node || !newName || node.name === newName) {
      return;
    }

    const oldUri = node.uri;
    const parentDir = path.dirname(oldUri);
    const newUri = path.join([parentDir, newName]);

    if (this._isDuplicateInParent(parentDir, newName)) {
      alert("A file or folder with that name already exists.");
      return;
    }

    try {
      this._isRenamingInProgress = true;

      await fs.rename(oldUri, newUri);

      node.name = newName;
      node.uri = newUri;

      if (node.type === "folder") {
        this._updateChildUris(node, oldUri, newUri);
      }

      const nodeElement = this._renderedNodes.get(oldUri);
      if (nodeElement) {
        const nameSpan = nodeElement.querySelector(".name") as HTMLElement;
        if (nameSpan) {
          nameSpan.textContent = newName;
        }

        nodeElement.dataset.nodeId = newUri;

        this._renderedNodes.delete(oldUri);
        this._renderedNodes.set(newUri, nodeElement);
      }

      if (node.type === "folder") {
        const childContainer = this._renderedChildContainers.get(oldUri);
        if (childContainer) {
          childContainer.dataset.nodeId = newUri;
          this._renderedChildContainers.delete(oldUri);
          this._renderedChildContainers.set(newUri, childContainer);
        }
      }

      if (this._expandedFolders.has(oldUri)) {
        this._expandedFolders.delete(oldUri);
        this._expandedFolders.add(newUri);
        window.storage.store(
          "files-expanded-folder",
          Array.from(this._expandedFolders)
        );
      }

      if (this._loadedFolders.has(oldUri)) {
        this._loadedFolders.delete(oldUri);
        this._loadedFolders.add(newUri);
      }

      this._lastStructureHash = this._generateStructureHash(this._structure);
      window.storage.store(
        "workbench.workspace.folder.structure",
        this._structure
      );
      dispatch(update_folder_structure(this._structure));

      this._updateTabs(oldUri, newUri, newName);

      setTimeout(() => {
        this._isRenamingInProgress = false;
      }, 500);
    } catch (error) {
      this._isRenamingInProgress = false;

      alert("Failed to rename. Please try again.");
    }
  }

  private _updateTabs(oldUri: string, newUri: string, newName: string) {
    const stateValue = select((s) => s.main.editor_tabs);
    let currentTabs: IEditorTab[] = [];

    if (Array.isArray(stateValue)) {
      currentTabs = stateValue;
    } else if (stateValue && typeof stateValue === "object") {
      currentTabs = Object.values(stateValue);
    }

    const updatedTabs = currentTabs.map((tab) => {
      if (tab.uri === oldUri) {
        return { ...tab, uri: newUri, name: newName };
      }
      return tab;
    });

    const hasChanged = updatedTabs.some(
      (tab, index) => tab.uri !== currentTabs[index]?.uri
    );

    if (hasChanged) {
      dispatch(update_editor_tabs(updatedTabs));
    }
  }

  private async _addNode(parentUri: string, newNode: IFolderStructure) {
    if (this._isRenamingInProgress) {
      return;
    }

    let escapedUri = parentUri;
    if (window.node.platform === "win32") {
      escapedUri = parentUri.replace(/\//g, "\\");
    }

    const cssEscapedUri = CSS.escape(escapedUri);

    let childContainer = document.querySelector(
      `.child-nodes[data-node-id="${cssEscapedUri}"]`
    ) as HTMLDivElement;

    if (!childContainer) {
      childContainer = this._el?.querySelector(".tree") as HTMLDivElement;
      if (!childContainer) {
        return;
      }
    }

    const newNodeEl = this._createNodeElement(
      newNode,
      this._calculateDepth(childContainer)
    );

    const insertPosition = this._findInsertPositionAlphabetically(
      childContainer,
      newNode
    );

    if (insertPosition) {
      childContainer.insertBefore(newNodeEl, insertPosition);
    } else {
      childContainer.appendChild(newNodeEl);
    }

    const normalizedUri = this._normalizeUri(newNode.uri);
    this._renderedNodes.set(normalizedUri, newNodeEl);

    if (newNode.type === "folder") {
      const newChildContainer = this._createChildContainer(newNode.uri);

      if (newNodeEl.nextSibling) {
        childContainer.insertBefore(newChildContainer, newNodeEl.nextSibling);
      } else {
        childContainer.appendChild(newChildContainer);
      }

      this._renderedChildContainers.set(normalizedUri, newChildContainer);
    }

    const normalizedParentUri = this._normalizeUri(parentUri);
    const parentNode = this._findNodeByUri(
      this._structure,
      normalizedParentUri
    );
    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push(newNode);
      this._sortChildren(parentNode);
    }

    if (newNode.type === "folder") {
      this._loadedFolders.add(normalizedUri);
    }

    const _newStructure = await path.walkdir(this._structure.uri);
    this._structure = _newStructure;

    this._lastStructureHash = this._generateStructureHash(this._structure);

    window.storage.store(
      "workbench.workspace.folder.structure",
      this._structure
    );
    dispatch(update_folder_structure(this._structure));
  }

  private _findInsertPositionAlphabetically(
    container: HTMLElement,
    newNode: IFolderStructure
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

  private _getParentUri(_uri: string) {
    const normalizedUri = this._normalizeUri(_uri);

    const findParent = (node: IFolderStructure): string | null => {
      if (!node.children) return null;

      for (const child of node.children) {
        if (this._normalizeUri(child.uri) === normalizedUri) {
          return this._normalizeUri(node.uri);
        }

        const found = findParent(child);
        if (found) return found;
      }

      return null;
    };

    return findParent(this._structure);
  }

  private async _removeNode(nodeUri: string) {
    if (this._isRenamingInProgress) {
      return;
    }

    const normalizedUri = this._normalizeUri(nodeUri);

    const nodeEl = this._renderedNodes.get(normalizedUri);
    if (!nodeEl) return;
    nodeEl.remove();
    this._renderedNodes.delete(normalizedUri);

    const childContainer = this._renderedChildContainers.get(normalizedUri);
    if (childContainer) {
      childContainer.remove();
      this._renderedChildContainers.delete(normalizedUri);
    }

    this._removeNodeRecursively(this._structure, normalizedUri);

    this._loadedFolders.delete(normalizedUri);

    this._lastStructureHash = this._generateStructureHash(this._structure);

    if (fs.isFolder(nodeUri)) fs.deleteFolder(nodeUri);
    else fs.deleteFile(nodeUri);

    const _newStructure = await path.walkdir(this._structure.uri);
    this._structure = _newStructure;

    window.storage.store(
      "workbench.workspace.folder.structure",
      this._structure
    );
    dispatch(update_folder_structure(this._structure));
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
}
