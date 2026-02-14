import { cn } from "../common/cn";
import { h } from "../common/h";

export function Label(text: string, opts?: { forId?: string; class?: string }) {
  return h(
    "label",
    {
      class: cn("text-[12px] text-foreground select-none", opts?.class),
      attrs: opts?.forId ? { for: opts.forId } : undefined,
    },
    text
  );
}