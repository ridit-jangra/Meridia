import { createElement, icons } from "lucide";
import { h } from "../common/h";

export function codicon(name: string, className?: string) {
  return h("span", {
    class: `codicon codicon-${name} ${className ?? ""}`,
  });
}

export function lucide(name: keyof typeof icons, size = 16) {
  const node = icons[name];

  const svg = createElement(node, {
    width: size,
    height: size,
    class: "text-foreground",
  });

  return svg as SVGElement;
}
