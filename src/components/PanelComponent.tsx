import { panels } from "../shared/panels-registery";
import { IPanelComponentProps } from "./components.types";

export function PanelComponent({ id }: IPanelComponentProps) {
  const Panel = panels[id];

  if (!Panel) return null;

  return <Panel />;
}
