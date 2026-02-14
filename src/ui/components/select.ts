import { cn } from "../../core/utils/cn";
import { h } from "../../core/dom/h";
import { codicon, lucide } from "./icon";

type SelectItem = { value: string; label: string };

export function Select(opts: {
  items: SelectItem[];
  value?: string;
  placeholder?: string;
  class?: string;
  menuClass?: string;
  onChange?: (value: string) => void;
}) {
  let open = false;
  let activeIndex = 0;
  let currentValue = opts.value ?? "";

  const labelFor = (v: string) =>
    opts.items.find((i) => i.value === v)?.label ?? "";

  const textSpan = h(
    "span",
    { class: cn("truncate", currentValue ? "" : "text-foreground/60") },
    currentValue ? labelFor(currentValue) : (opts.placeholder ?? "Select"),
  );

  const btn = h(
    "button",
    {
      class: cn(
        "h-8 px-2.5 text-[13px] w-full flex items-center justify-between rounded-[7px] cursor-pointer py-4 text-[13px] transition-colors " +
          "border border-select-border border-2 bg-select-background text-select-foreground hover:bg-select-hover-background " +
          "focus:outline-none focus:ring-1.5 focus:ring-select-border",
        opts.class,
      ),
      attrs: { type: "button" },
    },
    textSpan,
    h(
      "span",
      { class: "flex items-center text-foreground/60" },
      lucide("chevron-down"),
    ),
  );

  const menu = h("div", {
    class: cn(
      "fixed z-[9999] hidden min-w-[180px] max-h-[260px] overflow-auto " +
        "bg-select-menu-background text-select-option-foreground border border-workbench-border border-2 rounded-[7px] p-1",
      opts.menuClass,
    ),
  });

  document.body.appendChild(menu);

  const position = () => {
    const r = btn.getBoundingClientRect();
    menu.style.left = `${r.left}px`;
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.minWidth = `${r.width}px`;
  };

  const setValue = (v: string) => {
    currentValue = v;
    textSpan.textContent = labelFor(v);
    textSpan.className = "truncate";
    opts.onChange?.(v);
  };

  const renderMenu = () => {
    menu.innerHTML = "";
    const idx = Math.max(
      0,
      opts.items.findIndex((i) => i.value === currentValue),
    );
    activeIndex = idx === -1 ? 0 : idx;

    opts.items.forEach((item, i) => {
      menu.appendChild(
        h(
          "div",
          {
            class: cn(
              "px-2 py-1.5 text-[14px] cursor-pointer select-none rounded-[7px]",
              i === activeIndex
                ? "bg-select-option-active-background text-select-option-foreground"
                : "hover:bg-select-option-hover-background text-select-option-foreground",
            ),
            on: {
              mouseenter: () => {
                activeIndex = i;
                renderMenu();
              },
              mousedown: (e) => {
                e.preventDefault();
                setValue(item.value);
                close();
              },
            },
          },
          item.label,
        ),
      );
    });
  };

  const onOutside = (e: MouseEvent) => {
    const t = e.target as Node | null;
    if (!t) return;
    if (btn.contains(t) || menu.contains(t)) return;
    close();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      btn.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(opts.items.length - 1, activeIndex + 1);
      renderMenu();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      renderMenu();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const item = opts.items[activeIndex];
      if (item) {
        setValue(item.value);
        close();
        btn.focus();
      }
    }
  };

  const openMenu = () => {
    if (open) return;
    open = true;
    renderMenu();
    position();
    menu.style.display = "block";
    window.addEventListener("mousedown", onOutside, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", position, true);
  };

  const close = () => {
    if (!open) return;
    open = false;
    menu.style.display = "none";
    window.removeEventListener("mousedown", onOutside, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position, true);
  };

  btn.addEventListener("click", () => (open ? close() : openMenu()));

  const el = h("div", { class: "inline-flex w-full" }, btn);

  return {
    el,
    get value() {
      return currentValue;
    },
    setValue,
    open: openMenu,
    close,
    destroy() {
      close();
      btn.replaceWith(btn.cloneNode(true));
      menu.remove();
    },
  };
}
