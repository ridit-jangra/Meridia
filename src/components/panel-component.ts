import { h } from "../core/dom/h";

export function PanelComponent(opts: { id: string }) {
  return h("div", { class: "p-2" }, `Panel: ${opts.id}`);
}
