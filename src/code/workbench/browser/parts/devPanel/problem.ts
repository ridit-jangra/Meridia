import { CoreEl } from "../core.js";
import { getStandalone, registerStandalone } from "../../../common/class.js";
import { getThemeIcon } from "../../media/icons.js";
import { Editor } from "../../../../editor/standalone/standalone.js";
import { IProblemTab, IError, IWarning } from "../../../workbench.types.js";
import { getFileIcon } from "../../../common/utils.js";
import { watch } from "../../../common/store/selector.js";

const path = window.path;

export class Problem extends CoreEl {
  private _problems = new Map<string, any>();
  private _listEl!: HTMLElement;
  private _tabs: IProblemTab[] = [];

  constructor() {
    super();
    this._createEl();

    document.addEventListener("workbench.editor.detect.error", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _info = _customEvent.detail;
      this._handleErrorDetected(_info);
    });

    document.addEventListener("workbench.editor.detect.warning", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _info = _customEvent.detail;
      this._handleWarningDetected(_info);
    });

    document.addEventListener("workbench.editor.remove.error", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _info = _customEvent.detail;
      this._handleErrorRemoved(_info);
    });

    document.addEventListener("workbench.editor.remove.warning", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _info = _customEvent.detail;
      this._handleWarningRemoved(_info);
    });
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "error-container";

    this._listEl = document.createElement("div");
    this._listEl.className = "problems-list scrollbar-container";
    this._el.appendChild(this._listEl);

    watch(
      (s) => s.main.editor_tabs,
      (_tabs) => {
        const _active = _tabs.find((_tab) => _tab.active);
        if (_active) this.setActiveTab(_active.uri);
      }
    );
  }

  private _handleErrorDetected(info: any) {
    this._addError(info);
  }

  private _handleWarningDetected(info: any) {
    this._addWarning(info);
  }

  private _handleErrorRemoved(info: any) {
    this._removeError(info);
  }

  private _handleWarningRemoved(info: any) {
    this._removeWarning(info);
  }

  private _createProblemId(info: any): string {
    return `${info.filePath}:${info.line}:${info.column}:${info.message}:${info.severity}`;
  }

  private _addError(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.set(problemId, { ...info, type: "error" });
    this._updateTabs();
  }

  private _addWarning(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.set(problemId, { ...info, type: "warning" });
    this._updateTabs();
  }

  private _removeError(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.delete(problemId);
    this._updateTabs();
  }

  private _removeWarning(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.delete(problemId);
    this._updateTabs();
  }

  private _updateTabs() {
    const problems = Array.from(this._problems.values());
    const problemsByFile = this._groupByFile(problems);

    const currentActiveUri = this._tabs.find((t) => t.active)?.uri;

    this._tabs = [];

    for (const [filePath, items] of problemsByFile) {
      const fileProblems = items.filter((p) => p.type === "error");
      const fileWarnings = items.filter((p) => p.type === "warning");

      const tab: IProblemTab = {
        id: this._generateTabId(filePath),
        name: path.basename(filePath),
        active: false,
        uri: filePath,
        error: fileProblems.map((p) => ({
          details: p.message,
          line: p.line,
          column: p.column,
        })) as any,
        warnings: fileWarnings.map((w) => ({
          details: w.message,
          line: w.line,
          column: w.column,
        })) as any,
      };

      this._tabs.push(tab);
    }

    if (this._tabs.length > 0) {
      const tabToActivate = this._tabs.find((t) => t.uri === currentActiveUri);
      if (tabToActivate) {
        tabToActivate.active = true;
      } else {
        this._tabs[0]!.active = true;
      }
    }

    this._render();
  }

  private _groupByFile(problems: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const problem of problems) {
      const filePath = problem.filePath;
      if (!grouped.has(filePath)) {
        grouped.set(filePath, []);
      }
      grouped.get(filePath)!.push(problem);
    }

    for (const [, fileProblems] of grouped) {
      fileProblems.sort((a, b) => {
        if (a.line !== b.line) return a.line - b.line;
        return a.column - b.column;
      });
    }

    return grouped;
  }

  private _generateTabId(filePath: string): string {
    return `file-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`;
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
        this._switchTab(tab.id);
      };

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = getFileIcon(tab.name);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = tab.name;

      const errorCount = Array.isArray(tab.error) ? tab.error.length : 0;
      const warningCount = Array.isArray(tab.warnings)
        ? tab.warnings.length
        : 0;
      const totalCount = errorCount + warningCount;

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `${totalCount}`;

      const closeButton = document.createElement("span");
      closeButton.className = "close-icon";
      closeButton.innerHTML = getThemeIcon("close");
      closeButton.onclick = (e) => {
        e.stopPropagation();
        this._closeTab(tab.id);
      };

      tabEl.appendChild(icon);
      tabEl.appendChild(name);
      tabEl.appendChild(badge);
      tabEl.appendChild(closeButton);

      tabsContainer.appendChild(tabEl);
    });

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

    this._renderContent();
  }

  private _renderContent() {
    const activeTab = this._tabs.find((t) => t.active);

    if (!activeTab) {
      this._listEl.innerHTML = "";
      const emptyEl = document.createElement("div");
      emptyEl.className = "problems-empty";
      emptyEl.textContent = "No problems detected";
      this._listEl.appendChild(emptyEl);
      return;
    }

    this._listEl.innerHTML = "";

    const fileProblems = Array.from(this._problems.values()).filter(
      (p) => p.filePath === activeTab.uri
    );

    if (fileProblems.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "problems-empty";
      emptyEl.textContent = "No problems in this file";
      this._listEl.appendChild(emptyEl);
      return;
    }

    fileProblems.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });

    fileProblems.forEach((problem) => {
      const problemEl = this._createElement(problem);
      this._listEl.appendChild(problemEl);
    });
  }

  private _createElement(problem: any): HTMLElement {
    const problemEl = document.createElement("div");
    problemEl.className = `problem-item problem-${problem.type}`;

    const mainEl = document.createElement("div");
    mainEl.className = "problem-main";

    const iconEl = document.createElement("span");
    iconEl.className = "problem-icon";
    iconEl.innerHTML =
      problem.type === "error"
        ? getThemeIcon("error")
        : getThemeIcon("warning");

    const messageEl = document.createElement("span");
    messageEl.className = "problem-message";
    messageEl.textContent = problem.message;

    const messageContainerEl = document.createElement("div");
    messageContainerEl.className = "problem-message-container";
    messageContainerEl.appendChild(iconEl);
    messageContainerEl.appendChild(messageEl);

    mainEl.appendChild(messageContainerEl);

    const locationEl = document.createElement("div");
    locationEl.className = "problem-location";
    locationEl.textContent = `Line ${problem.line}, Column ${problem.column}`;
    mainEl.appendChild(locationEl);

    problemEl.appendChild(mainEl);

    problemEl.style.cursor = "pointer";
    problemEl.addEventListener("click", () => {
      this._navigate(problem);
    });

    return problemEl;
  }

  private _navigate(problem: any) {
    const _editor = getStandalone("editor") as Editor;
    if (_editor) {
      const editor = _editor._editor;
      if (editor) {
        const position = {
          lineNumber: problem.line,
          column: problem.column,
        };

        editor.setPosition(position);
        editor.revealPositionInCenter(position);
        editor.focus();
      }
    }
  }

  private _switchTab(tabId: string) {
    this._tabs = this._tabs.map((t) => ({
      ...t,
      active: t.id === tabId,
    }));
    this._render();
  }

  private _closeTab(tabId: string) {
    const tabIndex = this._tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const closingTab = this._tabs[tabIndex]!;
    const isClosingActive = closingTab.active;

    const filePath = closingTab.uri;
    const keysToDelete: string[] = [];

    for (const [key, value] of this._problems.entries()) {
      if (value.filePath === filePath) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this._problems.delete(key));

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

  public setActiveTab(filePath: string) {
    const tab = this._tabs.find((t) => t.uri === filePath);
    if (tab) {
      this._switchTab(tab.id);
    }
  }
}

export const _problem = new Problem();
registerStandalone("problem", _problem);
