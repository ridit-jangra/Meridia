import { CoreEl } from "../core";

export class Tooltip extends CoreEl {
  constructor() {
    super();
  }

  _getEl(el: HTMLElement, text: string) {
    el.style.position = "relative";

    const t = document.createElement("div");
    t.textContent = text;
    t.style.position = "absolute";
    t.style.bottom = "125%";
    t.style.left = "50%";
    t.style.transform = "translateX(-50%)";
    t.style.background = "#111";
    t.style.color = "#fff";
    t.style.padding = "6px 8px";
    t.style.borderRadius = "4px";
    t.style.fontSize = "12px";
    t.style.opacity = "0";
    t.style.pointerEvents = "none";
    t.style.transition = "opacity 0.15s";

    el.appendChild(t);

    el.addEventListener("mouseenter", () => (t.style.opacity = "1"));
    el.addEventListener("mouseleave", () => (t.style.opacity = "0"));

    return el;
  }
}
