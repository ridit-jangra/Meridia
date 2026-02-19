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

export function EditorTabs() {
  const header = h("div", {
    class: "flex items-center shrink-0 border-b-editor-tab-border",
  });

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

  const createTabElement = (tab: ITab) => {
    const is_active = tab.active;

    const icon = h("img", {
      class: "w-4 h-4 mt-px",
    }) as HTMLImageElement;
    icon.src = `./file-icons/${get_file_icon(tab.file_path)}`;

    const dirtyDot = h("span", {
      attrs: { "data-role": "dirty-dot" },
      class: cn(
        "w-[9px] h-[9px] rounded-full",
        "bg-editor-tab-foreground/70",
        tab.is_touched ? "" : "hidden",
        tab.is_touched ? "group-hover:hidden" : "",
      ),
    });

    const closeBtn = h(
      "span",
      {
        attrs: { "data-role": "close-btn" },
        class: cn(
          "rounded p-0.5 [&_svg]:w-5 [&_svg]:h-5",
          tab.is_touched ? "hidden group-hover:flex" : "",
        ),
        on: {
          click: (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            close_editor_tab(tab.file_path);
          },
          mousedown: (e: MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
            }
          },
        },
      },
      lucide("x"),
    );

    const endSlot = h(
      "div",
      { class: "shrink-0 w-6 flex items-center justify-center" },
      dirtyDot,
      closeBtn,
    );

    const pill = h(
      "div",
      {
        class: cn(
          "group",
          "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
          is_active
            ? "bg-editor-tab-active-background text-editor-tab-active-foreground"
            : "bg-editor-tab-background text-editor-tab-foreground hover:bg-editor-tab-hover-background hover:text-editor-tab-hover-foreground",
        ),
        on: {
          click: (e: MouseEvent) => {
            if (e.button === 0) handle_click(tab);
          },
          mousedown: (e: MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
              close_editor_tab(tab.file_path);
            }
          },
          auxclick: (e: MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
              close_editor_tab(tab.file_path);
            }
          },
        },
      },
      h("div", { class: "flex items-center gap-1.5" }, icon, tab.name),
      endSlot,
    );

    Tooltip({
      child: pill,
      text: tab.file_path,
      position: "bottom",
      delay: 200,
    });

    const ctx = ContextMenu();

    ctx.bind(pill, () => {
      const pills = store.getState().editor.tabs;
      return [
        {
          type: "item",
          label: "Close Tab",
          onClick: () => close_editor_tab(tab.file_path),
        },
        {
          type: "item",
          label: "Close Other Tabs",
          onClick: () => close_other_tabs(tab.file_path),
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
          onClick: () => {
            navigator.clipboard.writeText(tab.file_path);
          },
        },
      ];
    });

    return pill;
  };

  const updateTabElement = (element: HTMLElement, tab: ITab) => {
    const is_active = tab.active;

    element.className = cn(
      "group",
      "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border whitespace-nowrap",
      is_active
        ? "bg-editor-tab-active-background text-editor-tab-active-foreground"
        : "bg-editor-tab-background text-editor-tab-foreground hover:bg-editor-tab-hover-background hover:text-editor-tab-hover-foreground",
    );

    const dot = element.querySelector(
      '[data-role="dirty-dot"]',
    ) as HTMLElement | null;
    const close = element.querySelector(
      '[data-role="close-btn"]',
    ) as HTMLElement | null;

    if (dot) {
      dot.className = cn(
        "w-[9px] h-[9px] rounded-full",
        "bg-editor-tab-foreground/70",
        tab.is_touched ? "" : "hidden",
        tab.is_touched ? "group-hover:hidden" : "",
      );
    }

    if (close) {
      close.className = cn(
        "rounded p-0.5 [&_svg]:w-5 [&_svg]:h-5",
        tab.is_touched ? "hidden group-hover:flex" : "",
      );
    }
  };

  const renderTabs = () => {
    const tabs = store.getState().editor.tabs;

    header.classList.toggle("border-b", tabs.length > 0);

    if (Math.abs(tabs.length - prevTabs.length) > 1) {
      container.innerHTML = "";
      tabElements.clear();

      for (const tab of tabs) {
        const element = createTabElement(tab);
        tabElements.set(tab.file_path, element);
        container.appendChild(element);
      }

      prevTabs = [...tabs];

      const activeTab = tabs.find((t) => t.active);
      if (activeTab) {
        const activeElement = tabElements.get(activeTab.file_path);
        if (activeElement) {
          scrollToTab(activeElement);
        }
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
        element = createTabElement(tab);
        tabElements.set(tab.file_path, element);
      } else if (prevTab) {
        if (prevTab.active !== tab.active) {
          updateTabElement(element, tab);
          if (tab.active) {
            newActiveElement = element;
          }
        }
      } else if (tab.active) {
        newActiveElement = element;
      }

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

    if (newActiveElement) {
      scrollToTab(newActiveElement);
    }
  };

  const handle_click = async (tab: ITab) => {
    open_editor_tab(tab.file_path);
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
  });

  renderTabs();

  header.appendChild(scrollArea.el);

  return {
    el: header,
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
