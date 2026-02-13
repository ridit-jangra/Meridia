export type TLayoutNode = TSplitNode | TTabNode | TPanelNode;

export type TLayoutPreset = {
  id: string;
  name: string;
  root: TLayoutNode;
};

export type TTab = {
  id: string;
  label: string;
};

export type TSplitNode = {
  type: "split";
  dir: "row" | "col";
  size: number;
  a: TLayoutNode;
  b: TLayoutNode;
};

export type TPanelNode = {
  type: "panel";
  id: string;
  enabled?: boolean;
};

export type TTabNode = {
  type: "tabs";
  id: string;
  tabs: TTab[];
  active: string;
  enabled?: boolean;
};
