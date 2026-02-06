import { menuItems } from "./titlebarMenu.js";
import { dispatch } from "../../../common/store/store.js";
import { select, watch } from "../../../common/store/selector.js";
import { update_panel_state } from "../../../common/store/slice.js";
import { getIcon, openTab } from "../../../common/utils.js";
import { IEditorTab, Menuitems } from "../../../workbench.types.js";
import {
  bottomPanelIcon,
  leftPanelIcon,
  getThemeIcon,
  leftPanelIconOff,
  bottomPanelIconOff,
} from "../../media/icons.js";
import { CoreEl } from "../core.js";
import { runCommand } from "../../../common/command.js";
import { PanelOption } from "../panel/panelOption.js";
import { _commandPanel } from "./commandPanel.js";
import { _newProject } from "../../window/new-project/browser/new-project.js";
import { Tooltip } from "../tooltip/tooltip.js";

export class Titlebar extends CoreEl {
  private menuVisible: boolean = false;
  private menuElement: HTMLDivElement | null = null;
  private hamburgerContainer: HTMLSpanElement | null = null;
  private activeSubmenus: Set<HTMLElement> = new Set();
  private activeItems: Map<HTMLElement, HTMLElement> = new Map();

  constructor() {
    super();
    this._createEl();
    this._addEventListeners();
    this._registerShortcuts();
  }

  private _createEl(): void {
    this._el = document.createElement("div");
    this._el.className = "titlebar top";

    const leftPanelSection = document.createElement("div");
    leftPanelSection.className = "left-panel-section";

    const logo = document.createElement("span");
    logo.className = "logo";
    logo.innerHTML = getIcon("../images/logo.svg");

    const leftPanel = new Tooltip()._getEl(
      document.createElement("span"),
      "Toggle left panel (Ctrl+B)",
      "bottom",
    );
    leftPanel.innerHTML = leftPanelIcon;
    leftPanel.onclick = () => {
      const _state = select((s) => s.main.panel_state);
      dispatch(update_panel_state({ ..._state, left: !_state.left }));
    };

    const bottomPanel = new Tooltip()._getEl(
      document.createElement("span"),
      "Toggle bottom panel (Ctrl+J)",
      "bottom",
    );
    bottomPanel.innerHTML = bottomPanelIcon;
    bottomPanel.onclick = () => {
      const _state = select((s) => s.main.panel_state);
      dispatch(update_panel_state({ ..._state, bottom: !_state.bottom }));
    };

    watch(
      (s) => s.main.panel_state,
      (v) => {
        if (v.left) leftPanel.innerHTML = leftPanelIcon;
        else leftPanel.innerHTML = leftPanelIconOff;

        if (v.bottom) bottomPanel.innerHTML = bottomPanelIcon;
        else bottomPanel.innerHTML = bottomPanelIconOff;
      },
    );

    this.hamburgerContainer = new Tooltip()._getEl(
      document.createElement("span"),
      "Open menu",
      "bottom",
    );
    this.hamburgerContainer.className = "menu-button menu-container";
    this.hamburgerContainer.innerHTML = getThemeIcon("menu");
    this.hamburgerContainer.onclick = (e) => {
      e.stopPropagation();
      this._toggle();
    };

    this.menuElement = this._createMenuMenu();
    this.hamburgerContainer.appendChild(this.menuElement);

    const newProject = new Tooltip()._getEl(
      document.createElement("span"),
      "Create new project",
      "bottom",
    );
    newProject.innerHTML = getThemeIcon("add");
    newProject.className = "command-option";
    newProject.style.marginLeft = "5px";
    newProject.onclick = () => {
      _newProject._show();
    };

    const actionEl = document.createElement("div");
    actionEl.className = "action";

    leftPanelSection.appendChild(logo);
    leftPanelSection.appendChild(actionEl);
    actionEl.appendChild(leftPanel);
    actionEl.appendChild(bottomPanel);
    leftPanelSection.appendChild(this.hamburgerContainer);
    leftPanelSection.appendChild(newProject);

    const rightControlsSection = document.createElement("div");
    rightControlsSection.className = "right-panel-section";

    const menuOptionsContainer = document.createElement("div");
    menuOptionsContainer.className = "menu-options-container";

    const informationSection = document.createElement("div");
    informationSection.className = "information-section";

    const settings = new PanelOption(
      null as any,
      null as any,
      () => {
        const _tab: IEditorTab = {
          name: "Settings",
          icon: getThemeIcon("settings"),
          uri: "tab://settings",
          is_touched: false,
          active: true,
        };

        openTab(_tab);
      },
      getThemeIcon("settings"),
    );

    const runOption = new PanelOption(
      "Run current file",
      null as any,
      () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.run", [_active.uri]);
      },
      getThemeIcon("run"),
      "bottom",
    );

    const debugOption = new PanelOption(
      "Debug current file",
      null as any,
      () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.debug", [_active.uri]);
      },
      getThemeIcon("debug"),
      "bottom",
    );

    const stopOption = new PanelOption(
      "Stop running file",
      null as any,
      () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.stop", [_active.uri]);
      },
      getThemeIcon("stop"),
      "bottom",
    );

    document.addEventListener("workbench.editor.run.disable", () => {
      runOption.getDomElement()!.innerHTML = getThemeIcon("rerun");
      runOption.getDomElement()!.onclick = () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.rerun", [_active.uri]);
      };
    });
    document.addEventListener("workbench.editor.run.enable", () => {
      runOption.getDomElement()!.innerHTML = getThemeIcon("run");
      runOption.getDomElement()!.onclick = () => {
        const _tabs = select((s) => s.main.editor_tabs);
        const _active = _tabs.find((t) => t.active);

        if (_active) runCommand("workbench.editor.run", [_active.uri]);
      };
    });

    document.addEventListener("workbench.editor.stop.disable", () => {
      stopOption.getDomElement()!.style.display = "none";
    });
    document.addEventListener("workbench.editor.stop.enable", () => {
      stopOption.getDomElement()!.style.display = "flex";
    });

    stopOption.getDomElement()!.style.display = "none";

    menuOptionsContainer.appendChild(runOption.getDomElement()!);
    menuOptionsContainer.appendChild(stopOption.getDomElement()!);
    menuOptionsContainer.appendChild(debugOption.getDomElement()!);
    menuOptionsContainer.appendChild(settings.getDomElement()!);

    rightControlsSection.appendChild(informationSection);
    rightControlsSection.appendChild(menuOptionsContainer);

    this._el.appendChild(leftPanelSection);
    this._el.appendChild(rightControlsSection);
  }

  private _createMenuMenu(): HTMLDivElement {
    const menu = document.createElement("div");
    menu.className = "hamburger-menu";

    this._build(menu, menuItems, 0);
    return menu;
  }

  private _build(
    container: HTMLElement,
    items: Menuitems[],
    level: number,
  ): void {
    items.forEach((item) => {
      if (item.separator) {
        const separator = document.createElement("div");
        separator.className = "menu-separator";
        container.appendChild(separator);
      } else {
        const menuItem = document.createElement("div");
        menuItem.className = `menu-item ${item.disabled ? "disabled" : ""}`;

        const content = document.createElement("div");
        content.className = "menu-item-content";

        const label = document.createElement("span");
        label.className = "menu-item-label";
        label.textContent = item.label;
        content.appendChild(label);

        if (item.submenu && item.submenu.length > 0) {
          const arrow = document.createElement("span");
          arrow.className = "menu-submenu-arrow";
          arrow.innerHTML = getThemeIcon("chevronRight");
          content.appendChild(arrow);

          const submenu = document.createElement("div");
          submenu.className = `hamburger-menu submenu level-${level + 1}`;
          this._build(submenu, item.submenu, level + 1);
          menuItem.appendChild(submenu);

          menuItem.addEventListener("mouseenter", () => {
            const currentActive = this.activeItems.get(container);
            if (currentActive && currentActive !== menuItem) {
              currentActive.classList.remove("active");

              const prevSubmenu = currentActive.querySelector(".submenu");
              if (prevSubmenu) {
                this._hide(prevSubmenu as HTMLElement);
              }
            }

            this._set(menuItem, container);
            this._show(submenu);
          });

          menuItem.addEventListener("mouseleave", (e) => {
            if (menuItem.classList.contains("active")) {
              return;
            }

            const rect = submenu.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            if (
              mouseX < rect.left ||
              mouseX > rect.right ||
              mouseY < rect.top ||
              mouseY > rect.bottom
            ) {
              if (!submenu.matches(":hover") && !menuItem.matches(":hover")) {
                this._hide(submenu);
              }
            }
          });

          menuItem.addEventListener("click", (e) => {
            e.stopPropagation();
            this._set(menuItem, container);

            this._show(submenu);
          });
        } else {
          menuItem.addEventListener("mouseenter", () => {
            const currentActive = this.activeItems.get(container);
            if (currentActive && currentActive !== menuItem) {
              currentActive.classList.remove("active");

              const prevSubmenu = currentActive.querySelector(".submenu");
              if (prevSubmenu) {
                this._hide(prevSubmenu as HTMLElement);
              }

              this.activeItems.delete(container);
            }
          });

          if (item.action && !item.disabled) {
            menuItem.onclick = (e) => {
              e.stopPropagation();
              this._set(menuItem, container);
              this._action(item.action!);
              this._close();
            };
          }
        }

        menuItem.appendChild(content);

        if (item.shortcut) {
          const shortcut = document.createElement("span");
          shortcut.className = "shortcut";
          item.shortcut.forEach((s, index) => {
            const _item = document.createElement("span");
            _item.textContent =
              s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            shortcut.appendChild(_item);

            if (index < item.shortcut!.length - 1) {
              const plus = document.createElement("span");
              plus.className = "shortcut-separator";
              plus.textContent = "+";
              shortcut.appendChild(plus);
            }
          });

          menuItem.appendChild(shortcut);
        }

        container.appendChild(menuItem);
      }
    });
  }

  private _registerShortcuts(): void {
    const allItems: Menuitems[] = [];

    const flatten = (items: Menuitems[]) => {
      items.forEach((item) => {
        if (item.shortcut) {
          allItems.push(item);
        }
        if (item.submenu) {
          flatten(item.submenu);
        }
      });
    };

    flatten(menuItems);

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      allItems.forEach((item) => {
        if (!item.shortcut) return;

        const keys = item.shortcut.map((k) => k.toLowerCase());
        const pressedKeys = new Set<string>();

        if (e.ctrlKey) pressedKeys.add("ctrl");
        if (e.shiftKey) pressedKeys.add("shift");
        if (e.altKey) pressedKeys.add("alt");
        if (e.metaKey) pressedKeys.add("meta");

        if (e.key) pressedKeys.add(e.key.toLowerCase());

        const isMatch =
          pressedKeys.size === keys.length &&
          keys.every((key) => pressedKeys.has(key));

        if (isMatch) {
          e.preventDefault();

          if (item.action && !item.disabled) {
            this._action(item.action);
          }
        }
      });
    });
  }

  private _set(selectedItem: HTMLElement, container: HTMLElement): void {
    const currentActive = this.activeItems.get(container);
    if (currentActive && currentActive !== selectedItem) {
      currentActive.classList.remove("active");

      const prevSubmenu = currentActive.querySelector(".submenu");
      if (prevSubmenu) {
        this._hide(prevSubmenu as HTMLElement);
      }
    }

    selectedItem.classList.add("active");
    this.activeItems.set(container, selectedItem);

    const newSubmenu = selectedItem.querySelector(".submenu");
    if (newSubmenu) {
      this._show(newSubmenu as HTMLElement);
    }
  }

  private _clearAll(): void {
    this.activeItems.forEach((activeItem) => {
      activeItem.classList.remove("active");
    });
    this.activeItems.clear();
  }

  private _action(action: string): void {
    const menuEvent = new CustomEvent("workbench.workspace.toggle.action", {
      detail: { action },
    });
    document.dispatchEvent(menuEvent);
  }

  private _show(submenu: HTMLElement): void {
    submenu.classList.add("show");
    this.activeSubmenus.add(submenu);
  }

  private _hide(submenu: HTMLElement): void {
    submenu.classList.remove("show");
    this.activeSubmenus.delete(submenu);

    const nestedSubmenus = submenu.querySelectorAll(".submenu");
    nestedSubmenus.forEach((nested) => {
      nested.classList.remove("show");
      this.activeSubmenus.delete(nested as HTMLElement);
    });
  }

  private _toggle(): void {
    if (this.menuVisible) {
      this._close();
    } else {
      this._open();
    }
  }

  private _open(): void {
    if (this.menuElement) {
      this.menuElement.classList.add("show");
      this.menuVisible = true;
    }
  }

  private _close(): void {
    if (this.menuElement) {
      this.menuElement.classList.remove("show");
      this.menuVisible = false;

      this.activeSubmenus.forEach((submenu) => {
        submenu.classList.remove("show");
      });
      this.activeSubmenus.clear();

      this._clearAll();
    }
  }

  private _addEventListeners(): void {
    document.addEventListener("click", (e) => {
      if (
        this.menuVisible &&
        this.hamburgerContainer &&
        !this.hamburgerContainer.contains(e.target as Node)
      ) {
        this._close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.menuVisible) {
        this._close();
      }
    });
  }
}
