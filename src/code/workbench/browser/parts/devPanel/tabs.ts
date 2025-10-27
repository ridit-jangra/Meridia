import PerfectScrollbar from "perfect-scrollbar";
import { IDevTab } from "../../../types.js";
import { getThemeIcon } from "../../media/icons.js";
import { CoreEl } from "../el.js";
import { Panel } from "../panel.js";
import { _terminal } from "./terminal.js";
import { _run } from "./run.js";
import { _problem } from "./problem.js";
import { _xtermManager } from "../../../common/devPanel/spawnXterm.js";

const storage = window.storage;

export class DevPanelTabs extends CoreEl {
  private _tabs: IDevTab[] = [
    {
      id: `terminal`,
      name: "Terminal",
      active: true,
      icon: getThemeIcon("terminal"),
    },
    {
      id: `run`,
      name: "Run",
      active: false,
      icon: getThemeIcon("run"),
    },
    {
      id: `problem`,
      name: "Problems",
      active: false,
      icon: getThemeIcon("problem"),
    },
  ];
  private _contentEl: HTMLElement;
  private _panels: Map<string, any> = new Map();
  private _eventListeners: Map<string, Function[]> = new Map();
  private _isTransitioning: boolean = false;

  constructor(contentEl: HTMLElement) {
    super();

    this._contentEl = contentEl;
    this._createEl();
  }

  private _createEl() {
    this._el = new Panel("tabs").getDomElement()!;
    this._el.className = "panel vertical";
    this._el.style.height = "100%";
    this._el.style.width = "fit-content";

    this._render();

    const _active = storage.get("workbench.workspace.dev.panel.active.tab");
    if (_active) this._set(_active);
    else this._set("terminal");
  }

  private _render() {
    const existingTabsContainer = this._el!.querySelector(".tabs");
    const existingCollapseIcon = this._el!.querySelector(".collapse");
    if (existingTabsContainer) {
      existingTabsContainer.remove();
    }
    if (existingCollapseIcon) {
      existingCollapseIcon.remove();
    }

    const tabsContainer = document.createElement("div");
    tabsContainer.className = "tabs vertical";
    new PerfectScrollbar(tabsContainer);
    if (!tabsContainer) return;

    const activeTab = this._tabs.find((t) => t.active);
    if (activeTab) {
      this._open(activeTab);
    }

    storage.store("workbench.workspace.dev.panel.active.tab", this._tabs);

    this._tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `tab ${tab.active ? "active" : ""}`;

      tabEl.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".close-icon")) {
          return;
        }

        this._tabs = this._tabs.map((t) => ({
          ...t,
          active: t.id === tab.id,
        }));

        this._render();

        storage.store("workbench.workspace.dev.panel.active.tab", tab.id);
      };

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = tab.icon ?? getThemeIcon("terminal");

      tabEl.appendChild(icon);

      tabsContainer.appendChild(tabEl);
    });

    this._el!.appendChild(tabsContainer);
  }

  private _open(tab: IDevTab) {
    this._contentEl.innerHTML = "";

    let panel = this._panels.get(tab.id);

    if (!panel) {
      if (tab.id === "terminal") {
        panel = _terminal;
      } else if (tab.id === "run") {
        panel = _run;
      } else if (tab.id === "problem") {
        panel = _problem;
      }

      this._panels.set(tab.id, panel);
    }

    this._contentEl.appendChild(panel.getDomElement()!);
  }

  private _emit(event: string, data?: any): void {
    const listeners = this._eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  public on(event: string, callback: Function): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(callback);
  }

  public once(event: string, callback: Function): void {
    const wrappedCallback = (data: any) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public async _set(tabId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const targetTab = this._tabs.find((tab) => tab.id === tabId);

      if (!targetTab) {
        resolve(false);
        return;
      }

      if (targetTab.active && !this._isTransitioning) {
        resolve(true);
        return;
      }

      this._isTransitioning = true;

      this._tabs = this._tabs.map((tab) => ({
        ...tab,
        active: tab.id === tabId,
      }));

      this._emit("tabChanging", { from: this.getActiveTab()?.id, to: tabId });

      this._render();

      storage.store("workbench.workspace.dev.panel.active.tab", tabId);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this._isTransitioning = false;

          this._emit("tabChanged", {
            activeTab: tabId,
            tabInstance: this._panels.get(tabId),
          });

          resolve(true);
        });
      });
    });
  }

  public _setSync(tabId: string): boolean {
    const targetTab = this._tabs.find((tab) => tab.id === tabId);

    if (!targetTab) {
      return false;
    }

    if (targetTab.active) {
      return true;
    }

    this._tabs = this._tabs.map((tab) => ({
      ...tab,
      active: tab.id === tabId,
    }));

    this._render();
    return true;
  }

  public getActiveTab(): IDevTab | undefined {
    return this._tabs.find((tab) => tab.active);
  }

  public async waitForTab(
    tabId: string,
    timeout: number = 5000
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for tab ${tabId}`));
      }, timeout);

      if (this.getActiveTab()?.id === tabId && !this._isTransitioning) {
        clearTimeout(timeoutId);
        resolve(true);
        return;
      }

      const onTabChanged = (data: { activeTab: string }) => {
        if (data.activeTab === tabId) {
          clearTimeout(timeoutId);
          this.off("tabChanged", onTabChanged);
          resolve(true);
        }
      };

      this.on("tabChanged", onTabChanged);
    });
  }
}
