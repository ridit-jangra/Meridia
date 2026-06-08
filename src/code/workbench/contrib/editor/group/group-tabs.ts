import { ITab } from "../../../../../types/editor.types";
import { get_file_icon } from "../../../../platform/explorer/explorer.helper";
import { ScrollArea } from "../../../browser/parts/components/scroll-area";
import { codicon, lucide } from "../../../browser/parts/components/icon";
import { store } from "../../../common/state/store";
import {
  close_group,
  move_tab_to_group,
  set_active_group,
  set_group_tabs,
  split_group,
} from "../../../common/state/slices/editor.slice";
import { h } from "../../core/dom/h";
import { cn } from "../../core/utils/cn";
import {
  TAB_DND_MIME,
  begin_tab_drag,
  current_tab_drag,
  end_tab_drag,
} from "./dnd";
import { Button } from "../../../browser/parts/components/button";

function group_tabs(group_id: string): ITab[] {
  return (
    store.getState().editor.groups.find((g) => g.id === group_id)?.tabs ?? []
  );
}

function activate_tab(group_id: string, file_path: string): void {
  const tabs = group_tabs(group_id).map((t) => ({
    ...t,
    active: t.file_path === file_path,
  }));
  store.dispatch(set_group_tabs({ group_id, tabs }));
  store.dispatch(set_active_group(group_id));
}

function close_tab(group_id: string, file_path: string): void {
  const tabs = group_tabs(group_id);
  const idx = tabs.findIndex((t) => t.file_path === file_path);
  if (idx === -1) return;

  const tab = tabs[idx];
  if (
    tab.is_touched &&
    !confirm("Are you sure you want to close this tab without saving?")
  )
    return;

  const next = tabs.filter((_, i) => i !== idx);

  if (next.length === 0) {
    if (store.getState().editor.groups.length > 1)
      store.dispatch(close_group(group_id));
    else store.dispatch(set_group_tabs({ group_id, tabs: [] }));
    return;
  }

  const next_active = tab.active ? Math.max(0, idx - 1) : -1;
  store.dispatch(
    set_group_tabs({
      group_id,
      tabs: next.map((t, i) => ({
        ...t,
        active: next_active === -1 ? t.active : i === next_active,
      })),
    }),
  );
}

function reorder(group_id: string, from: string, to: string): void {
  const tabs = group_tabs(group_id);
  const from_idx = tabs.findIndex((t) => t.file_path === from);
  const to_idx = tabs.findIndex((t) => t.file_path === to);
  if (from_idx === -1 || to_idx === -1 || from_idx === to_idx) return;
  const next = [...tabs];
  const [moved] = next.splice(from_idx, 1);
  next.splice(to_idx, 0, moved);
  store.dispatch(set_group_tabs({ group_id, tabs: next }));
}

export function GroupTabs(group_id: string) {
  const scroll = ScrollArea({
    dir: "horizontal",
    innerClass: "flex items-center w-max",
  });

  const split_btn = Button(codicon("split-horizontal"), {
    size: "sm",
    onClick: () => {
      const active = group_tabs(group_id).find((t) => t.active);
      store.dispatch(
        split_group({
          source_group_id: group_id,
          side: "right",
          tab: active,
        }),
      );
    },
    tooltip: {
      text: "Split Editor Right",
      position: "bottom",
    },
    variant: "ghost",
  });

  const header = h(
    "div",
    {
      class:
        "editor-tabs-host flex items-center justify-between shrink-0 border-b border-workbench-border bg-editor-tab-background",
    },
    scroll.el,
    h("div", { class: "flex items-center gap-1 px-1.5 shrink-0" }, split_btn),
  );

  const container = scroll.inner;
  const tab_els = new Map<string, HTMLElement>();
  let drag_over: string | null = null;

  const clear_indicators = () => {
    tab_els.forEach((el) => {
      el.style.borderLeft = "";
      el.style.borderRight = "";
    });
  };

  const render_tab = (tab: ITab, el?: HTMLElement): HTMLElement => {
    if (!el) {
      const icon =
        tab.tab_type === "SETTINGS"
          ? h(
              "span",
              {
                class:
                  "mt-px flex items-center text-editor-tab-icon-foreground [&_svg]:w-[17px] [&_svg]:h-[17px]",
              },
              tab.tab_type === "SETTINGS" ? codicon("gear") : lucide("globe"),
            )
          : (h("img", {
              attrs: { "data-role": "icon" },
              class: "w-5 h-5 mt-px",
            }) as HTMLImageElement);

      const dirty = h(
        "span",
        {
          attrs: { "data-role": "dirty" },
          class: "absolute inset-0 flex items-center justify-center opacity-0",
        },
        h("span", {
          class: "w-[9px] h-[9px] rounded-full bg-editor-tab-icon-foreground",
        }),
      );

      const close = h(
        "span",
        {
          attrs: { "data-role": "close" },
          class:
            "absolute inset-0 flex items-center justify-center rounded [&_svg]:w-5 [&_svg]:h-5 text-editor-tab-close-foreground",
        },
        lucide("x"),
      );

      const end = h(
        "div",
        { class: "relative shrink-0 w-6 h-6 flex items-center justify-center" },
        dirty,
        close,
      );

      const title = h(
        "div",
        { class: "flex items-center gap-1.5" },
        icon,
        h("span", { attrs: { "data-role": "name" } }, tab.name),
      );

      el = h("div", {
        class: "group relative",
        on: {
          click: (e: MouseEvent) => {
            if (e.button !== 0) return;
            const fp = (el as HTMLElement).dataset.path;
            if (fp) activate_tab(group_id, fp);
          },
          mousedown: (e: MouseEvent) => {
            if (e.button === 1) e.preventDefault();
          },
          auxclick: (e: MouseEvent) => {
            if (e.button !== 1) return;
            e.preventDefault();
            const fp = (el as HTMLElement).dataset.path;
            if (fp) close_tab(group_id, fp);
          },
        },
        tooltip: { text: tab.file_path, position: "bottom", delay: 200 },
      });

      close.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fp = (el as HTMLElement).dataset.path;
        if (fp) close_tab(group_id, fp);
      });

      el.appendChild(title);
      el.appendChild(end);
      bind_drag(el, tab.file_path);
    }

    el.dataset.path = tab.file_path;
    el.className = cn(
      "editor-tab group relative px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
      tab.active
        ? "bg-editor-tab-active-background text-editor-tab-active-foreground"
        : "bg-editor-tab-background text-editor-tab-foreground hover:bg-editor-tab-hover-background hover:text-editor-tab-hover-foreground",
    );

    const icon = el.querySelector(
      '[data-role="icon"]',
    ) as HTMLImageElement | null;
    if (icon) icon.src = `./file-icons/${get_file_icon(tab.file_path)}`;

    const name = el.querySelector('[data-role="name"]') as HTMLElement | null;
    if (name && name.textContent !== tab.name) name.textContent = tab.name;

    const dirty = el.querySelector('[data-role="dirty"]') as HTMLElement | null;
    if (dirty)
      dirty.className = cn(
        "absolute inset-0 flex items-center justify-center",
        tab.is_touched ? "opacity-100 group-hover:opacity-0" : "opacity-0",
      );

    const close = el.querySelector('[data-role="close"]') as HTMLElement | null;
    if (close)
      close.className = cn(
        "absolute inset-0 flex items-center justify-center rounded [&_svg]:w-5 [&_svg]:h-5 text-editor-tab-close-foreground group-hover:text-editor-tab-close-hover-foreground",
        tab.is_touched ? "opacity-0 group-hover:opacity-100" : "opacity-100",
      );

    return el;
  };

  const bind_drag = (el: HTMLElement, file_path: string) => {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      begin_tab_drag({ file_path, from_group_id: group_id });
      e.dataTransfer!.effectAllowed = "move";
      e.dataTransfer!.setData(TAB_DND_MIME, file_path);
      e.dataTransfer!.setData("text/plain", file_path);
      requestAnimationFrame(() => (el.style.opacity = "0.4"));
    });
    el.addEventListener("dragend", () => {
      el.style.opacity = "";
      drag_over = null;
      clear_indicators();
      end_tab_drag();
    });
    el.addEventListener("dragover", (e) => {
      const drag = current_tab_drag();
      if (!drag) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer!.dropEffect = "move";
      if (drag.from_group_id === group_id && drag.file_path === file_path)
        return;
      if (drag_over === file_path) return;
      drag_over = file_path;
      clear_indicators();

      if (drag.from_group_id === group_id) {
        const order = group_tabs(group_id).map((t) => t.file_path);
        el.style[
          order.indexOf(drag.file_path) < order.indexOf(file_path)
            ? "borderRight"
            : "borderLeft"
        ] = "2px solid var(--focus-border)";
      } else {
        el.style.borderLeft = "2px solid var(--focus-border)";
      }
    });
    el.addEventListener("dragleave", () => {
      if (drag_over === file_path) {
        drag_over = null;
        clear_indicators();
      }
    });
    el.addEventListener("drop", (e) => {
      const drag = current_tab_drag();
      clear_indicators();
      if (!drag) return;
      e.preventDefault();
      e.stopPropagation();

      if (drag.from_group_id === group_id) {
        if (drag.file_path !== file_path)
          reorder(group_id, drag.file_path, file_path);
        return;
      }

      const to_index = group_tabs(group_id).findIndex(
        (t) => t.file_path === file_path,
      );
      store.dispatch(
        move_tab_to_group({
          file_path: drag.file_path,
          from_group_id: drag.from_group_id,
          to_group_id: group_id,
          to_index: to_index === -1 ? undefined : to_index,
        }),
      );
    });
  };

  const render = () => {
    const tabs = group_tabs(group_id);
    const seen = new Set(tabs.map((t) => t.file_path));

    for (const [fp, el] of tab_els) {
      if (!seen.has(fp)) {
        el.remove();
        tab_els.delete(fp);
      }
    }

    tabs.forEach((tab, i) => {
      let el = tab_els.get(tab.file_path);
      if (!el) {
        el = render_tab(tab);
        tab_els.set(tab.file_path, el);
      } else {
        render_tab(tab, el);
      }
      if (container.children[i] !== el) {
        const ref = container.children[i];
        ref ? container.insertBefore(el, ref) : container.appendChild(el);
      }
    });
  };

  header.addEventListener("dragover", (e) => {
    const drag = current_tab_drag();
    if (!drag || drag.from_group_id === group_id) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  });
  header.addEventListener("drop", (e) => {
    const drag = current_tab_drag();
    if (!drag || drag.from_group_id === group_id) return;
    e.preventDefault();
    store.dispatch(
      move_tab_to_group({
        file_path: drag.file_path,
        from_group_id: drag.from_group_id,
        to_group_id: group_id,
      }),
    );
  });

  let prev = group_tabs(group_id);
  const unsub = store.subscribe(() => {
    const tabs = group_tabs(group_id);
    if (tabs === prev) return;
    prev = tabs;
    render();
  });

  render();

  return {
    el: header,
    destroy() {
      unsub();
      tab_els.clear();
      scroll.destroy();
      header.remove();
    },
  };
}
