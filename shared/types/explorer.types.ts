export interface INode {
  id: string;
  type: "file" | "folder";
  name: string;
  path: string;
  child_nodes: INode[];
}

export interface IRootNode {
  name: string;
}

export interface IFolderStructure {
  root: IRootNode;
  path: string;
  structure: INode[];
}

export interface IChildStructure {
  path: string;
  id: string;
  child_nodes: INode[];
}

export type TWatchEvent =
  | { type: "add" | "remove" | "change"; path: string; isDir: boolean }
  | { type: "rename"; from: string; to: string; isDir: boolean };
