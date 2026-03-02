import { ITab } from "../../../../types/editor.types";
import { Insight } from "../../../../types/insight.types";
import {
  close_all_tabs,
  close_editor_tab,
  open_editor_tab,
} from "../../../editor/editor.helper";
import { explorer_events } from "../../../platform/events/explorer.events";
import { insights_events } from "../../../platform/events/insights.events";
import { get_file_icon } from "../../../platform/explorer/explorer.helper";
import { history } from "../../../platform/history/history.service";
import { insights as insights_service } from "../../../platform/insight/insight.service";
import { ContextMenu } from "../../browser/parts/components/context-menu";
import { lucide } from "../../browser/parts/components/icon";
import { ScrollArea } from "../../browser/parts/components/scroll-area";
import { TabSwitcher } from "../../browser/parts/components/tab-switcher";
import { shortcuts } from "../../common/shortcut/shortcut.service";
import { store } from "../../common/state/store";
import { update_tabs } from "../../common/state/slices/editor.slice";
import { h } from "../core/dom/h";
import { cn } from "../core/utils/cn";

export function EditorTabs() {
  const header = h("div", {
    class: "flex items-center shrink-0 border-b border-workbench-border",
  });

  insights_events.on("insight.change.ui", (_: Insight | null) => {});

  const scrollArea = ScrollArea({
    dir: "horizontal",
    innerClass: "flex items-center w-max",
  });

  const container = scrollArea.inner;
  const switcher = TabSwitcher();

  const tabElements = new Map<string, HTMLElement>();
  let prevTabs: ITab[] = [];

  // ─── Drag state ──────────────────────────────────────────────────────────────
  let drag_source_path: string | null = null;
  let drag_ghost: HTMLElement | null = null;
  let drag_over_path: string | null = null;

  const get_tab_order = (): string[] =>
    store.getState().editor.tabs.map((t) => t.file_path);

  const reorder_tabs = (from_path: string, to_path: string) => {
    const tabs = store.getState().editor.tabs;
    const from_idx = tabs.findIndex((t) => t.file_path === from_path);
    const to_idx = tabs.findIndex((t) => t.file_path === to_path);
    if (from_idx === -1 || to_idx === -1 || from_idx === to_idx) return;

    const next = [...tabs];
    const [moved] = next.splice(from_idx, 1);
    next.splice(to_idx, 0, moved);
    store.dispatch(update_tabs(next));
  };

  const clear_drag_indicators = () => {
    tabElements.forEach((el) => {
      el.style.borderLeft = "";
      el.style.borderRight = "";
    });
  };

  const bind_drag_events = (element: HTMLElement, file_path: string) => {
    element.draggable = true;

    element.addEventListener("dragstart", (e) => {
      drag_source_path = file_path;
      e.dataTransfer!.effectAllowed = "move";
      e.dataTransfer!.setData("text/plain", file_path);

      // Ghost — clone without indicators
      drag_ghost = element.cloneNode(true) as HTMLElement;
      drag_ghost.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0.8;pointer-events:none;";
      document.body.appendChild(drag_ghost);
      e.dataTransfer!.setDragImage(
        drag_ghost,
        element.offsetWidth / 2,
        element.offsetHeight / 2,
      );

      // Fade source slightly after drag starts
      requestAnimationFrame(() => {
        element.style.opacity = "0.4";
      });
    });

    element.addEventListener("dragend", () => {
      element.style.opacity = "";
      drag_source_path = null;
      drag_over_path = null;
      drag_ghost?.remove();
      drag_ghost = null;
      clear_drag_indicators();
    });

    element.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
      if (!drag_source_path || drag_source_path === file_path) return;
      if (drag_over_path === file_path) return;

      drag_over_path = file_path;
      clear_drag_indicators();

      const order = get_tab_order();
      const from_idx = order.indexOf(drag_source_path);
      const to_idx = order.indexOf(file_path);

      if (from_idx < to_idx) {
        element.style.borderRight = "2px solid var(--focus-border)";
      } else {
        element.style.borderLeft = "2px solid var(--focus-border)";
      }
    });

    element.addEventListener("dragleave", () => {
      if (drag_over_path === file_path) {
        drag_over_path = null;
        clear_drag_indicators();
      }
    });

    element.addEventListener("drop", (e) => {
      e.preventDefault();
      clear_drag_indicators();
      if (!drag_source_path || drag_source_path === file_path) return;
      reorder_tabs(drag_source_path, file_path);
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const scrollToTab = (element: HTMLElement) => {
    setTimeout(() => {
      const editorport = scrollArea.viewport;
      const elementLeft = element.offsetLeft;
      const elementRight = elementLeft + element.offsetWidth;
      const editorportScrollLeft = editorport.scrollLeft;
      const editorportRight = editorportScrollLeft + editorport.clientWidth;

      if (elementLeft < editorportScrollLeft) {
        editorport.scrollLeft = elementLeft - 20;
      } else if (elementRight > editorportRight) {
        editorport.scrollLeft = elementRight - editorport.clientWidth + 20;
      }
    }, 50);
  };

  const closeTabByPath = (file_path: string) => {
    history.push("editor.tab.close", { file_path });
    close_editor_tab(file_path);
    insights_service.evaluate();
    insights_events.emit("insight.change.ui", insights_service.get_current());
  };

  const openTabByPath = (file_path: string) => {
    history.push("editor.tab.open", { file_path });
    open_editor_tab(file_path);
    insights_service.evaluate();
    insights_events.emit("insight.change.ui", insights_service.get_current());
  };

  const renderTab = (tab: ITab, element?: HTMLElement) => {
    if (!element) {
      const icon = h("img", {
        attrs: { "data-role": "icon" },
        class: "w-5 h-5 mt-px",
      }) as HTMLImageElement;

      const dirtyDot = h(
        "span",
        {
          attrs: { "data-role": "dirty-dot" },
          class: "absolute inset-0 flex items-center justify-center opacity-0",
        },
        h("span", {
          class: "w-[9px] h-[9px] rounded-full bg-editor-tab-icon-foreground",
        }),
      );

      const closeBtn = h(
        "span",
        {
          attrs: { "data-role": "close-btn" },
          class: cn(
            "absolute inset-0 flex items-center justify-center rounded [&_svg]:w-5 [&_svg]:h-5 text-editor-tab-close-foreground opacity-100",
          ),
        },
        lucide("x"),
      );

      const endSlot = h(
        "div",
        { class: "relative shrink-0 w-6 h-6 flex items-center justify-center" },
        dirtyDot,
        closeBtn,
      );

      const title = h(
        "div",
        { class: "flex items-center gap-1.5" },
        icon,
        h("span", { attrs: { "data-role": "name" } }, tab.name),
      );

      element = h("div", {
        class: cn(
          "group",
          "px-3.5 py-3 text-[14.5px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
        ),
        on: {
          click: (e: MouseEvent) => {
            if (e.button !== 0) return;
            const file_path = (element as HTMLElement).dataset.path;
            if (!file_path) return;
            openTabByPath(file_path);
          },
          mousedown: (e: MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
            }
          },
          auxclick: (e: MouseEvent) => {
            if (e.button !== 1) return;
            e.preventDefault();
            e.stopPropagation();
            const file_path = (element as HTMLElement).dataset.path;
            if (!file_path) return;
            closeTabByPath(file_path);
          },
        },
        tooltip: {
          text: tab.file_path,
          position: "bottom",
          delay: 200,
        }
      });

      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file_path = (element as HTMLElement).dataset.path;
        if (!file_path) return;
        closeTabByPath(file_path);
      });

      closeBtn.addEventListener("mousedown", (e) => {
        if ((e as MouseEvent).button === 1) {
          e.preventDefault();
          e.stopPropagation();
        }
      });

      element.appendChild(title);
      element.appendChild(endSlot);

      bind_drag_events(element, tab.file_path);

      const ctx = ContextMenu();
      ctx.bind(element, () => {
        const file_path = element!.dataset.path ?? tab.file_path;
        const pills = store.getState().editor.tabs;
        return [
          {
            type: "item",
            label: "Close Tab",
            onClick: () => close_editor_tab(file_path),
            command_id: shortcuts.get_shortcut({ command: "editor.close" })
              ?.keys as string,
          },
          {
            type: "item",
            label: "Close Other Tabs",
            onClick: () => close_editor_tab(file_path),
            disabled: pills.length <= 1,
          },
          {
            type: "item",
            label: "Close All Tabs",
            onClick: () => close_all_tabs(),
          },
          { type: "separator" },
          {
            type: "item",
            label: "Copy Path",
            onClick: () => navigator.clipboard.writeText(file_path),
          },
        ];
      });
    }

    element.dataset.path = tab.file_path;

    element.className = cn(
      "group relative",
      "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
      tab.active
        ? "bg-editor-tab-active-background text-editor-tab-active-foreground"
        : "bg-editor-tab-background text-editor-tab-foreground hover:bg-editor-tab-hover-background hover:text-editor-tab-hover-foreground",
      tab.tab_status === "DELETED" && "italic !italic",
    );

    const icon = element.querySelector(
      '[data-role="icon"]',
    ) as HTMLImageElement | null;
    if (icon) icon.src = `./file-icons/${get_file_icon(tab.file_path)}`;

    const nameEl = element.querySelector(
      '[data-role="name"]',
    ) as HTMLElement | null;
    if (nameEl && nameEl.textContent !== tab.name)
      nameEl.textContent = tab.name;

    const dot = element.querySelector(
      '[data-role="dirty-dot"]',
    ) as HTMLElement | null;
    if (dot) {
      dot.className = cn(
        "absolute inset-0 flex items-center justify-center",
        tab.is_touched ? "opacity-100 group-hover:opacity-0" : "opacity-0",
      );
    }

    const close = element.querySelector(
      '[data-role="close-btn"]',
    ) as HTMLElement | null;
    if (close) {
      close.className = cn(
        "absolute inset-0 flex items-center justify-center rounded [&_svg]:w-5 [&_svg]:h-5",
        tab.active
          ? "text-editor-tab-close-active-foreground"
          : "text-editor-tab-close-foreground",
        "group-hover:text-editor-tab-close-hover-foreground",
        tab.is_touched ? "opacity-0 group-hover:opacity-100" : "opacity-100",
      );
    }

    return element;
  };

  const renderTabs = () => {
    const tabs = store.getState().editor.tabs;

    if (Math.abs(tabs.length - prevTabs.length) > 1) {
      container.innerHTML = "";
      tabElements.clear();

      for (const tab of tabs) {
        const element = renderTab(tab);
        tabElements.set(tab.file_path, element);
        container.appendChild(element);
      }

      prevTabs = [...tabs];

      const activeTab = tabs.find((t) => t.active);
      if (activeTab) {
        const el = tabElements.get(activeTab.file_path);
        if (el) scrollToTab(el);
      }
      return;
    }

    const currentPaths = new Set(tabs.map((t) => t.file_path));
    const prevPaths = new Set(prevTabs.map((t) => t.file_path));

    for (const prevPath of prevPaths) {
      if (!currentPaths.has(prevPath)) {
        const el = tabElements.get(prevPath);
        if (el) {
          el.remove();
          tabElements.delete(prevPath);
        }
      }
    }

    let newActiveElement: HTMLElement | null = null;

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const prevTab = prevTabs.find((t) => t.file_path === tab.file_path);
      let element = tabElements.get(tab.file_path);

      if (!element) {
        element = renderTab(tab);
        tabElements.set(tab.file_path, element);
      } else if (prevTab) {
        if (
          prevTab.active !== tab.active ||
          (prevTab.is_touched ?? false) !== (tab.is_touched ?? false) ||
          prevTab.name !== tab.name ||
          prevTab.tab_status !== tab.tab_status
        ) {
          renderTab(tab, element);
        }
      } else {
        renderTab(tab, element);
      }

      if (tab.active) newActiveElement = element;

      const currentChild = container.children[i];
      if (currentChild !== element) {
        currentChild
          ? container.insertBefore(element, currentChild)
          : container.appendChild(element);
      }
    }

    prevTabs = [...tabs];
    if (newActiveElement) scrollToTab(newActiveElement);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Tab" && !switcher.is_open()) {
      e.preventDefault();
      e.stopPropagation();
      const tabs = store.getState().editor.tabs;
      if (tabs.length > 0) switcher.open(tabs, 1);
    }
  };

  document.addEventListener("keydown", onKeyDown, true);

  const unsub = store.subscribe(() => {
    renderTabs();
    const active = store.getState().editor.tabs.find((t) => t.active);
    if (!active) return;
    explorer_events.emit("highlight", active.file_path);
  });

  renderTabs();
  header.appendChild(scrollArea.el);

  const el = h("div", {}, header);

  return {
    el,
    destroy() {
      unsub();
      document.removeEventListener("keydown", onKeyDown, true);
      switcher.destroy();
      scrollArea.destroy();
      header.remove();
      tabElements.clear();
    },
  };
}
