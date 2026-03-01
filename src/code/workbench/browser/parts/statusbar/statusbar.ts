import { explorer } from "../../../../platform/explorer/explorer.service";
import { store } from "../../../common/state/store";
import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { Breadcrumb } from "../components/breadcrumb";

export function Statusbar() {
  const left = h("div", { class: "flex items-center min-w-0" });

  store.subscribe(async () => {
    const { tabs } = store.getState().editor;

    const active = tabs.find((t) => t.active);
    if (!active) {
      const tree = explorer.tree.structure;
      if (!tree) return;

      left.textContent = tree.root.name;

      return;
    }

    const tree = explorer.tree.structure;
    if (!tree) {
      left.textContent = active.name;
    } else {
      left.innerHTML = "";
      const relative = await window.files.relative(tree.path, active.file_path);

      const crumb = Breadcrumb({ path: relative });
      left.appendChild(crumb.el);
    }
  });

  const right = h("div", {
    class: "mr-30 no-drag flex items-center justify-center gap-1 min-w-0",
  });

  const el = h(
    "div",
    {
      class: cn(
        "h-[28px] text-[13px] text-statusbar-foreground w-full flex items-center justify-between px-2",
        "bg-statusbar-background",
        "drag-region",
      ),
    },
    left,
    right,
  );

  return el;
}
