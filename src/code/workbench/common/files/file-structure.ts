import { IFolderStructure } from "../../workbench.types.js";

const path = window.path;

export class FileStructure {
  private _structure: IFolderStructure;
  private _expandedFolders: Set<string> = new Set();
  private _loadedFolders: Set<string> = new Set();

  constructor(initialStructure?: IFolderStructure) {
    this._structure = initialStructure || ([] as any);
    this._loadExpandedState();
  }

  private _loadExpandedState() {
    const expanded = window.storage.get("files-expanded-folder");
    if (expanded && Array.isArray(expanded)) {
      this._expandedFolders = new Set(expanded);
    } else if (expanded && typeof expanded === "object") {
      const keys = Object.keys(expanded);
      if (keys.length > 0) {
        this._expandedFolders = new Set(keys);
      }
    }
  }

  get structure(): IFolderStructure {
    return this._structure;
  }

  set structure(value: IFolderStructure) {
    this._structure = value;
    this._saveStructure();
  }

  get expandedFolders(): Set<string> {
    return this._expandedFolders;
  }

  get loadedFolders(): Set<string> {
    return this._loadedFolders;
  }

  private _saveStructure() {
    window.storage.store(
      "workbench.workspace.folder.structure",
      this._structure
    );
  }

  saveExpandedState() {
    window.storage.store(
      "files-expanded-folder",
      Array.from(this._expandedFolders)
    );
  }

  toggleExpanded(uri: string): boolean {
    const isExpanded = this._expandedFolders.has(uri);
    if (isExpanded) {
      this._expandedFolders.delete(uri);
    } else {
      this._expandedFolders.add(uri);
    }
    this.saveExpandedState();
    return !isExpanded;
  }

  isExpanded(uri: string): boolean {
    return this._expandedFolders.has(uri);
  }

  isLoaded(uri: string): boolean {
    return this._loadedFolders.has(uri);
  }

  markAsLoaded(uri: string) {
    this._loadedFolders.add(uri);
  }

  findNodeByUri(targetUri: string): IFolderStructure | null {
    return this._findNodeRecursive(this._structure, targetUri);
  }

  private _findNodeRecursive(
    node: IFolderStructure,
    targetUri: string
  ): IFolderStructure | null {
    if (!node || !targetUri) return null;

    const normalize = (uri: string) => uri.replace(/\\/g, "/");

    if (normalize(node.uri) === normalize(targetUri)) {
      return node;
    }

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = this._findNodeRecursive(child, targetUri);
        if (found) return found;
      }
    }

    return null;
  }

  addNode(parentUri: string, newNode: IFolderStructure): boolean {
    const normalizedParentUri = this._normalizeUri(parentUri);
    const parentNode = this.findNodeByUri(normalizedParentUri);

    if (!parentNode) {
      if (normalizedParentUri === this._normalizeUri(this._structure.uri)) {
        if (!this._structure.children) {
          this._structure.children = [];
        }

        const exists = this._structure.children.some(
          (child) =>
            this._normalizeUri(child.uri) === this._normalizeUri(newNode.uri)
        );

        if (!exists) {
          this._structure.children.push(newNode);
          this._sortChildren(this._structure);
          this._saveStructure();
          return true;
        }
      }
      return false;
    }

    if (!parentNode.children) {
      parentNode.children = [];
    }

    const exists = parentNode.children.some(
      (child) =>
        this._normalizeUri(child.uri) === this._normalizeUri(newNode.uri)
    );

    if (!exists) {
      parentNode.children.push(newNode);
      this._sortChildren(parentNode);
      this._saveStructure();
      return true;
    }

    return false;
  }

  removeNode(nodeUri: string): boolean {
    const removed = this._removeNodeRecursive(this._structure, nodeUri);
    if (removed) {
      this._loadedFolders.delete(nodeUri);
      this._expandedFolders.delete(nodeUri);
      this.saveExpandedState();
      this._saveStructure();
    }
    return removed;
  }

  private _removeNodeRecursive(
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
      this._removeNodeRecursive(child, targetUri)
    );
  }

  renameNode(
    oldUri: string,
    newName: string
  ): { success: boolean; newUri?: string } {
    const node = this.findNodeByUri(oldUri);
    if (!node) {
      return { success: false };
    }

    const parentDir = path.dirname(oldUri);
    const newUri = path.join([parentDir, newName]);

    if (this._isUriDuplicate(this._structure, newUri)) {
      return { success: false };
    }

    node.name = newName;
    node.uri = newUri;

    if (node.type === "folder") {
      this._updateChildUris(node, oldUri, newUri);
    }

    if (this._expandedFolders.has(oldUri)) {
      this._expandedFolders.delete(oldUri);
      this._expandedFolders.add(newUri);
      this.saveExpandedState();
    }

    if (this._loadedFolders.has(oldUri)) {
      this._loadedFolders.delete(oldUri);
      this._loadedFolders.add(newUri);
    }

    this._saveStructure();
    return { success: true, newUri };
  }

  private _updateChildUris(
    node: IFolderStructure,
    oldUri: string,
    newUri: string
  ) {
    if (node.children) {
      node.children.forEach((child) => {
        child.uri = child.uri.replace(oldUri, newUri);
        if (child.type === "folder") {
          this._updateChildUris(child, oldUri, newUri);
        }
      });
    }
  }

  private _isUriDuplicate(node: IFolderStructure, targetUri: string): boolean {
    if (this._normalizeUri(node.uri) === this._normalizeUri(targetUri)) {
      return true;
    }

    if (node.children) {
      return node.children.some((child) =>
        this._isUriDuplicate(child, targetUri)
      );
    }

    return false;
  }

  isDuplicateInParent(parentUri: string, name: string): boolean {
    const normalizedParentUri = this._normalizeUri(parentUri);
    const parentNode = this.findNodeByUri(normalizedParentUri);

    if (!parentNode) {
      if (normalizedParentUri === this._normalizeUri(this._structure.uri)) {
        if (!this._structure.children) return false;
        return this._structure.children.some(
          (child) => child.name.toLowerCase() === name.toLowerCase()
        );
      }
      return false;
    }

    if (!parentNode.children) {
      return false;
    }

    return parentNode.children.some(
      (child) => child.name.toLowerCase() === name.toLowerCase()
    );
  }

  private _sortChildren(parentNode: IFolderStructure) {
    if (!parentNode.children) return;

    parentNode.children.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  private _normalizeUri(uri: string): string {
    return uri.replace(/\\/g, "/");
  }

  async loadChildFolder(folderUri: string): Promise<boolean> {
    try {
      const result = await window.files.openChildFolder(folderUri);
      if (result && result.success) {
        this._structure = result.structure;
        this._loadedFolders.add(folderUri);
        this._saveStructure();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load child folder:", error);
      return false;
    }
  }

  async refresh(): Promise<boolean> {
    if (!this._structure.uri) return false;

    try {
      const newStructure = await path.walkdir(this._structure.uri);
      this._structure = newStructure;
      this._saveStructure();
      return true;
    } catch (error) {
      console.error("Failed to refresh structure:", error);
      return false;
    }
  }
}
