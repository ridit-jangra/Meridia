import { h } from "../ui/common/h";

export function PanelComponent(opts: { id: string }) {
  return h("div", { class: "p-2" }, `Panel: ${opts.id}`);
}
