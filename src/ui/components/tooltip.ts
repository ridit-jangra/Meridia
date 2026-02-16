import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";

export function Tooltip(opts: {
  text: string;
  child: HTMLElement;
  class?: string;
  position?: "top" | "bottom" | "left" | "right" | "auto";
  delay?: number;
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

  let showTimeout: number | null = null;

  const hide = () => {
    if (showTimeout !== null) {
      window.clearTimeout(showTimeout);
      showTimeout = null;
    }
    tip.style.display = "none";
  };

  const show = (e: MouseEvent) => {
    if (!document.body.contains(opts.child)) {
      hide();
      return;
    }

    const rect = opts.child.getBoundingClientRect();

    tip.style.display = "block";
    const tipRect = tip.getBoundingClientRect();

    const gap = 6;
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

  const handleMouseEnter = (e: MouseEvent) => {
    if (opts.delay) {
      showTimeout = window.setTimeout(() => show(e), opts.delay);
    } else {
      show(e);
    }
  };

  opts.child.addEventListener("mouseenter", handleMouseEnter);
  opts.child.addEventListener("mouseleave", hide);
  opts.child.addEventListener("blur", hide);
  opts.child.addEventListener("mousedown", hide);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(opts.child)) {
      hide();
      tip.remove();
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return {
    el: opts.child,
    destroy() {
      if (showTimeout !== null) {
        window.clearTimeout(showTimeout);
      }
      opts.child.removeEventListener("mouseenter", handleMouseEnter);
      opts.child.removeEventListener("mouseleave", hide);
      opts.child.removeEventListener("blur", hide);
      opts.child.removeEventListener("mousedown", hide);
      observer.disconnect();
      tip.remove();
    },
  };
}
