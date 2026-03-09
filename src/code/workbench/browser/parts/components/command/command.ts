import { h } from "../../../../contrib/core/dom/h";
import { cn } from "../../../../contrib/core/utils/cn";

import { shortcut_def } from "../../../../../../types/shortcut.types";
import { ScrollArea } from "../scroll-area";
import { shortcuts } from "../../../../common/shortcut/shortcut.service";
import { lucide } from "../icon";
import { GLASS } from "../../../../contrib/styles/glass";
import gsap from "gsap";

export interface CommandGroup {
  id: string;
  name: string;
  prefix: string;
  items: shortcut_def[];
}

type GroupRow = { kind: "group"; group: CommandGroup; score: number };
type ItemRow = {
  kind: "item";
  it: shortcut_def;
  group: CommandGroup;
  score: number;
};

export function Command(opts: {
  groups: CommandGroup[];
  defaultGroup?: string;
  placeholder?: string;
  open?: boolean;
  class?: string;
  onOpenChange?: (open: boolean) => void;
  onRun?: (id: string) => void;
}) {
  let open = opts.open ?? false;
  let active = 0;
  let query = "";
  let activeGroup: CommandGroup | null = null;
  let listVisible = false;

  const modal = h("div", {
    class: cn(
      "fixed z-[9999] hidden",
      "left-1/2 top-[15%] -translate-x-1/2",
      "w-[860px] max-w-[calc(100vw-24px)] p-2",
      "text-command-item-foreground",
      "rounded-4xl overflow-hidden",
      "animate-in zoom-in-95 fade-in duration-150",
      GLASS,
      opts.class,
    ),
  });

  const input = h("input", {
    class:
      "border-none bg-transparent text-[1.6rem] opacity-70 font-bold w-full h-full focus:outline-none",
    attrs: {
      placeholder: "Search anything.",
    },
  });

  input.oninput = () => {
    const val = input.value.trim();

    let matchedGroup: CommandGroup | null = null;
    for (const group of opts.groups) {
      if (val.startsWith(group.prefix)) {
        matchedGroup = group;
        query = val.slice(group.prefix.length).toLowerCase();
        break;
      }
    }

    activeGroup = matchedGroup;
    query = matchedGroup ? query : val.toLowerCase();
    active = 0;
    renderList();
    updateListVisibility();
  };

  input.onkeydown = (e) => {
    onInputKey(e);
  };

  const input_wrapper = h(
    "div",
    { class: "flex items-center gap-2 p-2" },
    h("span", { class: "opacity-70" }, lucide("search", 20)),
    input,
  );

  const list = ScrollArea({ class: "max-h-[360px] overflow-auto" }).viewport;
  // Start hidden, we'll use GSAP to animate it
  list.style.display = "none";
  list.style.overflow = "hidden";

  const divider = h("div", {
    class: "border-t border-white/10 mx-1 mt-3 mb-1",
  });
  divider.style.display = "none";
  divider.style.opacity = "0";

  modal.appendChild(input_wrapper);
  modal.appendChild(divider);
  modal.appendChild(list);

  document.body.appendChild(modal);

  const showList = () => {
    if (listVisible) return;
    listVisible = true;

    // Make elements visible before animating
    list.style.display = "block";
    divider.style.display = "block";

    // Kill any running tweens on these elements
    gsap.killTweensOf([list, divider]);

    // Animate divider fade in
    gsap.fromTo(
      divider,
      { opacity: 0 },
      { opacity: 1, duration: 0.1, ease: "expo.out" },
    );

    // Animate list slide down + fade in
    gsap.fromTo(
      list,
      { height: 0, opacity: 0, y: -4 },
      {
        height: "auto",
        opacity: 1,
        y: 0,
        duration: 0.14,
        ease: "expo.out",
      },
    );
  };

  const hideList = () => {
    if (!listVisible) return;
    listVisible = false;

    gsap.killTweensOf([list, divider]);

    gsap.to(divider, { opacity: 0, duration: 0.09, ease: "expo.in" });

    gsap.to(list, {
      height: 0,
      opacity: 0,
      y: -4,
      duration: 0.12,
      ease: "expo.in",
      onComplete: () => {
        list.style.display = "none";
        divider.style.display = "none";
      },
    });
  };

  const updateListVisibility = () => {
    const hasInput = input.value.trim().length > 0;
    if (hasInput) showList();
    else hideList();
  };

  const isVisible = () => true;

  const score = (label: string, q: string) => {
    if (!q) return 1;
    const s = label.toLowerCase();
    if (s.startsWith(q)) return 100;
    if (s.includes(q)) return 50;
    let i = 0;
    for (const ch of q) {
      i = s.indexOf(ch, i);
      if (i === -1) return 0;
      i++;
    }
    return 10;
  };

  const flatten = (): { it: shortcut_def; group: CommandGroup }[] => {
    const out: { it: shortcut_def; group: CommandGroup }[] = [];
    for (const g of opts.groups) {
      for (const it of g.items) out.push({ it, group: g });
    }
    return out;
  };

  const filtered = (): (GroupRow | ItemRow)[] => {
    const q = query;

    if (!activeGroup) {
      if (!q) {
        return opts.groups
          .map((group) => ({
            kind: "group" as const,
            group,
            score: Math.max(score(group.name, q), score(group.prefix, q)),
          }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
      }

      return flatten()
        .filter(() => isVisible())
        .map(({ it, group }) => {
          const label = it.label ?? it.id;
          const extra = `${group.name} ${group.prefix} ${it.id} ${it.command ?? ""} ${it.category ?? ""}`;
          return {
            kind: "item" as const,
            it,
            group,
            score: Math.max(score(label, q), score(extra, q)),
          };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    return activeGroup.items
      .filter(isVisible)
      .map((it) => ({
        kind: "item" as const,
        it,
        group: activeGroup!,
        score: score(it.label ?? it.id, q),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  };

  const run = (it: shortcut_def) => {
    close();
    if (it.command) shortcuts.run_shortcut(it.command);
    opts.onRun?.(it.id);
  };

  const selectGroup = (group: CommandGroup) => {
    input.value = group.prefix;
    activeGroup = group;
    query = "";
    active = 0;
    renderList();
    updateListVisibility();
  };

  const setActive = (idx: number, shouldScroll = false) => {
    const items = filtered();
    if (items.length === 0) {
      active = 0;
      return;
    }
    active = Math.max(0, Math.min(items.length - 1, idx));
    renderList(shouldScroll);
  };

  const renderList = (scrollIntoView?: boolean) => {
    const items = filtered();
    list.innerHTML = "";

    if (items.length === 0) {
      list.appendChild(
        h(
          "div",
          { class: "px-3 py-3 text-[15px] text-foreground/40" },
          "No results",
        ),
      );
      return;
    }

    items.forEach((item, i) => {
      if (item.kind === "group") {
        const row = h(
          "div",
          {
            class: cn(
              "p-3 cursor-pointer select-none",
              "flex items-center justify-between gap-3",
              "rounded-full mx-1 my-1 hover:bg-command-item-hover-background hover:text-command-item-hover-foreground",
              i === active &&
                "bg-command-item-active-background text-command-item-active-foreground",
            ),
            on: {
              mouseenter: () => {},
              mousedown: (e: Event) => {
                e.preventDefault();
                selectGroup(item.group);
              },
            },
          },
          h(
            "div",
            { class: "min-w-0 flex items-center gap-2" },
            h("div", { class: "text-[16px] truncate" }, item.group.name),
          ),
          h(
            "div",
            {
              class: "shrink-0 flex items-center gap-1 opacity-70 text-[12px]",
            },
            h(
              "span",
              {
                class:
                  "px-1.5 py-px bg-command-item-foreground/5 rounded-full border border-workbench-border",
              },
              item.group.prefix,
            ),
          ),
        );

        list.appendChild(row);

        if (i === active && scrollIntoView) {
          requestAnimationFrame(() => row.scrollIntoView({ block: "nearest" }));
        }
        return;
      }

      const it = item.it;
      const group = item.group;

      const row = h(
        "div",
        {
          class: cn(
            "p-3 cursor-pointer select-none",
            "flex items-center justify-between gap-3",
            "rounded-full px-3 mx-1 my-1 hover:bg-command-item-hover-background hover:text-command-item-hover-foreground",
            i === active &&
              "bg-command-item-active-background text-command-item-active-foreground",
          ),
          on: {
            mouseenter: () => {},
            mousedown: (e: Event) => {
              e.preventDefault();
              run(it);
            },
          },
        },
        h(
          "div",
          { class: "min-w-0 flex gap-2 items-center" },
          h("div", { class: "text-[16px] truncate" }, it.label ?? it.id),
          !activeGroup
            ? h("div", { class: "text-[11px] opacity-60 truncate" }, group.name)
            : null,
        ),
        h(
          "div",
          {
            class: "shrink-0 flex items-center gap-1.5 opacity-70 text-[12px]",
          },
          ...(it.keys
            ? (it.keys as string)
                .split("+")
                .map((key: string, index: number, arr: string[]) =>
                  h(
                    "div",
                    { class: "flex items-center gap-1.5" },
                    h(
                      "span",
                      {
                        class:
                          "px-1.5 py-px bg-command-item-foreground/5 rounded-md border border-workbench-border",
                      },
                      key[0].toUpperCase() + key.slice(1),
                    ),
                    index !== arr.length - 1
                      ? h("span", { class: "text-[12px]" }, "+")
                      : null,
                  ),
                )
            : []),
        ),
      );

      list.appendChild(row);

      if (i === active && scrollIntoView) {
        requestAnimationFrame(() => row.scrollIntoView({ block: "nearest" }));
      }
    });
  };

  const openUI = () => {
    if (open) return;
    open = true;
    modal.style.display = "block";
    input.value = "";
    query = "";
    activeGroup = null;
    active = 0;
    listVisible = false;
    list.style.display = "none";
    divider.style.display = "none";
    divider.style.opacity = "0";

    if (opts.defaultGroup) {
      const defaultGroup = opts.groups.find((g) => g.id === opts.defaultGroup);
      if (defaultGroup) {
        selectGroup(defaultGroup);
      }
    } else {
      renderList();
    }

    queueMicrotask(() => {
      input.focus();
      document.addEventListener("mousedown", onDocumentClick);
    });
    requestAnimationFrame(() => {
      input.focus();
    });
    opts.onOpenChange?.(true);

    setTimeout(() => {
      input.focus();
    }, 200);
  };

  const close = () => {
    if (!open) return;
    open = false;
    modal.style.display = "none";
    document.removeEventListener("mousedown", onDocumentClick);
    opts.onOpenChange?.(false);
  };

  const onInputKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();

      if (activeGroup) {
        input.value = "";
        activeGroup = null;
        query = "";
        active = 0;
        renderList();
        updateListVisibility();
        return;
      }

      close();
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
      const items = filtered();
      const item = items[active];
      if (!item) return;

      if (item.kind === "group") {
        selectGroup(item.group);
        return;
      }

      run(item.it);
    }
  };

  const onDocumentClick = (e: MouseEvent) => {
    if (!modal.contains(e.target as Node)) close();
  };

  return {
    el: modal,
    open: openUI,
    close,
    toggle() {
      if (open) close();
      else openUI();
    },
    is_open() {
      return open;
    },
    setGroups(next: CommandGroup[]) {
      opts.groups = next;
      if (open) renderList();
    },
    setGroup(groupId: string) {
      const group = opts.groups.find((g) => g.id === groupId);
      if (group) {
        selectGroup(group);
        if (open) queueMicrotask(() => input.focus());
      }
    },
    destroy() {
      document.removeEventListener("mousedown", onDocumentClick);
      modal.remove();
    },
  };
}
