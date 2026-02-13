import { IPanelComponentProps } from "./components.types";

export function PanelComponent({ id }: IPanelComponentProps) {
  return (
    <div className="h-full w-full bg-neutral-900 text-white p-3">{id}</div>
  );
}
