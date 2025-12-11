import { IPackageManagerTab } from "../../../workbench.types.js";
import { CoreEl } from "../core.js";
import { registerStandalone } from "../../../common/class.js";
import { getFileIcon } from "../../../common/utils.js";
import { _pythonPackageManager } from "../packageManger/python.js";

const ipc = window.ipc;

export class PackageManager extends CoreEl {
  private _tabs: IPackageManagerTab[] = [
    {
      name: "Python",
      id: "python",
      active: true,
      icon: getFileIcon("file.py"),
      content: _pythonPackageManager.getDomElement()!,
    },
  ];

  constructor() {
    super();
    this._createEl();

    setTimeout(() => {
      this._render();
    }, 100);
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "package-container";

    const runArea = document.createElement("div");
    runArea.className = "package-area";

    this._el.appendChild(runArea);
  }

  _render() {
    const tabsContainer =
      this._el!.parentElement!.parentElement!.parentElement!.querySelector(
        ".content-tabs"
      ) as HTMLDivElement;
    if (!tabsContainer) return;

    tabsContainer.innerHTML = "";

    this._tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `tab ${tab.active ? "active" : ""}`;

      tabEl.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".close-icon")) return;
        this._switch(tab.id);
      };

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = tab.icon;

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = tab.name;

      tabEl.appendChild(icon);
      tabEl.appendChild(name);

      tabsContainer.appendChild(tabEl);
    });

    const activeTab = this._tabs.find((t) => t.active);
    if (activeTab) {
      this._open(activeTab);
    }

    const activeTabEl = tabsContainer.querySelector(
      ".tab.active"
    ) as HTMLElement | null;

    if (activeTabEl) {
      const container = tabsContainer;
      const offsetLeft = activeTabEl.offsetLeft;
      const tabWidth = activeTabEl.offsetWidth;
      const containerScrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;

      if (offsetLeft < containerScrollLeft) {
        container.scrollLeft = offsetLeft;
      } else if (offsetLeft + tabWidth > containerScrollLeft + containerWidth) {
        container.scrollLeft = offsetLeft + tabWidth - containerWidth;
      }
    }
  }

  private async _open(tab: IPackageManagerTab) {
    const packageArea = this._el?.querySelector(
      ".package-area"
    ) as HTMLDivElement;
    if (!packageArea) return;

    packageArea.innerHTML = "";

    packageArea.appendChild(tab.content);
  }

  private _close(tabId: string) {
    const tabIndex = this._tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const closingTab = this._tabs[tabIndex]!;
    const isClosingActive = closingTab.active;

    this._tabs = this._tabs.filter((t) => t.id !== tabId);

    if (isClosingActive && this._tabs.length > 0) {
      const newActiveIndex =
        tabIndex < this._tabs.length ? tabIndex : this._tabs.length - 1;
      this._tabs = this._tabs.map((tab, index) => ({
        ...tab,
        active: index === newActiveIndex,
      }));
    }

    this._render();
  }

  private _switch(tabId: string) {
    this._tabs = this._tabs.map((t) => ({
      ...t,
      active: t.id === tabId,
    }));
    this._render();
  }

  public _getActive() {
    return this._tabs.find((t) => t.active);
  }

  public getDomElement() {
    return this._el!;
  }
}

export const _packageManager = new PackageManager();
registerStandalone("package-manager", _packageManager);
