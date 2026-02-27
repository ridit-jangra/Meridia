import {
  close_all_tabs,
  close_editor_tab,
  close_other_tabs,
  open_editor_tab,
} from "../../services/editor/editor.helper";
import { ITab } from "../../services/editor/editor.types";
import { get_file_icon } from "../../services/explorer/explorer.helper";
import { store } from "../../services/state/store";
import { cn, ContextMenu, h, Tooltip, ScrollArea } from "../../ui";
import { lucide } from "../../ui/components/icon";
import { TabSwitcher } from "../../ui/components/tab-switcher";
import { history } from "../../services/history/history.service";
import { insights as insights_service } from "../../services/insight/insight.service";
import { insights_events } from "../../events/insights.events";
import type { Insight } from "../../services/insight/insight.types";
import { explorer_events } from "../../events/explorer.events";

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

  const scrollToTab = (element: HTMLElement) => {
    setTimeout(() => {
      const editorport = scrollArea.viewport;

      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const elementRight = elementLeft + elementWidth;

      const editorportScrollLeft = editorport.scrollLeft;
      const editorportWidth = editorport.clientWidth;
      const editorportRight = editorportScrollLeft + editorportWidth;

      if (elementLeft < editorportScrollLeft) {
        editorport.scrollLeft = elementLeft - 20;
      } else if (elementRight > editorportRight) {
        editorport.scrollLeft = elementRight - editorportWidth + 20;
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
          class:
            "absolute inset-0 flex items-center justify-center rounded [&_svg]:w-5 [&_svg]:h-5 text-editor-tab-close-foreground opacity-100",
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
          "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
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

      Tooltip({
        child: element,
        text: tab.file_path,
        position: "bottom",
        delay: 200,
      });

      const ctx = ContextMenu();
      ctx.bind(element, () => {
        const file_path = element!.dataset.path ?? tab.file_path;
        const pills = store.getState().editor.tabs;

        return [
          {
            type: "item",
            label: "Close Tab",
            onClick: () => close_editor_tab(file_path),
          },
          {
            type: "item",
            label: "Close Other Tabs",
            onClick: () => close_other_tabs(file_path),
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
      "group",
      "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
      tab.active
        ? "bg-editor-tab-active-background text-editor-tab-active-foreground"
        : "bg-editor-tab-background text-editor-tab-foreground hover:bg-editor-tab-hover-background hover:text-editor-tab-hover-foreground",
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
        "absolute inset-0 flex items-center justify-center text-editor-tab-close-foreground",
        "rounded [&_svg]:w-5 [&_svg]:h-5",
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
        const activeElement = tabElements.get(activeTab.file_path);
        if (activeElement) scrollToTab(activeElement);
      }
      return;
    }

    const currentPaths = new Set(tabs.map((t) => t.file_path));
    const prevPaths = new Set(prevTabs.map((t) => t.file_path));

    for (const prevPath of prevPaths) {
      if (!currentPaths.has(prevPath)) {
        const element = tabElements.get(prevPath);
        if (element) {
          element.remove();
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
          prevTab.name !== tab.name
        ) {
          renderTab(tab, element);
        }
      } else {
        renderTab(tab, element);
      }

      if (tab.active) newActiveElement = element;

      const currentChild = container.children[i];
      if (currentChild !== element) {
        if (currentChild) {
          container.insertBefore(element, currentChild);
        } else {
          container.appendChild(element);
        }
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
      if (tabs.length > 0) {
        switcher.open(tabs, 1);
      }
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
