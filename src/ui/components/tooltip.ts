import { cn } from "../common/cn";
import { h } from "../common/h";

export function Tooltip(opts: {
  text: string;
  child: HTMLElement;
  class?: string;
}) {
  const tip = h(
    "div",
    {
      class: cn(
        "pointer-events-none fixed z-[9999] hidden px-2 py-1 text-[12px] " +
          "bg-popover text-popover-foreground border border-border rounded-none",
        opts.class,
      ),
    },
    opts.text,
  );

  document.body.appendChild(tip);

  const show = (e: MouseEvent) => {
    tip.style.left = `${e.clientX + 10}px`;
    tip.style.top = `${e.clientY + 10}px`;
    tip.style.display = "block";
  };

  const move = (e: MouseEvent) => {
    tip.style.left = `${e.clientX + 10}px`;
    tip.style.top = `${e.clientY + 10}px`;
  };

  const hide = () => {
    tip.style.display = "none";
  };

  opts.child.addEventListener("mouseenter", show);
  opts.child.addEventListener("mousemove", move);
  opts.child.addEventListener("mouseleave", hide);
  opts.child.addEventListener("blur", hide);

  return {
    el: opts.child,
    destroy() {
      opts.child.removeEventListener("mouseenter", show);
      opts.child.removeEventListener("mousemove", move);
      opts.child.removeEventListener("mouseleave", hide);
      opts.child.removeEventListener("blur", hide);
      tip.remove();
    },
  };
}
