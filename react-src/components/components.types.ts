import { TTab } from "../layouts/presets/preset.types";

export interface IPanelComponentProps {
  id: string;
}

export interface ITabsComponentProps {
  tabs: TTab[];
  default_active_id: string;
}

export interface IActivityBarComponentProps {
  panels: {
    id: string;
    tooltip?: string;
    shortcut_id?: string;
    icon: string;
  }[];
}
