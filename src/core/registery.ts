import { h } from "./dom/h";

export const tabs_registery: Record<string, () => HTMLElement> = {
  terminal: () => h("div", { class: "p-2" }, "Terminal view"),
  problems: () => h("div", { class: "p-2" }, "Problems view"),
};
