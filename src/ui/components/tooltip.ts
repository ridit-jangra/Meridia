import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";

export function Tooltip(opts: {
  text: string;
  child: HTMLElement;
  class?: string;
  position?: "top" | "bottom" | "left" | "right" | "auto";
}) {
  const tip = h(
    "div",
    {
      class: cn(
        "pointer-events-none fixed z-[9999] hidden px-2 py-1 text-[12.5px] " +
          "bg-tooltip-background text-tooltip-foreground border border-tooltip-border rounded-[8px] " +
          "animate-in fade-in zoom-in-95 duration-150",
        opts.class,
      ),
    },
    opts.text,
  );

  document.body.appendChild(tip);

  const show = (e: MouseEvent) => {
    const rect = opts.child.getBoundingClientRect();

    tip.style.display = "block";
    const tipRect = tip.getBoundingClientRect();

    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let position = opts.position || "auto";

    if (position === "auto") {
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;

      if (spaceBelow >= tipRect.height + gap) {
        position = "bottom";
      } else if (spaceAbove >= tipRect.height + gap) {
        position = "top";
      } else if (spaceRight >= tipRect.width + gap) {
        position = "right";
      } else if (spaceLeft >= tipRect.width + gap) {
        position = "left";
      } else {
        position = "bottom";
      }
    }

    let left = 0;
    let top = 0;

    switch (position) {
      case "bottom":
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        top = rect.bottom + gap;
        break;

      case "top":
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        top = rect.top - tipRect.height - gap;
        break;

      case "left":
        left = rect.left - tipRect.width - gap;
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        break;

      case "right":
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        break;
    }

    left = Math.max(gap, Math.min(left, viewportWidth - tipRect.width - gap));
    top = Math.max(gap, Math.min(top, viewportHeight - tipRect.height - gap));

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  const hide = () => {
    tip.style.display = "none";
  };

  opts.child.addEventListener("mouseenter", show);
  opts.child.addEventListener("mouseleave", hide);
  opts.child.addEventListener("blur", hide);
  opts.child.addEventListener("mousedown", hide);

  return {
    el: opts.child,
    destroy() {
      opts.child.removeEventListener("mouseenter", show);
      opts.child.removeEventListener("mouseleave", hide);
      opts.child.removeEventListener("blur", hide);
      opts.child.removeEventListener("mousedown", hide);
      tip.remove();
    },
  };
}
