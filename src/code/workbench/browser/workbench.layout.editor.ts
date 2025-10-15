import { Editor as _editor } from "../common/workbench.editor/workbench.editor.js";
import { getStandalone } from "../common/workbench.standalone.js";
import { dispatch } from "../common/workbench.store/workbench.store.js";
import {
  select,
  watch,
} from "../common/workbench.store/workbench.store.selector.js";
import { update_editor_tabs } from "../common/workbench.store/workbench.store.slice.js";
import { getFileIcon, getIcon } from "../common/workbench.utils.js";
import { IEditorTab } from "../workbench.types.js";
import { closeIcon } from "./workbench.media/workbench.icons.js";
import { CoreEl } from "./workbench.parts/workbench.part.el.js";

export class Editor extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "editor";

    const _tabs = select((s) => s.main.editor_tabs);

    const IEditorTabs = document.createElement("div");
    IEditorTabs.className = "tabs scrollbar-container y-disable";

    const editorArea = document.createElement("div");
    editorArea.className = "editor-area";

    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const backgroundImage = document.createElement("span");
    backgroundImage.innerHTML = getIcon("../images/background.svg");

    emptyState.appendChild(backgroundImage);

    const _close = (tabUri: string, event?: Event) => {
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
    };

    function _render(_tabs: IEditorTab[]) {
      const editor = getStandalone("editor") as _editor;
      const activeTab = _tabs.find((t) => t.active);

      if (_tabs.length === 0) {
        IEditorTabs.style.display = "none";
        editorArea.style.display = "none";
        emptyState.style.display = "flex";
        if (editor) editor._visiblity(false);
        return;
      } else {
        IEditorTabs.style.display = "flex";
        editorArea.style.display = "block";
        emptyState.style.display = "none";
      }

      setTimeout(() => {
        if (activeTab) {
          if (activeTab.uri.startsWith("tab://")) {
            if (editor) editor._visiblity(false);
          } else {
            if (editor) {
              if (editor._editor) {
                editor._open(activeTab);
              } else {
                editor._mount();

                setTimeout(() => {
                  editor._open(activeTab);
                }, 0);
              }
            }
          }
        }
      }, 50);

      IEditorTabs.innerHTML = "";
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
        _closeIcon.innerHTML = closeIcon;

        _closeIcon.onclick = (e) => {
          _close(_tab.uri, e);
        };

        const dotIcon = document.createElement("span");
        dotIcon.className = "dot-icon";

        iconWrapper.appendChild(_closeIcon);
        iconWrapper.appendChild(dotIcon);

        _tabEl.appendChild(icon);
        _tabEl.appendChild(name);
        _tabEl.appendChild(iconWrapper);

        IEditorTabs.appendChild(_tabEl);
      });
    }

    if (_tabs.length > 0) {
      _render(_tabs);
    } else {
      IEditorTabs.style.display = "none";
      editorArea.style.display = "none";
      emptyState.style.display = "flex";
    }

    watch(
      (s) => s.main.editor_tabs,
      (next) => {
        _render(next);
      }
    );

    this._el.appendChild(IEditorTabs);
    this._el.appendChild(editorArea);
    this._el.appendChild(emptyState);
  }
}
