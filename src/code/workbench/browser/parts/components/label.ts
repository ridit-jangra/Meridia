import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";

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
