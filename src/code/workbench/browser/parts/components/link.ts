import { cn } from "../../../contrib/core/utils/cn";
import { h } from "../../../contrib/core/dom/h";

export type LinkVariant = "default" | "muted" | "danger";

export function Link(opts: {
  text?: string;
  content?: HTMLElement;
  href?: string;
  class?: string;
  variant?: LinkVariant;
  onClick?: (e: MouseEvent) => void;
}) {
  const variant = opts.variant ?? "default";

  const variantClass = {
    default: "text-link-foreground hover:text-link-hover-foreground",
    muted: "text-muted-foreground hover:text-foreground",
    danger: "text-destructive hover:text-destructive/80",
  }[variant];

  const el = h("a", {
    class: cn(
      "inline-flex items-center gap-1 cursor-pointer underline-offset-4 hover:underline text-[13px] transition-colors duration-150",
      variantClass,
      opts.class,
    ),
    ...(opts.href ? { href: opts.href } : {}),
    on: {
      click: (e: Event) => {
        const me = e as MouseEvent;
        if (!opts.href) e.preventDefault();
        opts.onClick?.(me);
      },
    },
  }) as HTMLAnchorElement;

  if (opts.content) {
    el.appendChild(opts.content);
  } else if (opts.text) {
    el.textContent = opts.text;
  }

  return {
    el,
    setText(text: string) {
      el.textContent = text;
    },
    setDisabled(disabled: boolean) {
      if (disabled) {
        el.style.pointerEvents = "none";
        el.classList.add("opacity-50");
      } else {
        el.style.pointerEvents = "";
        el.classList.remove("opacity-50");
      }
    },
    destroy() {
      el.remove();
    },
  };
}
