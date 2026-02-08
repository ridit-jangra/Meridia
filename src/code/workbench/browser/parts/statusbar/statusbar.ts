import { store } from "../../../common/store/store.js";
import { select, watch } from "../../../common/store/selector.js";
import {
  capitalize,
  getLanguage,
  getRelativePath,
} from "../../../common/utils.js";
import { CoreEl } from "../core.js";
import { Tooltip } from "../tooltip/tooltip.js";
import { _editor } from "../../../../editor/editors/editor.js";
import { getThemeIcon } from "../../media/icons.js";

interface SymbolInfo {
  name: string;
  kind: number;
  range: any;
  selectionRange: any;
  children: any[];
}

export class Statusbar extends CoreEl {
  private _currentSymbol: string | null = null;

  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "statusbar";

    const _breadcrumbContainer = document.createElement("div");
    _breadcrumbContainer.className = "breadcrumb-container";

    document.addEventListener("statusbar.update.referenace.path", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _symbols = _customEvent.detail.message as SymbolInfo | null;

      if (!_symbols === null) {
        if ((this._currentSymbol = _symbols?.name!)) return;
      }

      if (_symbols === null || !_symbols || !_symbols.name) {
        this._currentSymbol = null;
        this._updateBreadcrumbWithSymbol(_breadcrumbContainer);
      } else {
        this._currentSymbol = _symbols.name;
        this._updateBreadcrumbWithSymbol(_breadcrumbContainer);
      }
    });

    watch(
      (s) => s.main.editor_tabs,
      (next) => {
        let _root = select((s) => s.main.folder_structure);
        const _active = next.find((t) => t.active);

        const unsubscribe = store.subscribe(() => {
          _root = select((s) => s.main.folder_structure);
          unsubscribe();
        });

        if (!_root || !_root.name) {
          this._renderBreadcrumb(_breadcrumbContainer, ["Root"]);
          return;
        }

        if (!_active || !_active.uri) {
          this._renderBreadcrumb(_breadcrumbContainer, [_root.name]);
          return;
        }

        const relativePath = getRelativePath(_root.uri ?? "", _active.uri);
        const breadcrumbItems = this._createBreadcrumbItems(
          _root.name,
          relativePath,
        );
        this._renderBreadcrumb(_breadcrumbContainer, breadcrumbItems);
      },
    );

    const itemSection = document.createElement("div");
    itemSection.className = "item-section";

    const editorSection = document.createElement("div");
    editorSection.className = "sub-item-section";

    const lineSection = new Tooltip()._getEl(
      document.createElement("span"),
      "Go to Line/Column",
      "top",
    );
    const languageSection = new Tooltip()._getEl(
      document.createElement("span"),
      "Select Language Mode",
      "top",
    );
    const indentationSection = new Tooltip()._getEl(
      document.createElement("span"),
      "Select Indentation",
      "top",
    );
    const encodingSection = new Tooltip()._getEl(
      document.createElement("span"),
      "Select Encoding",
      "top",
    );

    const notificationSection = new Tooltip()._getEl(
      document.createElement("span"),
      "Notification",
      "top",
    );

    notificationSection.innerHTML = getThemeIcon("bell");

    encodingSection.textContent = "UTF-8"; // only for now, will be adding encoding tracking and changing in future.

    watch(
      (s) => s.main.editor_tabs,
      (v) => {
        const active = v.find((v) => v.active);
        if (!active) {
          editorSection.style.display = "none";
          return;
        } else editorSection.style.display = "flex";

        const language = getLanguage(active.uri);

        languageSection.textContent = capitalize(language);
      },
    );

    document.addEventListener(
      "workbench.workspace.editor.cursor.position.change",
      (_event) => {
        const _customEvent = _event as CustomEvent;
        const { line, column } = _customEvent.detail.action;

        lineSection.textContent = `Ln ${line}, Col ${column}`;
      },
    );

    document.addEventListener(
      "workbench.workspace.editor.indentation.change",
      (_event) => {
        const _customEvent = _event as CustomEvent;
        const { indentation } = _customEvent.detail.action;

        indentationSection.textContent = `Spaces: ${indentation}`;
      },
    );

    editorSection.appendChild(lineSection);
    editorSection.appendChild(indentationSection);
    editorSection.appendChild(encodingSection);
    editorSection.appendChild(languageSection);

    itemSection.appendChild(editorSection);
    itemSection.appendChild(notificationSection);

    this._el.appendChild(_breadcrumbContainer);
    this._el.appendChild(itemSection);
  }

  private _createBreadcrumbItems(
    rootName: string,
    relativePath: string,
  ): string[] {
    if (!relativePath || relativePath === "./") {
      return [rootName];
    }

    const pathSegments = relativePath
      .split(/[/\\]/)
      .filter((segment) => segment.length > 0);
    return pathSegments;
  }

  private _updateBreadcrumbWithSymbol(container: HTMLElement) {
    let _root = select((s) => s.main.folder_structure);
    const _activeTabs = select((s) => s.main.editor_tabs);
    const _active = _activeTabs.find((t) => t.active);

    let baseBreadcrumbItems: string[];

    if (!_root || !_root.name) {
      baseBreadcrumbItems = ["Root"];
    } else if (!_active || !_active.uri) {
      baseBreadcrumbItems = [_root.name];
    } else {
      const relativePath = getRelativePath(_root.uri ?? "", _active.uri);
      baseBreadcrumbItems = this._createBreadcrumbItems(
        _root.name,
        relativePath,
      );
    }

    const finalItems = this._currentSymbol
      ? [...baseBreadcrumbItems, this._currentSymbol]
      : baseBreadcrumbItems;

    this._renderBreadcrumb(container, finalItems);
  }

  private _renderBreadcrumb(container: HTMLElement, items: string[]) {
    container.innerHTML = "";

    items.forEach((item, index) => {
      const breadcrumbItem = document.createElement("span");
      breadcrumbItem.className = "breadcrumb-item";

      if (index === items.length - 1 && this._currentSymbol === item) {
        breadcrumbItem.classList.add("breadcrumb-symbol");
      }

      breadcrumbItem.textContent = item;

      breadcrumbItem.addEventListener("click", () => {
        this._handleBreadcrumbClick(index, items);
      });

      container.appendChild(breadcrumbItem);

      if (index < items.length - 1) {
        const separator = document.createElement("span");
        separator.className = "breadcrumb-separator";
        separator.textContent = " / ";
        container.appendChild(separator);
      }
    });
  }

  private _handleBreadcrumbClick(index: number, items: string[]) {}
}
