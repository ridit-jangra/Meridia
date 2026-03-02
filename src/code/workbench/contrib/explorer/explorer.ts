import { explorer_events } from "../../../platform/events/explorer.events";
import { explorer } from "../../../platform/explorer/explorer.service";
import { Button } from "../../browser/parts/components/button";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";

const LoadingBar = () => {
  const el = h("div", {
    class:
      "absolute top-0 left-0 right-0 h-[2px] z-10 pointer-events-none overflow-hidden",
    style: "display:none",
  });

  el.appendChild(
    h("div", { class: "h-full w-[35%] bg-loader-foreground animate-loading" }),
  );

  explorer_events.on("start-loading", (timeout?: number, delay?: number) => {
    const show = () => (el.style.display = "block");
    const hide = () => (el.style.display = "none");

    delay ? setTimeout(show, delay) : show();
    if (timeout) setTimeout(hide, timeout);
  });

  explorer_events.on("stop-loading", (delay?: number) =>
    delay
      ? setTimeout(() => (el.style.display = "none"), delay)
      : (el.style.display = "none"),
  );

  return el;
};

const EmptyState = () =>
  h(
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
        onClick: () => window.workspace.ask_update_workspace(),
      }),
      Button("Copy repo", { variant: "secondary", class: "w-full" }),
    ),
    h("div", {}),
  );

export function Explorer() {
  const { structure, tree } = explorer.tree;
  const hasTree = structure?.path && tree;

  const content = h("div", { class: "h-full w-full pt-[2px]" });
  content.appendChild(hasTree ? tree.el : EmptyState());

  const el = h("div", { class: cn("h-full w-full relative overflow-hidden") });
  el.append(LoadingBar(), content);

  return el;
}
