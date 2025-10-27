import { CoreEl } from "../el.js";
import {
  getStandalone,
  registerStandalone,
} from "../../../common/standalone.js";
import { getThemeIcon } from "../../media/icons.js";
import { Editor } from "../../../../editor/standalone/standalone.js";

export class Problmen extends CoreEl {
  private _problems = new Map<string, any>();
  private _headerEl!: HTMLElement;
  private _listEl!: HTMLElement;
  private _collapsedFiles = new Set<string>();

  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "error-container";

    this._headerEl = document.createElement("div");
    this._headerEl.className = "problems-header";
    this._headerEl.textContent = "Problems: 0 errors, 0 warnings";
    this._el.appendChild(this._headerEl);

    this._listEl = document.createElement("div");
    this._listEl.className = "problems-list scrollbar-container";
    this._el.appendChild(this._listEl);

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
    this._update();
  }

  private _addWarning(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.set(problemId, { ...info, type: "warning" });
    this._update();
  }

  private _removeError(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.delete(problemId);
    this._update();
  }

  private _removeWarning(info: any) {
    const problemId = this._createProblemId(info);
    this._problems.delete(problemId);
    this._update();
  }

  private _update() {
    const problems = Array.from(this._problems.values());
    const errors = problems.filter((p) => p.type === "error");
    const warnings = problems.filter((p) => p.type === "warning");

    this._headerEl.textContent = `Problems: ${errors.length} errors, ${warnings.length} warnings`;

    this._listEl.innerHTML = "";

    if (problems.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "problems-empty";
      emptyEl.textContent = "No problems detected";
      this._listEl.appendChild(emptyEl);
      return;
    }

    const problemsByFile = this._groupProblems(problems);

    for (const [filePath, fileProblems] of problemsByFile) {
      const fileGroupEl = this._createGroup(filePath, fileProblems);
      this._listEl.appendChild(fileGroupEl);
    }
  }

  private _groupProblems(problems: any[]): Map<string, any[]> {
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

  private _createGroup(filePath: string, problems: any[]): HTMLElement {
    const fileGroupEl = document.createElement("div");
    fileGroupEl.className = "problem-file-group";

    const fileHeaderEl = this._createHeader(filePath, problems);
    fileGroupEl.appendChild(fileHeaderEl);

    const problemsContainerEl = document.createElement("div");
    problemsContainerEl.className = "problem-file-problems";

    const isCollapsed = this._collapsedFiles.has(filePath);

    if (isCollapsed) {
      problemsContainerEl.style.maxHeight = "0";
      problemsContainerEl.style.overflow = "hidden";
    } else {
      problemsContainerEl.style.maxHeight = "none";
      problemsContainerEl.style.overflow = "visible";
    }

    problems.forEach((problem) => {
      const problemEl = this._createElement(problem);
      problemsContainerEl.appendChild(problemEl);
    });

    fileGroupEl.appendChild(problemsContainerEl);
    return fileGroupEl;
  }

  private _createHeader(filePath: string, problems: any[]): HTMLElement {
    const headerEl = document.createElement("div");
    headerEl.className = "problem-file-header";

    const isCollapsed = this._collapsedFiles.has(filePath);

    const toggleIconEl = document.createElement("span");
    toggleIconEl.className = "problem-file-toggle";
    toggleIconEl.innerHTML = isCollapsed
      ? getThemeIcon("chevronRight")
      : getThemeIcon("chevronDown");

    const fileNameEl = document.createElement("span");
    fileNameEl.className = "problem-file-name";
    fileNameEl.textContent = this._getRelativePath(filePath);

    const errors = problems.filter((p) => p.type === "error").length;
    const warnings = problems.filter((p) => p.type === "warning").length;

    const countEl = document.createElement("span");
    countEl.className = "problem-file-count";
    countEl.textContent = `${errors} errors, ${warnings} warnings`;

    headerEl.appendChild(toggleIconEl);
    headerEl.appendChild(fileNameEl);
    headerEl.appendChild(countEl);

    headerEl.addEventListener("click", () => {
      this._toggle(filePath, headerEl);
    });

    return headerEl;
  }

  private _toggle(filePath: string, headerEl: HTMLElement) {
    const fileGroupEl = headerEl.parentElement!;
    const problemsContainerEl = fileGroupEl.querySelector(
      ".problem-file-problems"
    ) as HTMLElement;
    const toggleIconEl = headerEl.querySelector(
      ".problem-file-toggle"
    ) as HTMLElement;

    const isCollapsed = this._collapsedFiles.has(filePath);

    if (isCollapsed) {
      this._collapsedFiles.delete(filePath);

      problemsContainerEl.style.maxHeight = "none";
      problemsContainerEl.style.overflow = "visible";
      const naturalHeight = problemsContainerEl.scrollHeight;

      problemsContainerEl.style.maxHeight = "0";
      problemsContainerEl.style.overflow = "hidden";

      problemsContainerEl.offsetHeight;

      problemsContainerEl.style.maxHeight = `${naturalHeight}px`;
      toggleIconEl.innerHTML = getThemeIcon("chevronDown");

      const handleTransitionEnd = () => {
        problemsContainerEl.style.maxHeight = "none";
        problemsContainerEl.style.overflow = "visible";
        problemsContainerEl.removeEventListener(
          "transitionend",
          handleTransitionEnd
        );
      };
      problemsContainerEl.addEventListener(
        "transitionend",
        handleTransitionEnd
      );
    } else {
      this._collapsedFiles.add(filePath);

      const currentHeight = problemsContainerEl.scrollHeight;
      problemsContainerEl.style.maxHeight = `${currentHeight}px`;
      problemsContainerEl.style.overflow = "hidden";

      problemsContainerEl.offsetHeight;

      problemsContainerEl.style.maxHeight = "0";
      toggleIconEl.innerHTML = getThemeIcon("chevronRight");
    }
  }

  private _getRelativePath(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1]!;
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
}

export const _problem = new Problmen();
registerStandalone("problem", _problem);
