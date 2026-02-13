export type layout_node =
  | {
      type: "split";
      dir: "row" | "col";
      size: number;
      a: layout_node;
      b: layout_node;
    }
  | {
      type: "tabs";
      id: string;
      tabs: string[];
      active: string;
      enabled?: boolean;
    }
  | {
      type: "panel";
      id: string;
      enabled?: boolean;
    };

export type layout_preset = {
  id: string;
  name: string;
  root: layout_node;
};
