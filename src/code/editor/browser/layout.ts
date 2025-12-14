import { Editor as _editor } from "../editors/editor.js";
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
import {
  getStandaloneForExtension,
  standalones,
} from "../common/standalones.js";

export class Editor extends CoreEl {
  private _splitter!: Splitter;
  private _editorTabs!: HTMLDivElement;
  private _previewTabs!: HTMLDivElement;
  private _editorArea!: HTMLDivElement;
  private _codeEditor!: HTMLDivElement;
  private _previewArea!: HTMLDivElement;
  private _emptyState!: HTMLDivElement;
  private _contentArea!: HTMLDivElement;

  constructor() {
    super();
    this._createEl();
  }

  private _closeEditorTab(tabUri: string, event?: Event) {
    if (event) event.stopPropagation();

    const currentTabs = select((s) => s.main.editor_tabs);
    const tabIndex = currentTabs.findIndex((t) => t.uri === tabUri);
    if (tabIndex === -1) return;

    const closingTab = currentTabs[tabIndex]!;
    const isClosingActiveTab = closingTab.active;
    let updatedTabs = currentTabs.filter((t) => t.uri !== tabUri);

    if (isClosingActiveTab && updatedTabs.length > 0) {
      const newActiveIndex =
        tabIndex < updatedTabs.length ? tabIndex : updatedTabs.length - 1;
      const tabToActivate = updatedTabs[newActiveIndex]!;
      updatedTabs[newActiveIndex] = {
        ...tabToActivate,
        active: true,
      } as IEditorTab;
    }

    dispatch(update_editor_tabs(updatedTabs));

    const closingExtensionEditor = getStandaloneForExtension(
      window.path.extname(tabUri)
    );
    if (closingExtensionEditor) {
      closingExtensionEditor._close();
    } else {
      const editor = getStandalone("editor") as _editor;
      if (editor) editor._close(tabUri);
    }

    const newActiveTab = updatedTabs.find((t) => t.active);
    if (newActiveTab) {
      const newActiveExtensionEditor = getStandaloneForExtension(
        window.path.extname(newActiveTab.uri)
      );

      if (newActiveExtensionEditor) {
        const editor = getStandalone("editor") as _editor;
        if (editor) editor._visibility(false);
        standalones.forEach((v) => v._setVisiblity(false));
        newActiveExtensionEditor._setVisiblity(true);
        newActiveExtensionEditor._open(newActiveTab.uri);

        const details = this._editorArea.querySelector(
          ".details"
        ) as HTMLDivElement;
        const preview = this._editorArea.querySelector(
          ".preview"
        ) as HTMLDivElement;
        if (details) details.style.display = "none";
        if (preview) preview.style.display = "none";

        this._contentArea.style.display = "none";
      }
    }
  }

  private _closePreviewTab(tabUri: string, event?: Event) {
    if (event) event.stopPropagation();

    const currentTabs = select((s) => s.main.preview_tabs);
    const tabIndex = currentTabs.findIndex((t) => t.uri === tabUri);
    if (tabIndex === -1) return;

    const closingTab = currentTabs[tabIndex]!;
    const isClosingActiveTab = closingTab.active;
    let updatedTabs = currentTabs.filter((t) => t.uri !== tabUri);

    if (isClosingActiveTab && updatedTabs.length > 0) {
      const newActiveIndex =
        tabIndex < updatedTabs.length ? tabIndex : updatedTabs.length - 1;
      const tabToActivate = updatedTabs[newActiveIndex]!;
      updatedTabs[newActiveIndex] = {
        ...tabToActivate,
        active: true,
      } as IPreviewTab;
    }

    dispatch(update_preview_tabs(updatedTabs));
  }

  private _renderEditorTabs(tabs: IEditorTab[]) {
    const editor = getStandalone("editor") as _editor;

    if (!Array.isArray(tabs) || tabs.length === 0) {
      this._showEmptyEditor();
      if (editor) editor._visibility(false);
      console.log("hiding", tabs);
      return;
    }

    this._showEditorUI();
    const activeTab = tabs.find((t) => t.active);

    if (activeTab) {
      this._displayActiveEditorTab(activeTab, editor);
    }

    this._renderTabs(
      tabs,
      this._editorTabs,
      (tab) => this._setActiveEditorTab(tab.uri),
      (tabUri, event) => this._closeEditorTab(tabUri, event)
    );
  }

  private _renderPreviewTabs(tabs: IPreviewTab[]) {
    if (!Array.isArray(tabs) || tabs.length === 0) {
      if (this._splitter) this._splitter._collapsePanel(1);
      this._previewTabs.style.display = "none";
      this._previewArea.style.display = "none";
      return;
    }

    const activeTab = tabs.find((t) => t.active);

    this._splitter._expandPanel(1);
    this._previewTabs.style.display = "flex";
    this._previewArea.style.display = "flex";

    if (activeTab) {
      const editor = getStandalone("editor") as _editor;
      if (editor && editor._editor) editor._previewMarkdown(activeTab);
    }

    this._renderTabs(
      tabs,
      this._previewTabs,
      (tab) => this._setActivePreviewTab(tab.uri),
      (tabUri, event) => this._closePreviewTab(tabUri, event)
    );
  }

  private _showEmptyEditor() {
    this._editorTabs.style.display = "none";
    this._editorArea.style.display = "none";
    this._emptyState.style.display = "flex";
  }

  private _showEditorUI() {
    this._editorTabs.style.display = "flex";
    this._editorArea.style.display = "flex";
    this._emptyState.style.display = "none";
  }

  private _displayActiveEditorTab(
    activeTab: IEditorTab,
    editor: _editor | null
  ) {
    if (activeTab.uri.startsWith("tab://")) {
      this._showContentTab(activeTab, editor);
    } else {
      this._showFileTab(activeTab, editor);
    }
  }

  private _showContentTab(activeTab: IEditorTab, editor: _editor | null) {
    if (editor) editor._visibility(false);
    this._contentArea.style.display = "flex";

    const details = this._editorArea.querySelector(
      ".details"
    ) as HTMLDivElement;
    const preview = this._editorArea.querySelector(
      ".preview"
    ) as HTMLDivElement;
    if (details) details.style.display = "none";
    if (preview) preview.style.display = "none";

    this._contentArea.innerHTML = "";
    const content = _getContent(activeTab.uri);
    if (content) this._contentArea.appendChild(content);
  }

  private _showFileTab(activeTab: IEditorTab, editor: _editor | null) {
    this._contentArea.style.display = "none";

    const extEditor = getStandaloneForExtension(
      window.path.extname(activeTab.uri)
    );

    standalones.forEach((v) => {
      v._setVisiblity(false);
    });

    console.log(extEditor, standalones);

    if (extEditor) {
      if (editor) editor._visibility(false);
      extEditor._setVisiblity(true);
      extEditor._open(activeTab.uri);

      const details = this._editorArea.querySelector(
        ".details"
      ) as HTMLDivElement;
      const preview = this._editorArea.querySelector(
        ".preview"
      ) as HTMLDivElement;
      if (details) details.style.display = "none";
      if (preview) preview.style.display = "none";
    } else {
      if (editor) {
        const details = this._editorArea.querySelector(
          ".details"
        ) as HTMLDivElement;
        const preview = this._editorArea.querySelector(
          ".preview"
        ) as HTMLDivElement;
        if (details) details.style.display = "flex";
        if (preview) preview.style.display = "none";

        if (editor._editor) {
          editor._open(activeTab);
        } else {
          editor._mount();
        }
      }
    }
  }

  private _renderTabs(
    tabs: (IEditorTab | IPreviewTab)[],
    container: HTMLDivElement,
    onClickTab: (tab: IEditorTab | IPreviewTab) => void,
    onCloseTab: (tabUri: string, event?: Event) => void
  ) {
    container.innerHTML = "";
    tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `tab ${tab.active ? "active" : ""}`;

      tabEl.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".close-icon")) return;
        onClickTab(tab);
      };

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = tab.icon || getFileIcon(tab.name);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = (tab as IPreviewTab).name.startsWith("Preview ")
        ? (tab as IPreviewTab).name
        : tab.name;

      const iconWrapper = document.createElement("div");
      iconWrapper.className = "icon-wrapper";
      if ("is_touched" in tab && tab.is_touched)
        iconWrapper.classList.add("is_touched");

      const closeIcon = document.createElement("span");
      closeIcon.className = "close-icon";
      closeIcon.innerHTML = getThemeIcon("close");
      closeIcon.onclick = (e) => {
        e.stopPropagation();
        onCloseTab(tab.uri, e);
      };

      const dotIcon = document.createElement("span");
      dotIcon.className = "dot-icon";

      iconWrapper.appendChild(closeIcon);
      iconWrapper.appendChild(dotIcon);

      tabEl.appendChild(icon);
      tabEl.appendChild(name);
      tabEl.appendChild(iconWrapper);

      container.appendChild(tabEl);

      if (tab.active) {
        this._scrollTabIntoView(tabEl, container);
      }
    });
  }

  private _scrollTabIntoView(tabEl: HTMLElement, container: HTMLElement) {
    const offsetLeft = tabEl.offsetLeft;
    const tabWidth = tabEl.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    if (offsetLeft < scrollLeft) {
      container.scrollLeft = offsetLeft;
    } else if (offsetLeft + tabWidth > scrollLeft + containerWidth) {
      container.scrollLeft = offsetLeft + tabWidth - containerWidth;
    }
  }

  private _setActiveEditorTab(uri: string) {
    const tabs = select((s) => s.main.editor_tabs);
    const newTabs = tabs.map((t) => ({ ...t, active: t.uri === uri }));
    dispatch(update_editor_tabs(newTabs));
  }

  private _setActivePreviewTab(uri: string) {
    const tabs = select((s) => s.main.preview_tabs);
    const newTabs = tabs.map((t) => ({ ...t, active: t.uri === uri }));
    dispatch(update_preview_tabs(newTabs));
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

    this._codeEditor = document.createElement("div");
    this._codeEditor.className = "code-editor";

    this._previewArea = document.createElement("div");
    this._previewArea.className = "preview-area";

    this._emptyState = document.createElement("div");
    this._emptyState.className = "empty-state";

    this._contentArea = document.createElement("div");
    this._contentArea.className = "content-area";

    this._editorArea.appendChild(this._contentArea);
    this._editorArea.appendChild(this._codeEditor);

    const _editorTabsState = select((s) => s.main.editor_tabs);

    this._renderEditorTabs(_editorTabsState);

    const _previewTabsState = select((s) => s.main.preview_tabs);

    this._renderPreviewTabs(_previewTabsState);

    watch(
      (s) => s.main.editor_tabs,
      (next) => this._renderEditorTabs(next)
    );
    watch(
      (s) => s.main.preview_tabs,
      (next) => this._renderPreviewTabs(next)
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
