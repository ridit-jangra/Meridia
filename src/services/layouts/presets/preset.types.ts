export type TLayoutNode =
  | TSplitNode
  | TTabNode
  | TPanelNode
  | TActivityBarPanelNode;

export type TLayoutPreset = {
  id: string;
  name: string;
  root: TLayoutNode;
};

export type TTab = {
  id: string;
  label: string;
  shortcut_id?: string;
};

export type TSplitNode = {
  type: "split";
  dir: "row" | "col";
  sizes: number[]; // one entry per child, should sum to 100
  children: TLayoutNode[];
};

export type TPanelNode = {
  type: "panel";
  id: string;
  enabled?: boolean;
};

export type TActivityBarPanelNode = {
  id: string;
  type: "activity-bar-panel";
  enabled?: boolean;
  panels: {
    id: string;
    icon: string;
    tooltip?: string;
    shortcut_id?: string;
  }[];
};

export type TTabNode = {
  type: "tabs";
  id: string;
  tabs: TTab[];
  active: string;
  enabled?: boolean;
};
