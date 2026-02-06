import { dispatch } from "../common/store/store.js";
import { select } from "../common/store/selector.js";
import {
  update_editor_tabs,
  update_folder_structure,
} from "../common/store/slice.js";
import { IEditorTab, IFolderStructure } from "../workbench.types.js";
import { getThemeIcon } from "./media/icons.js";
import { CoreEl } from "./parts/core.js";
import { _newProject } from "./window/new-project/browser/new-project.js";
import { FileStructure } from "../common/files/file-structure.js";
import { FileRenderer } from "../common/files/file-renderer.js";
import { FileOperations } from "../common/files/file-operations.js";

const path = window.path;
const fs = window.fs;

export class Files extends CoreEl {
  private _fileStructure: FileStructure;
  _renderer: FileRenderer;
  _operations: FileOperations;
  private _pendingOperations: Map<string, Promise<any>> = new Map();

  constructor() {
    super();

    const storedStructure = window.storage.get(
      "workbench.workspace.folder.structure",
    );
    this._fileStructure = new FileStructure(storedStructure);

    this._renderer = new FileRenderer(
      (uri, nodeEl) => this._handleToggleFolder(uri, nodeEl),
      (uri, name) => this._handleOpenFile(uri, name),
      (x, y, node) => this._handleContextMenu(x, y, node),
    );

    this._operations = new FileOperations();

    dispatch(update_folder_structure(this._fileStructure.structure));

    this._createEl();
    this._setupWatcherListeners();
    this._restoreExpandedFolders();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "files";

    if (!this._fileStructure.structure.isRoot) {
      this._createEmptyState();
    } else {
      this._createTreeView();
    }
  }

  private _createEmptyState() {
    const emptyContainer = document.createElement("div");
    emptyContainer.className = "empty-state";

    const openFolderLabel = document.createElement("p");
    openFolderLabel.textContent = "No folder selected, Please open a folder.";

    const openFolderBtn = document.createElement("button");
    openFolderBtn.textContent = "Open Folder";
    openFolderBtn.className = "open-folder";
    openFolderBtn.onclick = () => window.files.openFolder();

    const createProjectBtn = document.createElement("button");
    createProjectBtn.textContent = "Create Project";
    createProjectBtn.className = "open-folder";
    createProjectBtn.onclick = () => _newProject._show();

    emptyContainer.appendChild(openFolderLabel);
    emptyContainer.appendChild(openFolderBtn);
    emptyContainer.appendChild(createProjectBtn);
    this._el!.appendChild(emptyContainer);
  }

  private _createTreeView() {
    const root = document.createElement("div");
    root.className = "root";

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = path.basename(this._fileStructure.structure.uri);

    const options = document.createElement("div");
    options.className = "options";

    const addFile = document.createElement("span");
    addFile.innerHTML = getThemeIcon("addFile");
    addFile.onclick = () =>
      this._handleAddNode(this._fileStructure.structure.uri, "file");

    const addFolder = document.createElement("span");
    addFolder.innerHTML = getThemeIcon("addDirectory");
    addFolder.onclick = () =>
      this._handleAddNode(this._fileStructure.structure.uri, "folder");

    const refresh = document.createElement("span");
    refresh.innerHTML = getThemeIcon("refresh");
    refresh.onclick = () => this._handleRefresh();

    options.appendChild(addFile);
    options.appendChild(addFolder);
    options.appendChild(refresh);

    root.appendChild(title);
    root.appendChild(options);

    const treeContainer = document.createElement("div");
    treeContainer.className = "tree-container scrollbar-container x-disable";

    const tree = document.createElement("div");
    tree.className = "tree";

    this._renderer.renderTree(
      this._fileStructure.structure.children || [],
      tree,
      0,
      this._fileStructure.expandedFolders,
      this._fileStructure.loadedFolders,
    );

    treeContainer.appendChild(tree);
    this._el!.appendChild(root);
    this._el!.appendChild(treeContainer);
  }

  private async _restoreExpandedFolders() {
    if (this._fileStructure.expandedFolders.size === 0) return;

    const expandedArray = Array.from(this._fileStructure.expandedFolders);

    for (const folderUri of expandedArray) {
      if (!this._fileStructure.isLoaded(folderUri)) {
        const success = await this._fileStructure.loadChildFolder(folderUri);
        if (!success) {
          this._fileStructure.toggleExpanded(folderUri);
        }
      }
    }

    this._fullRefresh();
  }

  private _setupWatcherListeners() {
    const ipc = window.ipc;

    ipc.on(
      "files-node-added",
      (
        _: any,
        data: {
          parentUri: string;
          nodeName: string;
          nodeType: "file" | "folder";
        },
      ) => {
        console.log("Watcher: node added", data);
        const newNode: IFolderStructure = {
          name: data.nodeName,
          isRoot: false,
          type: data.nodeType,
          children: [],
          uri: path.join([data.parentUri, data.nodeName]),
        };
        this._handleWatcherNodeAdded(data.parentUri, newNode);
      },
    );

    ipc.on("files-node-removed", (_: any, data: { nodeUri: string }) => {
      console.log("Watcher: node removed", data);
      this._handleWatcherNodeRemoved(data.nodeUri);
    });

    ipc.on(
      "files-node-renamed",
      (
        _: any,
        data: {
          oldUri: string;
          newUri: string;
          newName: string;
        },
      ) => {
        console.log("Watcher: node renamed", data);
        this._handleWatcherNodeRenamed(data.oldUri, data.newUri, data.newName);
      },
    );
  }

  private _handleWatcherNodeAdded(
    parentUri: string,
    newNode: IFolderStructure,
  ) {
    if (this._operations.isRenamingInProgress) return;

    const added = this._fileStructure.addNode(parentUri, newNode);
    if (!added) {
      console.log("Node already exists, skipping UI update");
      return;
    }

    let container = this._renderer.getChildContainer(parentUri);

    if (!container) {
      const rootUri = this._fileStructure.structure.uri;
      if (this._normalizeUri(parentUri) === this._normalizeUri(rootUri)) {
        container = this._el!.querySelector(".tree") as HTMLElement;
      }
    }

    if (container) {
      const depth = this._renderer.calculateDepth(container);
      this._renderer.addNodeToContainer(
        newNode,
        container,
        depth,
        this._fileStructure.expandedFolders,
      );
      console.log("Node added to UI:", newNode.name);
    } else {
      console.warn("Container not found for parent:", parentUri);
    }

    dispatch(update_folder_structure(this._fileStructure.structure));
  }

  private _handleWatcherNodeRemoved(nodeUri: string) {
    if (this._operations.isRenamingInProgress) return;

    const normalizedUri = this._normalizeUri(nodeUri);

    let matchedUri: string | null = null;
    const checkNode = (node: IFolderStructure) => {
      if (this._normalizeUri(node.uri) === normalizedUri) {
        matchedUri = node.uri;
        return true;
      }
      if (node.children) {
        return node.children.some(checkNode);
      }
      return false;
    };

    checkNode(this._fileStructure.structure);

    if (!matchedUri) {
      console.warn("Node not found for removal:", nodeUri);
      return;
    }

    this._fileStructure.removeNode(matchedUri);

    this._renderer.removeNode(matchedUri);
    console.log("Node removed:", matchedUri);

    this._updateTabsForRemovedFile(matchedUri);

    dispatch(update_folder_structure(this._fileStructure.structure));
  }

  private _handleWatcherNodeRenamed(
    oldUri: string,
    newUri: string,
    newName: string,
  ) {
    if (this._operations.isRenamingInProgress) {
      console.log("User rename in progress, ignoring watcher event");
      return;
    }

    const result = this._fileStructure.renameNode(oldUri, newName);
    if (!result.success) {
      console.warn("Rename failed in structure:", oldUri);
      return;
    }

    this._renderer.updateNodeName(oldUri, newName);
    this._renderer.updateNodeUri(oldUri, newUri);
    console.log("Node renamed in UI:", oldUri, "->", newUri);

    this._updateTabsForRenamedFile(oldUri, newUri, newName);

    dispatch(update_folder_structure(this._fileStructure.structure));
  }

  private async _handleToggleFolder(uri: string, nodeEl: HTMLElement) {
    const isNowExpanded = this._fileStructure.toggleExpanded(uri);
    const container = this._renderer.getChildContainer(uri);

    if (!container) return;

    this._renderer.updateIconState(nodeEl, isNowExpanded);

    if (isNowExpanded && !this._fileStructure.isLoaded(uri)) {
      if (this._pendingOperations.has(uri)) {
        return;
      }

      const loadPromise = this._fileStructure.loadChildFolder(uri);
      this._pendingOperations.set(uri, loadPromise);

      const success = await loadPromise;
      this._pendingOperations.delete(uri);

      if (success) {
        const node = this._fileStructure.findNodeByUri(uri);
        if (node && node.children) {
          container.innerHTML = "";
          const depth = this._renderer.calculateDepth(container);
          this._renderer.renderTree(
            node.children,
            container,
            depth,
            this._fileStructure.expandedFolders,
            this._fileStructure.loadedFolders,
          );
        }
        dispatch(update_folder_structure(this._fileStructure.structure));
      }
    }

    this._renderer.animateToggle(container, isNowExpanded);
  }

  private _handleOpenFile(uri: string, name: string) {
    const stateValue = select((s) => s.main.editor_tabs);
    const normalizedUri = path.normalize(uri);

    let currentTabs: IEditorTab[] = [];
    if (Array.isArray(stateValue)) {
      currentTabs = stateValue;
    } else if (stateValue && typeof stateValue === "object") {
      currentTabs = Object.values(stateValue);
    }

    const existingIndex = currentTabs.findIndex(
      (tab) => tab.uri === normalizedUri,
    );

    if (existingIndex !== -1) {
      const updatedTabs = currentTabs.map((tab, index) => ({
        ...tab,
        active: index === existingIndex,
      }));
      dispatch(update_editor_tabs(updatedTabs));
    } else {
      const newTab: IEditorTab = {
        name,
        uri: normalizedUri,
        active: true,
        is_touched: false,
      };
      const updatedTabs = [
        ...currentTabs.map((tab) => ({ ...tab, active: false })),
        newTab,
      ];
      dispatch(update_editor_tabs(updatedTabs));
    }
  }

  private _handleContextMenu(x: number, y: number, node: IFolderStructure) {
    const contextMenu = this._operations.createContextMenu(x, y, node, {
      onOpen: () => this._handleOpenFile(node.uri, node.name),
      onRename: () => this._handleRename(node.uri),
      onNewFile: () => this._handleAddNode(node.uri, "file"),
      onNewFolder: () => this._handleAddNode(node.uri, "folder"),
      onDelete: () => this._handleDelete(node),
    });

    document.body.appendChild(contextMenu);
  }

  private _handleRename(nodeUri: string) {
    const nodeElement = this._renderer.getNodeElement(nodeUri);
    if (!nodeElement) return;

    this._operations.startRename(
      nodeUri,
      nodeElement,
      async (confirmed, newName) => {
        if (!confirmed || !newName) return;

        const parentDir = path.dirname(nodeUri);
        const newUri = path.join([parentDir, newName]);

        if (this._fileStructure.isDuplicateInParent(parentDir, newName)) {
          alert("A file or folder with that name already exists.");
          return;
        }

        const success = await this._operations.rename(nodeUri, newUri);
        if (!success) {
          alert("Failed to rename. Please try again.");
          return;
        }

        console.log("Rename operation completed, waiting for watcher event");
      },
    );
  }

  private _handleAddNode(parentUri: string, type: "file" | "folder") {
    let container = this._renderer.getChildContainer(parentUri);

    if (!container) {
      if (parentUri === this._fileStructure.structure.uri) {
        container = this._el!.querySelector(".tree") as HTMLElement;
      }
    }

    if (!container) {
      console.warn("Container not found for parent:", parentUri);
      return;
    }

    const depth = this._renderer.calculateDepth(container);

    this._operations.startAddNode(
      parentUri,
      type,
      container,
      depth,
      async (confirmed, name) => {
        if (!confirmed || !name) return;

        if (this._fileStructure.isDuplicateInParent(parentUri, name)) {
          alert(`A ${type} named "${name}" already exists in this location.`);
          return;
        }

        const uri = path.join([parentUri, name]);

        const success =
          type === "file"
            ? await this._operations.createFile(uri)
            : await this._operations.createFolder(uri);

        if (!success) {
          alert(`Failed to create ${type}.`);
          return;
        }

        console.log(`${type} created, waiting for watcher event`);
      },
    );
  }

  private async _handleDelete(node: IFolderStructure) {
    const confirmed = confirm(
      `Are you sure you want to delete "${node.name}"?`,
    );
    if (!confirmed) return;

    const success =
      node.type === "file"
        ? await this._operations.deleteFile(node.uri)
        : await this._operations.deleteFolder(node.uri);

    if (!success) {
      alert("Failed to delete. Please try again.");
      return;
    }

    console.log("Delete operation completed, waiting for watcher event");
  }

  private async _handleRefresh() {
    console.log("Refreshing file tree...");

    const expandedSnapshot = new Set(this._fileStructure.expandedFolders);
    const loadedSnapshot = new Set(this._fileStructure.loadedFolders);

    const success = await this._fileStructure.refresh();

    if (success) {
      expandedSnapshot.forEach((uri) => {
        if (this._fileStructure.findNodeByUri(uri)) {
          this._fileStructure.expandedFolders.add(uri);
        }
      });

      loadedSnapshot.forEach((uri) => {
        if (this._fileStructure.findNodeByUri(uri)) {
          this._fileStructure.loadedFolders.add(uri);
        }
      });

      this._fileStructure.saveExpandedState();

      this._fullRefresh();

      dispatch(update_folder_structure(this._fileStructure.structure));
      console.log("Refresh complete");
    } else {
      alert("Failed to refresh folder structure.");
    }
  }

  private _fullRefresh() {
    this._renderer.clear();

    const treeContainer = this._el!.querySelector(".tree");
    if (treeContainer) {
      treeContainer.innerHTML = "";
      this._renderer.renderTree(
        this._fileStructure.structure.children || [],
        treeContainer as HTMLElement,
        0,
        this._fileStructure.expandedFolders,
        this._fileStructure.loadedFolders,
      );
    }
  }

  private _updateTabsForRenamedFile(
    oldUri: string,
    newUri: string,
    newName: string,
  ) {
    const stateValue = select((s) => s.main.editor_tabs);
    let currentTabs: IEditorTab[] = [];

    if (Array.isArray(stateValue)) {
      currentTabs = stateValue;
    } else if (stateValue && typeof stateValue === "object") {
      currentTabs = Object.values(stateValue);
    }

    const normalizedOldUri = this._normalizeUri(oldUri);
    const normalizedNewUri = this._normalizeUri(newUri);

    const updatedTabs = currentTabs.map((tab) => {
      if (this._normalizeUri(tab.uri) === normalizedOldUri) {
        return { ...tab, uri: normalizedNewUri, name: newName };
      }
      return tab;
    });

    const hasChanged = updatedTabs.some(
      (tab, index) => tab.uri !== currentTabs[index]?.uri,
    );

    if (hasChanged) {
      dispatch(update_editor_tabs(updatedTabs));
    }
  }

  private _updateTabsForRemovedFile(uri: string) {
    const stateValue = select((s) => s.main.editor_tabs);
    let currentTabs: IEditorTab[] = [];

    if (Array.isArray(stateValue)) {
      currentTabs = stateValue;
    } else if (stateValue && typeof stateValue === "object") {
      currentTabs = Object.values(stateValue);
    }

    const normalizedUri = this._normalizeUri(uri);
    const tabIndex = currentTabs.findIndex(
      (t) => this._normalizeUri(t.uri) === normalizedUri,
    );

    if (tabIndex === -1) return;

    const closingTab = currentTabs[tabIndex]!;
    const isClosingActiveTab = closingTab.active;

    let updatedTabs = currentTabs.filter(
      (t) => this._normalizeUri(t.uri) !== normalizedUri,
    );

    if (isClosingActiveTab && updatedTabs.length > 0) {
      const newActiveIndex =
        tabIndex < updatedTabs.length ? tabIndex : updatedTabs.length - 1;
      updatedTabs[newActiveIndex] = {
        ...updatedTabs[newActiveIndex]!,
        active: true,
      };
    }

    dispatch(update_editor_tabs(updatedTabs));
  }

  private _normalizeUri(uri: string): string {
    return uri.replace(/\\/g, "/");
  }
}

export const files = new Files();
