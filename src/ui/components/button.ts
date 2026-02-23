import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export function Button(
  label: string,
  opts?: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent) => void;
    type?: "button" | "submit";
  },
) {
  const variant = opts?.variant ?? "default";
  const size = opts?.size ?? "md";

  const base =
    "inline-flex items-center justify-center whitespace-nowrap select-none rounded-[7px] text-[13px] cursor-pointer py-4 text-[14px] " +
    "bg-background text-foreground " +
    "focus:outline-none focus:ring-1 focus:ring-focus-border disabled:opacity-50 disabled:pointer-events-none transition-colors";

  const variants: Record<ButtonVariant, string> = {
    default:
      "bg-button-primary-background text-button-primary-foreground hover:bg-button-primary-hover-background active:bg-button-primary-active-background",
    secondary:
      "bg-button-secondary-background text-button-secondary-foreground hoverbg-button-secondary-hover-background active:bg-button-secondary-active-background",
    outline:
      "bg-background hover:bg-button-secondary-hover-background/40 hover:text-button-secondary-foreground active:text-button-secondary-active-background border-workbench-border border-2",
    ghost:
      "border-transparent hover:bg-button-secondary-hover-background/40 hover:text-button-secondary-foreground active:button-secondary-active-background",
    destructive:
      "bg-red-500/60 text-zinc-200 hover:bg-red-500/70 active:bg-red-500/80",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-7 px-2",
    md: "h-8 px-2.5",
    lg: "h-9 px-3",
    icon: "h-8 w-8 px-0",
  };

  return h(
    "button",
    {
      class: cn(base, variants[variant], sizes[size], "min-w-0", opts?.class),
      attrs: {
        type: opts?.type ?? "button",
        disabled: opts?.disabled ?? false,
      },
      on: opts?.onClick
        ? { click: (e) => opts.onClick!(e as MouseEvent) }
        : undefined,
    },
    h("span", { class: "min-w-0 w-full truncate" }, label),
  );
}
