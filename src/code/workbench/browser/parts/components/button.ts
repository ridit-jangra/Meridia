import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export function Button(
  label: string | HTMLElement,
  opts?: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent) => void;
    type?: "button" | "submit";
    tooltip?: {
      text?: string;
      content?: HTMLElement;
      class?: string;
      position?: "top" | "bottom" | "left" | "right" | "auto";
      delay?: number;
      hide_delay?: number;
    };
  },
) {
  const variant = opts?.variant ?? "default";
  const size = opts?.size ?? "md";

  const base =
    "flex items-center justify-center whitespace-nowrap select-none rounded-[7px] cursor-pointer " +
    "bg-background text-foreground " +
    "disabled:opacity-50 disabled:pointer-events-none transition-colors";

  const variants: Record<ButtonVariant, string> = {
    default:
      "bg-button-primary-background text-button-primary-foreground hover:bg-button-primary-hover-background active:bg-button-primary-active-background",
    secondary:
      "bg-button-secondary-background text-button-secondary-foreground hover:bg-button-secondary-hover-background active:bg-button-secondary-active-background",
    outline:
      "bg-background border border-workbench-border hover:bg-button-secondary-hover-background/40 hover:text-button-secondary-foreground active:bg-button-secondary-active-background/40",
    ghost:
      "bg-transparent hover:bg-button-secondary-hover-background/40 hover:text-button-secondary-foreground active:bg-button-secondary-active-background/40",
    destructive:
      "bg-red-500/60 text-zinc-200 hover:bg-red-500/70 active:bg-red-500/80",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-7 px-1 text-[12px]",
    md: "h-8 px-2 text-[13px]",
    lg: "h-9 px-3 text-[14px]",
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
      tooltip: opts?.tooltip,
    },
    h(
      "span",
      { class: "min-w-0 w-full truncate flex items-center justify-center" },
      label,
    ),
  );
}
