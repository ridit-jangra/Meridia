import { h } from "../../../contrib/core/dom/h";
import { cn } from "../../../contrib/core/utils/cn";
import { ScrollArea } from "./scroll-area";

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
};

type CommandListProps = {
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
  placeholder?: string;
};

export function CommandList(props: CommandListProps) {
  let open = false;
  let active = 0;
  let query = "";

  const modal = h("div", {
    class: cn(
      "fixed z-[9999] hidden",
      "left-1/2 top-[5%] -translate-x-1/2",
      "w-[560px] max-w-[calc(100vw-24px)] p-1.5 px-1",
      "bg-command-background text-command-item-foreground",
      "border border-workbench-border rounded-xl overflow-hidden",
      "shadow-lg",
    ),
  });

  const input = h("input", {
    class: cn(
      "w-full px-3 py-2 text-sm outline-none bg-transparent",
      "border-b border-workbench-border",
    ),
    placeholder: props.placeholder ?? "Search…",
    on: {
      input: (e: Event) => {
        query = (e.target as HTMLInputElement).value;
        active = 0;
        renderList();
      },
    },
  });

  const list = ScrollArea({ class: "max-h-[360px] overflow-auto" }).viewport;

  modal.appendChild(input);
  modal.appendChild(list);
  document.body.appendChild(modal);

  const getFilteredItems = () => {
    if (!query) return props.items;

    const q = query.toLowerCase();
    return props.items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q),
    );
  };

  const renderList = (scrollIntoView = false) => {
    const items = getFilteredItems();
    list.innerHTML = "";

    if (items.length === 0) {
      list.appendChild(
        h(
          "div",
          { class: "px-3 py-2 text-[13px] text-foreground/60" },
          "No results",
        ),
      );
      return;
    }

    items.forEach((item, i) => {
      const isActive = i === active;

      const row = h(
        "div",
        {
          class: cn(
            "px-3 py-1 cursor-pointer select-none",
            "flex flex-col gap-0.5 rounded-lg mx-1 my-0.5",
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
              selectItem(item);
            },
          },
        },
        h("div", { class: "text-[13px] font-medium truncate" }, item.label),
        item.description
          ? h(
              "div",
              { class: "text-[11px] text-command-item-foreground/60 truncate" },
              item.description,
            )
          : null,
      );

      list.appendChild(row);

      if (isActive && scrollIntoView) {
        requestAnimationFrame(() => {
          row.scrollIntoView({ block: "nearest" });
        });
      }
    });
  };

  const selectItem = (item: CommandItem) => {
    close();
    props.onSelect(item);
  };

  const openUI = () => {
    if (open) return;
    open = true;

    modal.style.display = "block";
    input.value = "";
    query = "";
    active = 0;
    renderList();

    queueMicrotask(() => {
      input.focus();
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("mousedown", onDocumentClick);
    });
  };

  const close = () => {
    if (!open) return;
    open = false;
    modal.style.display = "none";
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("mousedown", onDocumentClick);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;

    const items = getFilteredItems();

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, items.length - 1);
      renderList(true);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      renderList(true);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) {
        selectItem(items[active]);
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
      document.removeEventListener("mousedown", onDocumentClick);
      modal.remove();
    },
  };
}
