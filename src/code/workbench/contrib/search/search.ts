import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";

export function Search() {
  const content = h("div", { class: "h-full w-full pt-[2px]" });
  content.appendChild(h("div", { class: "p-4" }, "Search coming soon..."));

  const el = h("div", { class: cn("h-full w-full relative overflow-hidden") });

  return el;
}
