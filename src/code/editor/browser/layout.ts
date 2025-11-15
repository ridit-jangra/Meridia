import { Editor as _editor } from "../standalone/standalone.js";
import {
  getStandalone,
  registerStandalone,
} from "../../workbench/common/class.js";
import { dispatch } from "../../workbench/common/store/store.js";
import { select, watch } from "../../workbench/common/store/selector.js";
import {
  update_editor_tabs,
  update_preview_tabs,
} from "../../workbench/common/store/slice.js";
import { getFileIcon } from "../../workbench/common/utils.js";
import { IEditorTab, IPreviewTab } from "../../workbench/workbench.types.js";
import { getThemeIcon } from "../../workbench/browser/media/icons.js";
import { CoreEl } from "../../workbench/browser/parts/core.js";
import { _getContent } from "../../workbench/common/tabs.js";
import { Splitter } from "../../workbench/browser/parts/splitter/splitter.js";
import { _preview } from "../common/preview.js";

export class Editor extends CoreEl {
  private _splitter!: Splitter;
  private _editorTabs!: HTMLDivElement;
  private _previewTabs!: HTMLDivElement;
  private _editorArea!: HTMLDivElement;
  private _previewArea!: HTMLDivElement;
  private _emptyState!: HTMLDivElement;
  private _contentArea!: HTMLDivElement;

  constructor() {
    super();
    this._createEl();
  }

  private _closeEditorTab(tabUri: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const currentTabs = select((s) => s.main.editor_tabs);
    const tabIndex = currentTabs.findIndex((t) => t.uri === tabUri);

    if (tabIndex === -1) return;

    const closingTab = currentTabs[tabIndex]!;
    const isClosingActiveTab = closingTab.active;

    const updatedTabs = currentTabs.filter((t) => t.uri !== tabUri);

    if (isClosingActiveTab && updatedTabs.length > 0) {
      const newActiveIndex =
        tabIndex < updatedTabs.length ? tabIndex : updatedTabs.length - 1;

      const tabToActivate = updatedTabs[newActiveIndex]!;
      updatedTabs[newActiveIndex] = {
        name: tabToActivate.name,
        uri: tabToActivate.uri,
        active: true,
        is_touched: tabToActivate.is_touched,
        ...(tabToActivate.icon && { icon: tabToActivate.icon }),
      } as IEditorTab;
    }

    dispatch(update_editor_tabs(updatedTabs));

    const editor = getStandalone("editor") as _editor;
    if (editor) editor._close(tabUri);
  }

  private _closePreviewTab(tabUri: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const currentTabs = select((s) => s.main.preview_tabs);
    const tabIndex = currentTabs.findIndex((t) => t.uri === tabUri);

    if (tabIndex === -1) return;

    const closingTab = currentTabs[tabIndex]!;
    const isClosingActiveTab = closingTab.active;

    const updatedTabs = currentTabs.filter((t) => t.uri !== tabUri);

    if (isClosingActiveTab && updatedTabs.length > 0) {
      const newActiveIndex =
        tabIndex < updatedTabs.length ? tabIndex : updatedTabs.length - 1;

      const tabToActivate = updatedTabs[newActiveIndex]!;
      updatedTabs[newActiveIndex] = {
        name: tabToActivate.name,
        uri: tabToActivate.uri,
        active: true,
        ...(tabToActivate.icon && { icon: tabToActivate.icon }),
      } as IPreviewTab;
    }

    dispatch(update_preview_tabs(updatedTabs));
  }

  private _renderEditorTabs(_tabs: IEditorTab[]) {
    const editor = getStandalone("editor") as _editor;
    const activeTab = _tabs.find((t) => t.active);

    if (_tabs.length === 0) {
      this._editorTabs.style.display = "none";
      this._editorArea.style.display = "none";
      this._emptyState.style.display = "flex";
      if (editor) editor._visiblity(false);
      return;
    } else {
      this._editorTabs.style.display = "flex";
      this._editorArea.style.display = "flex";
      this._emptyState.style.display = "none";
      if (editor) editor._visiblity(true);
    }

    if (activeTab) {
      if (activeTab.uri.startsWith("tab://")) {
        if (editor) editor._visiblity(false);
        this._contentArea.style.display = "flex";
        const _details = this._editorArea.querySelector(
          ".details"
        ) as HTMLDivElement;
        if (_details) _details.style.display = "none";
        const _preview = this._editorArea.querySelector(
          ".preview"
        ) as HTMLDivElement;
        if (_preview) _preview.style.display = "none";
        this._contentArea.innerHTML = "";
        const _content = _getContent(activeTab.uri);
        if (_content) {
          this._contentArea.appendChild(_content);
        }
      } else {
        this._contentArea.style.display = "none";
        if (editor) {
          const _details = this._editorArea.querySelector(
            ".details"
          ) as HTMLDivElement;
          if (_details) _details.style.display = "flex";
          const _preview = this._editorArea.querySelector(
            ".preview"
          ) as HTMLDivElement;
          if (_preview) _preview.style.display = "none";
          if (editor._editor) {
            editor._open(activeTab);
          } else {
            editor._mount();
          }
        }
      }
    }

    this._editorTabs.innerHTML = "";
    _tabs.forEach((_tab) => {
      const _tabEl = document.createElement("div");
      _tabEl.className = `tab ${_tab.active ? "active" : ""}`;

      _tabEl.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".close-icon")) {
          return;
        }

        const _tabs = select((s) => s.main.editor_tabs);
        const newTabs = _tabs.map((t) => ({
          ...t,
          active: t.uri === _tab.uri,
        }));

        dispatch(update_editor_tabs(newTabs));
      };

      const icon = document.createElement("span");
      icon.className = "icon";

      if (_tab.icon) icon.innerHTML = _tab.icon;
      else icon.innerHTML = getFileIcon(_tab.name);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = _tab.name;

      const iconWrapper = document.createElement("div");
      iconWrapper.className = `icon-wrapper ${
        _tab.is_touched ? "is_touched" : ""
      }`;

      const _closeIcon = document.createElement("span");
      _closeIcon.className = "close-icon";
      _closeIcon.innerHTML = getThemeIcon("close");

      _closeIcon.onclick = (e) => {
        e.stopPropagation();
        this._closeEditorTab(_tab.uri, e);
      };

      const dotIcon = document.createElement("span");
      dotIcon.className = "dot-icon";

      iconWrapper.appendChild(_closeIcon);
      iconWrapper.appendChild(dotIcon);

      _tabEl.appendChild(icon);
      _tabEl.appendChild(name);
      _tabEl.appendChild(iconWrapper);

      this._editorTabs.appendChild(_tabEl);

      if (_tab.active) {
        const container = this._editorTabs;
        const offsetLeft = _tabEl.offsetLeft;
        const tabWidth = _tabEl.offsetWidth;
        const containerScrollLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;

        if (offsetLeft < containerScrollLeft) {
          container.scrollLeft = offsetLeft;
        } else if (
          offsetLeft + tabWidth >
          containerScrollLeft + containerWidth
        ) {
          container.scrollLeft = offsetLeft + tabWidth - containerWidth;
        }
      }
    });
  }

  private _renderPreviewTabs(_tabs: IPreviewTab[]) {
    const activeTab = _tabs.find((t) => t.active);

    if (_tabs.length === 0 || !_tabs.find((t) => t.active)) {
      this._splitter._collapsePanel(1);
      return;
    } else {
      this._splitter._expandPanel(1);
      this._previewTabs.style.display = "flex";
      this._previewArea.style.display = "flex";
    }

    if (activeTab) {
      _preview._open(activeTab);
    }

    this._previewTabs.innerHTML = "";
    _tabs.forEach((_tab) => {
      const _tabEl = document.createElement("div");
      _tabEl.className = `tab ${_tab.active ? "active" : ""}`;

      _tabEl.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".close-icon")) {
          return;
        }

        const _tabs = select((s) => s.main.preview_tabs);
        const newTabs = _tabs.map((t) => ({
          ...t,
          active: t.uri === _tab.uri,
        }));

        dispatch(update_preview_tabs(newTabs));
      };

      const icon = document.createElement("span");
      icon.className = "icon";

      if (_tab.icon) icon.innerHTML = _tab.icon;
      else icon.innerHTML = getFileIcon(_tab.name);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = `Preview ${_tab.name}`;

      const iconWrapper = document.createElement("div");
      iconWrapper.className = `icon-wrapper`;

      const _closeIcon = document.createElement("span");
      _closeIcon.className = "close-icon";
      _closeIcon.innerHTML = getThemeIcon("close");

      _closeIcon.onclick = (e) => {
        e.stopPropagation();
        this._closePreviewTab(_tab.uri, e);
      };

      const dotIcon = document.createElement("span");
      dotIcon.className = "dot-icon";

      iconWrapper.appendChild(_closeIcon);
      iconWrapper.appendChild(dotIcon);

      _tabEl.appendChild(icon);
      _tabEl.appendChild(name);
      _tabEl.appendChild(iconWrapper);

      this._previewTabs.appendChild(_tabEl);

      if (_tab.active) {
        const container = this._previewTabs;
        const offsetLeft = _tabEl.offsetLeft;
        const tabWidth = _tabEl.offsetWidth;
        const containerScrollLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;

        if (offsetLeft < containerScrollLeft) {
          container.scrollLeft = offsetLeft;
        } else if (
          offsetLeft + tabWidth >
          containerScrollLeft + containerWidth
        ) {
          container.scrollLeft = offsetLeft + tabWidth - containerWidth;
        }
      }
    });
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "editor";

    this._editorTabs = document.createElement("div");
    this._editorTabs.className = "tabs scrollbar-container y-disable";

    this._previewTabs = document.createElement("div");
    this._previewTabs.className = "tabs scrollbar-container y-disable";

    this._editorArea = document.createElement("div");
    this._editorArea.className = "editor-area";

    this._previewArea = document.createElement("div");
    this._previewArea.className = "preview-area";

    this._emptyState = document.createElement("div");
    this._emptyState.className = "empty-state";

    this._contentArea = document.createElement("div");
    this._contentArea.className = "content-area";

    this._editorArea.appendChild(this._contentArea);

    // Initial render
    const _editorTabsState = select((s) => s.main.editor_tabs);
    if (_editorTabsState.length > 0) {
      this._renderEditorTabs(_editorTabsState);
    } else {
      this._editorTabs.style.display = "none";
      this._editorArea.style.display = "none";
      this._emptyState.style.display = "flex";
    }

    const _previewTabsState = select((s) => s.main.preview_tabs);
    if (_previewTabsState.length > 0) {
      this._renderPreviewTabs(_previewTabsState);
    } else {
      this._previewTabs.style.display = "none";
      this._previewArea.style.display = "none";
    }

    // Watch for state changes
    watch(
      (s) => s.main.editor_tabs,
      (next) => {
        this._renderEditorTabs(next);
      }
    );

    watch(
      (s) => s.main.preview_tabs,
      (next) => {
        this._renderPreviewTabs(next);
      }
    );

    const _editorPane = document.createElement("div");
    _editorPane.className = "editor-panel";

    const _previewPane = document.createElement("div");
    _previewPane.className = "preview-panel";

    this._splitter = new Splitter(
      [_editorPane, _previewPane],
      "horizontal",
      [60, 40],
      () => {},
      "workbench.workspace.editor.splitter"
    );

    registerStandalone("workbench.workspace.editor.splitter", this._splitter);

    _previewPane.appendChild(this._previewTabs);
    _previewPane.appendChild(this._previewArea);

    _editorPane.appendChild(this._editorTabs);
    _editorPane.appendChild(this._editorArea);
    _editorPane.appendChild(this._emptyState);

    this._el.appendChild(this._splitter.getDomElement()!);
  }

  rerender() {
    const _editorTabs = select((s) => s.main.editor_tabs);
    const _previewTabs = select((s) => s.main.preview_tabs);

    this._renderEditorTabs(_editorTabs);
    this._renderPreviewTabs(_previewTabs);
  }
}
