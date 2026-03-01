import { cn } from "../../../contrib/core/utils/cn";
import { h } from "../../../contrib/core/dom/h";
import { lucide } from "./icon";

export function Breadcrumb(opts: {
  path: string;
  class?: string;
  onSegmentClick?: (segment: string, fullPath: string) => void;
}) {
  const parts = opts.path.replace(/\\/g, "/").split("/").filter(Boolean);

  const el = h("div", {
    class: cn("flex items-center gap-0.5 text-[13px] min-w-0", opts.class),
  });

  parts.forEach((part, i) => {
    const isLast = i === parts.length - 1;
    const fullPath = "/" + parts.slice(0, i + 1).join("/");

    const segment = h(
      "span",
      {
        class: cn(
          "truncate shrink-0 max-w-[160px]",
          isLast
            ? "text-workbench-foreground font-medium"
            : "text-muted-foreground",
          !isLast && opts.onSegmentClick
            ? "hover:text-workbench-foreground cursor-pointer transition-colors"
            : "",
        ),
        on:
          !isLast && opts.onSegmentClick
            ? {
                click: () => opts.onSegmentClick!(part, fullPath),
              }
            : undefined,
      },
      part,
    );

    el.appendChild(segment);

    if (!isLast) {
      const sep = h(
        "span",
        {
          class: "shrink-0 [&_svg]:w-4.5 [&_svg]:h-4.5",
        },
        lucide("chevron-right"),
      );
      el.appendChild(sep);
    }
  });

  return {
    el,
    setPath(path: string) {
      el.innerHTML = "";
      const newBreadcrumb = Breadcrumb({ ...opts, path });
      while (newBreadcrumb.el.firstChild) {
        el.appendChild(newBreadcrumb.el.firstChild);
      }
    },
  };
}
