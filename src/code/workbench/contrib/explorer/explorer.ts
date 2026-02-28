import { explorer_events } from "../../../platform/events/explorer.events";
import { explorer } from "../../../platform/explorer/explorer.service";
import { Button } from "../../browser/parts/components/button";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";

export function Explorer() {
  const el = h("div", {
    class: cn("h-full w-full relative overflow-hidden", ""),
  });

  const loading = h("div", {
    class:
      "absolute top-0 left-0 right-0 h-[2px] z-10 pointer-events-none bg-transparent overflow-hidden",
  });

  const loadingBar = h("div", {
    class: "h-full w-[35%] bg-loader-foreground animate-loading",
  });

  loading.appendChild(loadingBar);
  el.appendChild(loading);

  const content = h("div", { class: "h-full w-full pt-[2px]" });
  el.appendChild(content);

  explorer_events.on("start-loading", (timeout?: number, delay?: number) => {
    if (delay)
      setTimeout(() => {
        loading.style.display = "block";
      }, delay);
    else loading.style.display = "block";

    if (timeout)
      setTimeout(() => {
        loading.style.display = "none";
      }, timeout);
  });

  explorer_events.on("stop-loading", (delay?: number) => {
    if (delay)
      setTimeout(() => {
        loading.style.display = "none";
      }, delay);
    else loading.style.display = "none";
  });

  explorer_events.on("start-ui", () => {
    loading.style.display = "none";

    const structure = explorer.tree.structure;

    if (structure && structure.path) {
      const tree = explorer.tree.tree;
      if (tree) content.appendChild(tree.el);
    } else {
      const not_selected = h(
        "div",
        {
          class:
            "flex flex-col items-center justify-between w-full h-full px-4 flex-1",
        },
        h(
          "span",
          { class: "mt-4 w-full min-w-0 truncate text-center" },
          "No Folder Selected.",
        ),
        h(
          "div",
          { class: "flex flex-col items-center gap-1.5 w-full" },
          Button("Select folder", {
            variant: "default",
            class: "w-full",
            onClick: () => {
              window.workspace.ask_update_workspace();
            },
          }),
          Button("Copy repo", { variant: "secondary", class: "w-full" }),
        ),
        h("div", { class: "bg-transparent" }),
      );

      content.appendChild(not_selected);
    }
  });

  return el;
}
