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
