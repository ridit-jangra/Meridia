import { git_events } from "../../../platform/events/git.events";
import { Button } from "../../browser/parts/components/button";
import { lucide } from "../../browser/parts/components/icon";
import { Input } from "../../browser/parts/components/input";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";
import { initRepo, isRepo } from "./utils";

const LoadingBar = () => {
  const el = h("div", {
    class:
      "absolute top-0 left-0 right-0 h-[2px] z-10 pointer-events-none overflow-hidden",
    style: "display:none",
  });

  el.appendChild(
    h("div", { class: "h-full w-[35%] bg-loader-foreground animate-loading" }),
  );

  git_events.on("start-loading", (timeout?: number, delay?: number) => {
    const show = () => (el.style.display = "block");
    const hide = () => (el.style.display = "none");

    delay ? setTimeout(show, delay) : show();
    if (timeout) setTimeout(hide, timeout);
  });

  git_events.on("stop-loading", (delay?: number) =>
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
      "Not a git repository.",
    ),
    h(
      "div",
      { class: "flex flex-col items-center gap-1.5 w-full" },
      Button("Init repository", {
        variant: "default",
        class: "w-full",
        onClick: async () => await initRepo(),
      }),
    ),
    h("div", {}),
  );

const RepoState = () =>
  h(
    "div",
    {
      class:
        "flex flex-col items-center justify-between w-full h-full px-4 flex-1",
    },
    h(
      "div",
      {
        class: "mt-4 w-full min-w-0 truncate text-center flex flex-col gap-4",
      },
      Input({ placeholder: "Message", type: "text" }).el,
      Button(
        h(
          "span",
          {
            class: "flex items-center gap-1",
            tooltip: {
              text: "Commit changes",
            },
          },
          lucide("check"),
          "Commit",
        ),
      ),
    ),
  );

export async function Git() {
  const content = h("div", { class: "h-full w-full pt-[2px]" });
  content.appendChild((await isRepo()) ? RepoState() : EmptyState());

  const el = h("div", { class: cn("h-full w-full relative overflow-hidden") });
  el.append(LoadingBar(), content);

  git_events.on("initUi", async () => {
    content.innerHTML = "";

    content.appendChild((await isRepo()) ? RepoState() : EmptyState());
  });

  return el;
}
