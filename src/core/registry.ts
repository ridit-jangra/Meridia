import { Explorer } from "../workbench/explorer/explorer";
import { h } from "./dom/h";

export const tabs_registry: Record<string, () => HTMLElement> = {
  terminal: () => h("div", { class: "p-2" }, "Terminal view"),
  problems: () => h("div", { class: "p-2" }, "Problems view"),
};

export const panels_registry: Record<string, () => HTMLElement> = {
  explorer: () => Explorer(),
};
