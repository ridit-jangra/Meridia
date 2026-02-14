export type Child =
  | HTMLElement
  | Text
  | string
  | number
  | boolean
  | null
  | undefined;

export type Props = {
  class?: string;
  style?: Partial<CSSStyleDeclaration>;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string | number | boolean | null | undefined>;
  on?: Record<string, (e: Event) => void>;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (props?.class) el.className = props.class;
  if (props?.style) Object.assign(el.style, props.style);

  if (props?.attrs) {
    for (const [k, val] of Object.entries(props.attrs)) {
      if (val === null || val === undefined || val === false) continue;
      if (val === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(val));
    }
  }

  if (props?.dataset) {
    for (const [k, val] of Object.entries(props.dataset)) {
      if (val === null || val === undefined || val === false) continue;
      (el as any).dataset[k] = String(val);
    }
  }

  if (props?.on) {
    for (const [name, fn] of Object.entries(props.on)) {
      el.addEventListener(name, fn as any);
    }
  }

  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (typeof c === "string" || typeof c === "number")
      el.appendChild(document.createTextNode(String(c)));
    else if (c === true) el.appendChild(document.createTextNode("true"));
    else el.appendChild(c);
  }

  return el;
}
