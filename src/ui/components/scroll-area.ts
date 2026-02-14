import { cn } from "../common/cn";
import { h } from "../common/h";

export function ScrollArea(opts?: {
  class?: string;
  innerClass?: string;
  children?: Array<HTMLElement | string>;
}) {
  const inner = h(
    "div",
    { class: cn("min-h-0 min-w-0", opts?.innerClass) },
    ...(opts?.children ?? []),
  );

  const el = h(
    "div",
    { class: cn("min-h-0 min-w-0 overflow-auto", opts?.class) },
    inner,
  );

  return { el, inner };
}
