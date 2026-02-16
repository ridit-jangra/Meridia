import {
  close_all_tabs,
  close_editor_tab,
  close_other_tabs,
  open_editor_tab,
} from "../../services/editor/editor.helper";
import { ITab } from "../../services/editor/editor.types";
import { get_file_icon } from "../../services/explorer/explorer.helper";
import { store } from "../../services/state/store";
import { cn, ContextMenu, h, Tooltip } from "../../ui";
import { lucide } from "../../ui/components/icon";
import { TabSwitcher } from "../../ui/components/tab-switcher";

export function EditorTabs() {
  const header = h("div", {
    class: "flex items-center shrink-0 border-b-editor-tab-border",
  });
  const switcher = TabSwitcher();

  const tabElements = new Map<string, HTMLElement>();
  let prevTabs: ITab[] = [];

  const createTabElement = (tab: ITab) => {
    const is_active = tab.active;

    const icon = h("img", {
      class: "w-4 h-4 mt-px",
    });
    icon.src = `./file-icons/${get_file_icon(tab.file_path)}`;

    const pill = h(
      "div",
      {
        class: cn(
          "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border",
          is_active
            ? "bg-view-tab-active-background text-view-tab-active-foreground"
            : "bg-view-tab-background text-view-tab-foreground hover:bg-view-tab-hover-background hover:text-view-tab-hover-foreground",
        ),
        on: { click: () => handle_click(tab) },
      },
      h("div", { class: "flex items-center gap-1.5" }, icon, tab.name),
      h("span", {}, lucide("x")),
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
      "px-3.5 py-2.5 text-[14px] flex items-center gap-2 cursor-pointer select-none border-r border-r-editor-tab-border",
      is_active
        ? "bg-view-tab-active-background text-view-tab-active-foreground"
        : "bg-view-tab-background text-view-tab-foreground hover:bg-view-tab-hover-background hover:text-view-tab-hover-foreground",
    );
  };

  const renderTabs = () => {
    const tabs = store.getState().editor.tabs;

    header.classList.toggle("border-b", tabs.length > 0);

    if (Math.abs(tabs.length - prevTabs.length) > 1) {
      header.innerHTML = "";
      tabElements.clear();

      for (const tab of tabs) {
        const element = createTabElement(tab);
        tabElements.set(tab.file_path, element);
        header.appendChild(element);
      }

      prevTabs = [...tabs];
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

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const prevTab = prevTabs.find((t) => t.file_path === tab.file_path);
      let element = tabElements.get(tab.file_path);

      if (!element) {
        element = createTabElement(tab);
        tabElements.set(tab.file_path, element);
      } else if (prevTab && prevTab.active !== tab.active) {
        updateTabElement(element, tab);
      }

      const currentChild = header.children[i];
      if (currentChild !== element) {
        if (currentChild) {
          header.insertBefore(element, currentChild);
        } else {
          header.appendChild(element);
        }
      }
    }

    prevTabs = [...tabs];
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

  return {
    el: header,
    destroy() {
      unsub();
      document.removeEventListener("keydown", onKeyDown, true);
      switcher.destroy();
      header.remove();
      tabElements.clear();
    },
  };
}
