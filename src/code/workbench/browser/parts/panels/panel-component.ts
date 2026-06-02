import { h } from "../../../contrib/core/dom/h";
import { panels_registry } from "../../../contrib/core/registry";

type ViewFactory = () => HTMLElement | Promise<HTMLElement>;

export function PanelComponent(opts: { id: string }) {
  const container = h("div", {
    class: "w-full h-full bg-panel-background text-panel-foreground",
  });

  const panel = (panels_registry as Record<string, ViewFactory | undefined>)[
    opts.id
  ];

  if (panel) {
    const result = panel();
    if (result instanceof Promise) {
      result.then((el) => container.appendChild(el));
    } else {
      container.appendChild(result);
    }
  } else {
    container.appendChild(
      h(
        "div",
        { class: "p-2 text-muted-foreground" },
        `Panel not found: ${opts.id}`,
      ),
    );
  }

  return container;
}
