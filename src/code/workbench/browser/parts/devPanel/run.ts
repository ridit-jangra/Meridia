import PerfectScrollbar from "perfect-scrollbar";
import { IDevPanelTab } from "../../../workbench.types.js";
import { getThemeIcon } from "../../media/icons.js";
import { CoreEl } from "../core.js";
import { _xtermManager } from "../../../common/devPanel/spawnXterm.js";
import { registerStandalone } from "../../../common/class.js";
import { getFileIcon, getRunCommand } from "../../../common/utils.js";

const path = window.path;
const storage = window.storage;
const ipcRenderer = window.ipc;

export class Run extends CoreEl {
  private _tabs: IDevPanelTab[] = [];

  constructor() {
    super();
    this._createEl();

    setTimeout(() => {
      this._render();
    }, 100);

    ipcRenderer.on("workbench.run.death", (_: any, id: string) => {
      this._close(id);
    });
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "run-container";

    const runArea = document.createElement("div");
    runArea.className = "run-area";

    this._el.appendChild(runArea);
  }

  _render() {
    const tabsContainer =
      this._el!.parentElement!.parentElement!.parentElement!.querySelector(
        ".content-tabs"
      ) as HTMLDivElement;
    if (!tabsContainer) return;

    tabsContainer.innerHTML = "";

    storage.store("run-tabs", this._tabs);

    this._tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `tab ${tab.active ? "active" : ""}`;

      tabEl.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".close-icon")) return;
        this._switch(tab.id);
      };

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = getFileIcon(tab.name);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = tab.name;

      const closeButton = document.createElement("span");
      closeButton.className = "close-icon";
      closeButton.innerHTML = getThemeIcon("close");
      closeButton.onclick = (e) => {
        e.stopPropagation();
        this._close(tab.id);
      };

      tabEl.appendChild(icon);
      tabEl.appendChild(name);
      tabEl.appendChild(closeButton);

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

  private async _open(tab: IDevPanelTab) {
    const runArea = this._el?.querySelector(".run-area") as HTMLDivElement;
    if (!runArea) return;

    runArea.innerHTML = "";
    runArea.style.width = "calc(100% - 200px)";

    const container =
      _xtermManager._get(tab.id) || (await _xtermManager._spawn(tab.id));

    runArea.appendChild(container!);

    const termInstance = _xtermManager._terminals.get(tab.id);
    const term = termInstance?.term;
    if (term) {
      term.focus();
    }

    if (termInstance) {
      const scrollAreaElem = termInstance._container.querySelector(
        ".xterm-viewport"
      ) as HTMLElement;
      const _scrollbar = new PerfectScrollbar(scrollAreaElem, {
        suppressScrollX: true,
      });

      let updateTimeout: NodeJS.Timeout;
      const debouncedUpdate = () => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          _scrollbar.update();
        }, 16);
      };

      const mutationObserver = new MutationObserver((mutations) => {
        const hasRelevantChanges = mutations.some(
          (mutation) =>
            mutation.type === "childList" ||
            (mutation.type === "attributes" &&
              mutation.attributeName === "style" &&
              ((mutation.target as HTMLElement).style.height !== undefined ||
                (mutation.target as HTMLElement).style.width !== undefined))
        );

        if (hasRelevantChanges) {
          debouncedUpdate();
        }
      });

      mutationObserver.observe(scrollAreaElem, {
        childList: false,
        subtree: true,
        attributes: true,
        attributeFilter: ["style"],
        attributeOldValue: false,
      });
    }
  }

  private _close(tabId: string) {
    const tabIndex = this._tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const closingTab = this._tabs[tabIndex]!;
    const isClosingActive = closingTab.active;

    this._tabs = this._tabs.filter((t) => t.id !== tabId);
    _xtermManager._dispose(tabId);

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

  public async _run(_path: string) {
    const norm = _path.replace(/\\/g, "/");
    const existing = this._tabs.find((t) => t.uri === _path);
    let tabId: string;

    if (!existing) {
      tabId = crypto.randomUUID();
      const tab: IDevPanelTab = {
        id: tabId,
        name: `${window.path.basename(norm)}`,
        active: true,
        uri: _path,
      };

      this._tabs = this._tabs.map((t) => ({ ...t, active: false }));
      this._tabs.push(tab);
    } else {
      tabId = existing.id;

      if ((existing as any).meta?.status === "stopped") {
        tabId = crypto.randomUUID();
        existing.id = tabId;
      }
    }

    this._tabs = this._tabs.map((t) => ({ ...t, active: t.uri === _path }));
    this._render();

    const runArea = this._el?.querySelector(".run-area") as HTMLElement | null;
    if (!runArea) return;

    runArea.innerHTML = "";

    const container = await _xtermManager._spawn(tabId);
    runArea.appendChild(container!);

    const command = `${getRunCommand(_path)} "${_path}"`;

    await _xtermManager._run(tabId, command, path.dirname(_path));
    this._set(tabId, "running");

    return tabId;
  }

  public async _stop(_path: string, id: string) {
    const tabId = id;
    const tab = this._tabs.find((t) => t.id === id);
    if (!tab) return;

    const termInstance = _xtermManager._terminals.get(tabId);

    await _xtermManager._stop(id);
    this._set(id, "stopped");
    termInstance?.term?.write(`Exit code 1.\r\n`);
    this._set(tabId, "stopped");
  }

  private _set(tabId: string, status: "running" | "stopped") {
    this._tabs = this._tabs.map((t) =>
      t.id === tabId ? { ...t, meta: { ...(t as any).meta, status } } : t
    );
    this._render();
  }

  public _getActive() {
    return this._tabs.find((t) => t.active);
  }

  public getDomElement() {
    const _active = this._getActive();
    _xtermManager._terminals.get(_active?.id!)?.term.focus();
    return this._el!;
  }
}

export const _run = new Run();
registerStandalone("run", _run);
