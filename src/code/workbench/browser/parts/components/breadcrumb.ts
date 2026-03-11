import { cn } from "../../../contrib/core/utils/cn";
import { h } from "../../../contrib/core/dom/h";
import { lucide } from "./icon";
import { Dropdown } from "./dropdown";
type CrumbItem =
  | { type: "crumb"; part: string; index: number }
  | { type: "dropdown"; items: { part: string; index: number }[] };

function collapseParts(
  parts: string[],
  keepEnd = 2,
  maxVisible = 5,
): CrumbItem[] {
  if (parts.length <= maxVisible) {
    return parts.map((p, i) => ({
      type: "crumb" as const,
      part: p,
      index: i,
    }));
  }

  const start = parts[0];
  const hidden = parts.slice(1, parts.length - keepEnd);
  const end = parts.slice(-keepEnd);

  return [
    { type: "crumb" as const, part: start, index: 0 },
    {
      type: "dropdown" as const,
      items: hidden.map((p, i) => ({
        part: p,
        index: i + 1,
      })),
    },
    ...end.map((p, i) => ({
      type: "crumb" as const,
      part: p,
      index: parts.length - keepEnd + i,
    })),
  ];
}

export function Breadcrumb(opts: {
  path: string;
  class?: string;
  onSegmentClick?: (segment: string, fullPath: string) => void;
  maxVisible?: number;
  keepEnd?: number;
}) {
  function render(path: string) {
    const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);

    const visible = collapseParts(
      parts,
      opts.keepEnd ?? 2,
      opts.maxVisible ?? 5,
    );

    const el = h("div", {
      class: cn("flex items-center gap-0.5 text-[13px] min-w-0", opts.class),
    });

    visible.forEach((item, i) => {
      const isLast = i === visible.length - 1;

      if (item.type === "dropdown") {
        const dropdown = Dropdown({
          items: item.items.map((it) => ({
            label: it.part,
            onClick: () => {
              const fullPath = "/" + parts.slice(0, it.index + 1).join("/");
              opts.onSegmentClick?.(it.part, fullPath);
            },
            tooltip: parts.slice(0, it.index + 1).join("/"),
          })),
          anchorClass: "mx-0.5",
          placement: "top",
        });

        el.appendChild(dropdown.el);
      } else {
        const fullPath = "/" + parts.slice(0, item.index + 1).join("/");

        const segment = h(
          "span",
          {
            class: cn(
              "truncate shrink-0 max-w-[160px] px-1.5 h-full items-center cursor-pointer rounded-[7px] select-none whitespace-nowrap hover:text-workbench-foreground transition-colors hover:bg-statusbar-item-hover-background",
              "text-muted-foreground",
            ),
            on:
              !isLast && opts.onSegmentClick
                ? {
                    click: () => opts.onSegmentClick!(item.part, fullPath),
                  }
                : undefined,
            tooltip: {
              text: parts.slice(0, item.index + 1).join("/"),
            },
          },
          item.part,
        );

        el.appendChild(segment);
      }

      if (!isLast) {
        el.appendChild(
          h(
            "span",
            { class: "shrink-0 [&_svg]:w-4.5 [&_svg]:h-4.5" },
            lucide("chevron-right"),
          ),
        );
      }
    });

    return el;
  }

  let el = render(opts.path);

  return {
    el,
    setPath(path: string) {
      const next = render(path);
      el.replaceWith(next);
      el = next;
    },
  };
}
