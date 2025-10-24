import { getStandalone } from "../../common/standalone.js";
import { store } from "../../common/store/store.js";
import { select, watch } from "../../common/store/selector.js";
import { getRelativePath } from "../../common/utils.js";
import { Editor } from "../../../editor/browser/layout.js";
import { CoreEl } from "./el.js";

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

    const _editor = getStandalone("editor") as Editor;

    document.addEventListener("statusbar.update.referenace.path", (_event) => {
      const _customEvent = _event as CustomEvent;
      const _symbols = _customEvent.detail.message as SymbolInfo | null;

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
          relativePath
        );
        this._renderBreadcrumb(_breadcrumbContainer, breadcrumbItems);
      }
    );

    const itemSection = document.createElement("div");
    itemSection.className = "item-section";

    this._el.appendChild(_breadcrumbContainer);
    this._el.appendChild(itemSection);
  }

  private _createBreadcrumbItems(
    rootName: string,
    relativePath: string
  ): string[] {
    if (!relativePath || relativePath === "./") {
      return [rootName];
    }

    const pathSegments = relativePath
      .split(/[/\\]/)
      .filter((segment) => segment.length > 0);
    return [rootName, ...pathSegments];
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
        relativePath
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
