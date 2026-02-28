import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { ITab } from "../../../../../types/editor.types";

import { ScrollArea } from "./scroll-area";
import { get_file_icon } from "../../../../platform/explorer/explorer.helper";
import { open_editor_tab } from "../../../../editor/editor.helper";

export function TabSwitcher() {
  let open = false;
  let active = 0;
  let tabs: ITab[] = [];

  const modal = h("div", {
    class: cn(
      "fixed z-[9999] hidden",
      "left-1/2 top-[5%] -translate-x-1/2",
      "w-[560px] max-w-[calc(100vw-24px)] p-1.5 px-0.5",
      "bg-command-background text-command-item-foreground",
      "border border-workbench-border rounded-xl overflow-hidden",
      "shadow-lg",
    ),
  });

  const list = ScrollArea({ class: "max-h-[360px] overflow-auto" }).viewport;
  modal.appendChild(list);
  document.body.appendChild(modal);

  const setActive = (idx: number, shouldScroll = false) => {
    if (tabs.length === 0) {
      active = 0;
      return;
    }

    if (idx >= tabs.length) {
      active = 0;
    } else if (idx < 0) {
      active = tabs.length - 1;
    } else {
      active = idx;
    }
    renderList(shouldScroll);
  };

  const renderList = (scrollIntoView?: boolean) => {
    list.innerHTML = "";

    if (tabs.length === 0) {
      list.appendChild(
        h(
          "div",
          { class: "px-3 py-1 text-[13px] text-foreground/60" },
          "No tabs open",
        ),
      );
      return;
    }

    tabs.forEach((tab, i) => {
      const isActive = i === active;

      const icon = h("img", {
        class: "w-4 h-4 mt-px",
      });
      icon.src = `./file-icons/${get_file_icon(tab.file_path)}`;

      const row = h(
        "div",
        {
          class: cn(
            "px-3 py-1 cursor-pointer select-none",
            "flex items-center justify-between gap-3",
            "rounded-lg mx-1 my-0.5",
            isActive
              ? "bg-command-item-active-background text-command-item-active-foreground"
              : "hover:bg-command-item-hover-background hover:text-command-item-hover-foreground",
          ),
          on: {
            mouseenter: () => {
              active = i;
              renderList();
            },
            mousedown: (e: Event) => {
              e.preventDefault();
              selectTab(tab);
            },
          },
        },
        h(
          "div",
          { class: "min-w-0 flex gap-3 items-center" },
          h(
            "div",
            { class: "flex gap-2 items-center" },
            icon,
            h("div", { class: "text-[13px] truncate font-medium" }, tab.name),
          ),

          h(
            "div",
            { class: "text-[11px] truncate text-command-item-foreground/50" },
            tab.file_path,
          ),
        ),
      );

      list.appendChild(row);

      if (i === active && scrollIntoView) {
        requestAnimationFrame(() => {
          row.scrollIntoView({ block: "nearest" });
        });
      }
    });
  };

  const selectTab = (tab: ITab) => {
    close();
    open_editor_tab(tab.file_path);
  };

  const openUI = (currentTabs: ITab[], initialOffset: number = 0) => {
    if (open) return;
    open = true;
    tabs = currentTabs;

    const activeTabIndex = tabs.findIndex((t) => t.active);
    if (activeTabIndex !== -1) {
      let newIndex = activeTabIndex + initialOffset;
      if (newIndex >= tabs.length) {
        newIndex = newIndex % tabs.length;
      } else if (newIndex < 0) {
        newIndex = tabs.length + (newIndex % tabs.length);
      }
      active = newIndex;
    } else {
      active = 0;
    }

    modal.style.display = "block";
    renderList();

    queueMicrotask(() => {
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("keyup", onKeyUp, true);
      document.addEventListener("mousedown", onDocumentClick);
    });
  };

  const close = () => {
    if (!open) return;
    open = false;
    modal.style.display = "none";
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    document.removeEventListener("mousedown", onDocumentClick);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (e.ctrlKey && e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      setActive(active + 1, true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active + 1, true);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active - 1, true);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (tabs[active]) {
        selectTab(tabs[active]);
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!open) return;

    if (e.key === "Control") {
      if (tabs[active]) {
        selectTab(tabs[active]);
      }
    }
  };

  const onDocumentClick = (e: MouseEvent) => {
    if (!modal.contains(e.target as Node)) {
      close();
    }
  };

  return {
    el: modal,
    open: openUI,
    close,
    is_open() {
      return open;
    },
    destroy() {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("mousedown", onDocumentClick);
      modal.remove();
    },
  };
}
