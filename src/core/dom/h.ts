// src/core/dom/h.ts
type Child =
  | HTMLElement
  | SVGElement
  | string
  | number
  | boolean
  | null
  | undefined;

type HProps<T extends Element> = {
  class?: string | T;
  style?:
    | string
    | Partial<CSSStyleDeclaration>
    | Record<string, string | number>;
  attrs?: Record<string, any>;
  on?: Record<string, (e: any) => void>;
} & Record<string, any>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: HProps<HTMLElementTagNameMap[K]> | null,
  ...children: Child[]
): HTMLElementTagNameMap[K];

export function h<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: HProps<SVGElementTagNameMap[K]> | null,
  ...children: Child[]
): SVGElementTagNameMap[K];

export function h(tag: any, props?: any, ...children: Child[]) {
  const el =
    tag === "svg" ||
    tag === "path" ||
    tag === "g" ||
    tag === "circle" ||
    tag === "rect"
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);

  if (props) {
    const { class: className, style, attrs, on, ...rest } = props;

    if (className) el.setAttribute("class", className);

    if (style != null) {
      if (typeof style === "string") {
        (el as HTMLElement).style.cssText += style;
      } else {
        const s = (el as HTMLElement).style as any;
        for (const k in style) {
          const v = (style as any)[k];
          if (v == null) continue;
          s[k] = typeof v === "number" ? String(v) : v;
        }
      }
    }

    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === false || v == null) continue;
        if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, String(v));
      }
    }

    if (on) {
      for (const k in on) el.addEventListener(k, on[k]);
    }

    for (const k in rest) {
      const v = rest[k];
      if (v == null) continue;
      if (k in el) (el as any)[k] = v;
      else el.setAttribute(k, String(v));
    }
  }

  for (const c of children) {
    if (c == null || c === false) continue;
    if (typeof c === "string" || typeof c === "number") {
      el.appendChild(document.createTextNode(String(c)));
    } else {
      el.appendChild(c as any);
    }
  }

  return el as any;
}
