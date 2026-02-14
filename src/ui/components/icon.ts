import { h } from "../common/h";

export function codicon(name: string, className?: string) {
  return h("span", {
    class: `codicon codicon-${name} ${className ?? ""}`,
  });
}

const files = import.meta.glob("/node_modules/lucide-static/icons/*.svg", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

function applySvg(svg: string, size = 16, className?: string) {
  const wrap = document.createElement("span");
  wrap.innerHTML = svg;
  const el = wrap.firstElementChild as SVGElement;

  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("fill", "none");
  el.classList.add("stroke-current");
  if (className) el.classList.add(...className.split(" ").filter(Boolean));

  return el;
}

export async function l(name: string, size = 16, className?: string) {
  const key = name.toLowerCase();
  const path = `/node_modules/lucide-static/icons/${key}.svg`;

  const loader = files[path];
  if (!loader) throw new Error(`Lucide icon not found: ${key}`);

  const svg = await loader();
  return applySvg(svg, size, className);
}

export function lucide(name: string, size = 16, className?: string) {
  const holder = document.createElement("span");
  holder.className = className ?? "";

  l(name, size, className).then((svg) => holder.replaceWith(svg));
  return holder;
}
