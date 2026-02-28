import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";

export function Label(text: string, opts?: { forId?: string; class?: string }) {
  return h(
    "label",
    {
      class: cn(
        "text-[14px] text-workbench-foreground select-none",
        opts?.class,
      ),
      attrs: opts?.forId ? { for: opts.forId } : undefined,
    },
    text,
  );
}
